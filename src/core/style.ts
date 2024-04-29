import type { SFCDescriptor, SFCBlock } from '@vue/compiler-sfc'
import type { Context } from '../types'
import { formatPostcssSourceMap } from 'vite'
import type { ExistingRawSourceMap } from 'rollup'
import type { UnpluginContext } from 'unplugin'
import type { RawSourceMap } from 'source-map-js'
import type { ResolvedOptions } from '../types'

export async function transformStyle(
  code: string,
  descriptor: SFCDescriptor,
  index: number,
  options: ResolvedOptions,
  context: UnpluginContext,
  filename: string,
) {
  const block = descriptor.styles[index]
  // vite already handles pre-processors and CSS module so this is only
  // applying SFC-specific transforms like scoped mode and CSS vars rewrite (v-bind(var))
  const result = await options.compiler.compileStyleAsync({
    filename: descriptor.filename,
    // Hard code 'data-v': https://github.com/vuejs/core/blob/main/packages/compiler-sfc/src/compileStyle.ts#L112
    id: `data-v-${descriptor.id}`,
    isProd: options.isProduction,
    source: code,
    scoped: block.scoped,
    ...(options.cssDevSourcemap
      ? {
          postcssOptions: {
            map: {
              from: filename,
              inline: false,
              annotation: false,
            },
          },
        }
      : {}),
  })

  if (result.errors.length > 0) {
    result.errors.forEach((error: any) => {
      if (error.line && error.column) {
        error.loc = {
          file: descriptor.filename,
          line: error.line + block.loc.start.line,
          column: error.column,
        }
      }
      context.error(error)
    })
    return null
  }

  const map = result.map
    ? await formatPostcssSourceMap(
        // version property of result.map is declared as string
        // but actually it is a number
        result.map as Omit<RawSourceMap, 'version'> as ExistingRawSourceMap,
        filename,
      )
    : (null as any)

  return {
    code: result.code,
    map,
  }
}


export async function genStyleCode(
  descriptor: SFCDescriptor,
  pluginContext: Context,
) {
  let stylesCode = ``
  let cssModulesMap: Record<string, string> | undefined

  if (descriptor.styles.length > 0) {
    for (let i = 0; i < descriptor.styles.length; i++) {
      const style = descriptor.styles[i]
      if (style.src) {
        // todo
      }
      const src = style.src || descriptor.filename
      // do not include module in default query, since we use it to indicate
      // that the module needs to export the modules json
      const attrsQuery = attrsToQuery(style.attrs, 'css')
      const srcQuery = style.src
        ? style.scoped
          ? `&src=${descriptor.id}`
          : '&src=true'
        : ''

      const scopedQuery = style.scoped ? `&scoped=${descriptor.id}` : ``
      const query = `?react&type=style&index=${i}${srcQuery}${scopedQuery}`
      const styleRequest = src + query + attrsQuery

      if (style.module) {
        const [importCode, nameMap] = genCSSModulesCode(
          i,
          styleRequest,
          style.module,
        )
        stylesCode += importCode
        Object.assign((cssModulesMap ||= {}), nameMap)
      } else {
        stylesCode += `\nimport ${JSON.stringify(styleRequest)}`
      }
    }
  }
  if (cssModulesMap) {
    const mappingCode = `${Object.entries(cssModulesMap).reduce(
      (code, [key, value]) => `${code}"${key}":${value},\n`,
      '{\n',
    )}}`
    stylesCode += `\nconst cssModules = ${mappingCode}`
  }
  return stylesCode
}


// these are built-in query parameters so should be ignored
// if the user happen to add them as attrs
const ignoreList = [
  'id',
  'index',
  'src',
  'type',
  'lang',
  'module',
  'scoped',
  'generic',
]

function attrsToQuery(
  attrs: SFCBlock['attrs'],
  langFallback?: string,
  forceLangFallback = false,
): string {
  let query = ``
  for (const name of Object.keys(attrs)) {
    const value = attrs[name]
    if (!ignoreList.includes(name)) {
      query += `&${encodeURIComponent(name)}${
        value ? `=${encodeURIComponent(value)}` : ``
      }`
    }
  }
  if (langFallback || attrs.lang) {
    query +=
      `lang` in attrs
        ? forceLangFallback
          ? `&lang.${langFallback}`
          : `&lang.${attrs.lang}`
        : `&lang.${langFallback}`
  }
  return query
}

function genCSSModulesCode(
  index: number,
  request: string,
  moduleName: string | boolean,
): [importCode: string, nameMap: Record<string, string>] {
  const styleVar = `style${index}`
  const exposedName = typeof moduleName === 'string' ? moduleName : '$style'
  // inject `.module` before extension so vite handles it as css module
  const moduleRequest = request.replace(/\.(\w+)$/, '.module.$1')
  return [
    `\nimport ${styleVar} from ${JSON.stringify(moduleRequest)}`,
    { [exposedName]: styleVar },
  ]
}