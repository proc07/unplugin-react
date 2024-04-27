import type { SFCDescriptor } from '@vue/compiler-sfc'
import type { RawSourceMap } from 'source-map-js'
import type { Context, ResolvedOptions } from '../types'
import { createDescriptor } from './utils/descriptorCache'
import { createError } from './utils/error'
import { resolveScript } from './script'

// version 类型与unplugin 不兼容
type TypeScriptMap = Omit<RawSourceMap, 'version'> & { version: number }

export async function transformMain(
  code: string,
  filename: string,
  options: ResolvedOptions,
  pluginContext: Context,
) {
  const { descriptor, errors } = createDescriptor(filename, code, options)

  if (errors.length > 0) {
    errors.forEach(error => pluginContext.error(createError(filename, error)))
    return null
  }

  // script
  const { code: scriptCode, map: scriptMap } = await genScriptCode(
    descriptor,
    options,
    pluginContext,
  )

  // console.log('scriptCode', scriptCode)

  return {
    code: scriptCode,
    map: scriptMap as any as TypeScriptMap || {
      mappings: '',
    },
    meta: {
      vite: {
        lang: descriptor.script?.lang || 'jsx',
      },
    },
  }
}

export const scriptIdentifier = `_sfc_main`

async function genScriptCode(
  descriptor: SFCDescriptor,
  options: ResolvedOptions,
  pluginContext: Context,
): Promise<{
  code: string
  map: RawSourceMap | undefined
}> {
  let scriptCode = `export default function ${scriptIdentifier}() {}`
  let map: RawSourceMap | undefined

  const script = await resolveScript(
    pluginContext,
    descriptor,
    options,
  )

  if (script) {
    scriptCode = script.content
    map = script.map
  }
  return {
    code: scriptCode,
    map,
  }
}
