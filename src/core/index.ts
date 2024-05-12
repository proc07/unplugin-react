import process from 'node:process'
import fs from 'node:fs'
import { createFilter } from 'vite'
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'
import { version } from '../../package.json'
import type { Options, ResolvedOptions } from '../types'
import { resolveCompiler } from './compiler'
import { parseReactRequest } from './utils/query'
import { transformMain } from './main'
import {getDescriptor} from './utils/descriptorCache'
import {SFCBlock} from '@vue/compiler-sfc'
import {transformStyle} from './style'

function resolveOptions(rawOptions: Options): ResolvedOptions {
  const root = rawOptions.root ?? process.cwd()
  const isProduction
    = rawOptions.isProduction ?? process.env.NODE_ENV === 'production'

  // const skipFastRefresh = false

  return {
    ...rawOptions,
    include: rawOptions.include ?? /\.react$/,
    isProduction,
    ssr: rawOptions.ssr ?? false,
    sourceMap: rawOptions.sourceMap ?? true,
    root,
    compiler: rawOptions.compiler as any, // to be set in buildStart
    devToolsEnabled: !isProduction,
    cssDevSourcemap: false,
  }
}

export const unpluginFactory: UnpluginFactory<Options | undefined, false> = (rawOptions = {}, meta) => {
  let options = resolveOptions(rawOptions)
  const filter = createFilter(options.include, options.exclude)

  const api = {
    get options() {
      return options
    },
    set options(value) {
      options = value
    },
    version,
  }

  return {
    name: 'unplugin-react',
    // enforce: 'pre',
    vite: {
      api,
      handleHotUpdate() {},
      config() {
        if (options.jsxRuntime === 'classic') {
          return {
            esbuild: {
              jsx: 'transform',
            },
          }
        }
        else {
          return {
            esbuild: {
              jsx: 'automatic',
              jsxImportSource: options.jsxImportSource,
            },
            optimizeDeps: { esbuildOptions: { jsx: 'automatic' } },
          }
        }
      },
      configResolved(config) {
        options = {
          ...options,
          root: config.root,
          sourceMap:
            config.command === 'build' ? !!config.build.sourcemap : true,
          cssDevSourcemap: config.css?.devSourcemap ?? false,
          isProduction: config.isProduction,
          compiler: options.compiler || resolveCompiler(config.root),
          devToolsEnabled: !config.isProduction,
        }
      },

      configureServer(server) {
        options.devServer = server
      },
    },

    rollup: {
      api,
    },

    buildStart() {
    },
    resolveId(id) {
      console.log('resolveId', id)
      return null
    },
    // loadInclude(id) {},
    load(id) {
      const { filename, query } = parseReactRequest(id)

      // select corresponding block for sub-part virtual modules
      if (query.react) {
        if (query.src) {
          return fs.readFileSync(filename, 'utf-8')
        }
        const descriptor = getDescriptor(filename, options)!
        let block: SFCBlock | null | undefined
        if (query.type === 'script') {

        } else if (query.type === 'style') {
          block = descriptor.styles[query.index!]
        }

        if (block) {
          return {
            code: block.content,
            map: block.map as any,
          }
        }
      }
    },
    // webpack's id filter is outside of loader logic,
    // an additional hook is needed for better perf on webpack
    transformInclude(id) {
      const { filename, query } = parseReactRequest(id)
      if (query.raw || query.url) return false
      if (!filter(filename) && !query.react) return false

      return true
    },
    transform(code, id) {
      const { filename, query } = parseReactRequest(id)
      const context = Object.assign({}, this, meta)

      if (!query.react) {
        return transformMain(code, filename, options, context)
      }
      else {
        // sub block request
        const descriptor = getDescriptor(filename, options)!

        if (query.type === 'style') {
          return transformStyle(
            code,
            descriptor,
            Number(query.index || 0),
            options,
            this,
            filename,
          )
        }
      }

      return {
        code,
        map: null,
      }
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
