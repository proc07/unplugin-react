import type { SFCDescriptor, SFCScriptBlock } from '@vue/compiler-sfc'
import type { RawSourceMap } from 'source-map-js'
import type { Statement } from '@babel/types'
import traverse from "@babel/traverse"
import type * as babelCore from '@babel/core'
import type { Context, BabelOptions, ReactBabelOptions, ResolvedOptions } from '../types'
import { ScriptCompileContext,} from './utils/context'
import { genStyleCode } from './style'

// lazy load babel since it's not used during build if plugins are not used
let babel: typeof babelCore | undefined
async function loadBabel() {
  if (!babel)
    babel = await import('@babel/core')

  return babel
}

const jsxImportSource = 'react'
const jsxImportRuntime = `${jsxImportSource}/jsx-runtime`
const jsxImportDevRuntime = `${jsxImportSource}/jsx-dev-runtime`
// Support patterns like:
// - import * as React from 'react';
// - import React from 'react';
// - import React, {useEffect} from 'react';
const importReactRE = /\bimport\s+(?:\*\s+as\s+)?React\b/
const refreshContentRE = /\$Refresh(?:Reg|Sig)\$\(/
const defaultIncludeRE = /\.[tj]sx?$/

const loadedPlugin = new Map<string, any>()
function loadPlugin(path: string): Promise<any> {
  const cached = loadedPlugin.get(path)
  if (cached)
    return cached

  const promise = import(path).then((module) => {
    const value = module.default || module
    loadedPlugin.set(path, value)
    return value
  })
  loadedPlugin.set(path, promise)
  return promise
}

function isExistReturnStatement(body: Statement[]) {
  for (const node of body) {
    if (node.type === 'ReturnStatement')
      return true
  }
  return false
}

function getTemplateCode(descriptor: SFCDescriptor) {
  const template = descriptor.template

  if (!template?.lang?.endsWith('x')) {
    // error
  }
  return {
    code: template?.content || '<></>',
    map: template?.map,
  }
}

export async function resolveScript(
  pluginContext: Context,
  sfc: SFCDescriptor,
  options: ResolvedOptions,
): Promise<SFCScriptBlock | null> {
  if (!sfc.script)
    return null

  // template
  let templateCode = ''
  if (sfc.template) {
    ;({ code: templateCode } = getTemplateCode(sfc))
  }

  // style
  const stylesCode = await genStyleCode(
    sfc,
    pluginContext,
  )

  const ctx = new ScriptCompileContext(sfc, options)
  const { script, source, filename } = sfc
  const scriptAst = ctx.scriptAst

  // string offsets
  const startOffset = ctx.startOffset!
  const endOffset = ctx.endOffset!
  const scriptStartOffset = script && script.loc.start.offset
  const scriptEndOffset = script && script.loc.end.offset
  let hasReturnStatement = false
  let exportDefaultEndPosition: number | null | undefined = 0

  if (script && scriptAst) {
    for (const node of scriptAst.body) {
      if (node.type === 'ExportDefaultDeclaration') {
        // export default
        const defaultExport = node

        if (defaultExport.declaration.type === 'FunctionDeclaration') {
          // export default function() {}
          const { body, end } = defaultExport.declaration.body
          exportDefaultEndPosition = end
          hasReturnStatement = isExistReturnStatement(body)
        }
        else if (defaultExport.declaration.type === 'Identifier') {
          // export default FuncName
          const FuncName = defaultExport.declaration.name

          // find: const const FuncName = () => {}
          for (const node of scriptAst.body) {
            if (node.type === 'VariableDeclaration') {
              const end = node.end
              const [variableNode] = node.declarations

              if (variableNode.id.type === 'Identifier' && variableNode.id.name === FuncName) {
                const type = variableNode.init?.type

                exportDefaultEndPosition = end

                if (type === 'ArrowFunctionExpression' || type === 'FunctionExpression') {
                  const Block = variableNode.init!.body

                  if (Block.type === 'BlockStatement')
                    hasReturnStatement = isExistReturnStatement(Block.body)
                }
                break
              }
            }
            else if (node.type === 'FunctionDeclaration' && node.id?.name === FuncName) {
              // function Fn() {}
              exportDefaultEndPosition = node.end
              hasReturnStatement = isExistReturnStatement(node.body.body)
            }
          }
        }
      }
    }

    if (!hasReturnStatement && exportDefaultEndPosition) {
      const returncode = `\n  return <>${templateCode}</>\n`
      ctx.s.prependLeft(scriptStartOffset + exportDefaultEndPosition - 1, returncode)
    }
  }

  // remove non-script content
  if (script) {
    if (startOffset < scriptStartOffset!) {
      // <script setup> before <script>
      ctx.s.remove(0, startOffset)
      ctx.s.remove(endOffset, scriptStartOffset!)
      ctx.s.remove(scriptEndOffset!, source.length)
    }
    else {
      // <script> before <script setup>
      ctx.s.remove(0, scriptStartOffset!)
      ctx.s.remove(scriptEndOffset!, startOffset)
      ctx.s.remove(endOffset, source.length)
    }
  }
  else {
    // only <script setup>
    ctx.s.remove(0, startOffset)
    ctx.s.remove(endOffset, source.length)
  }

  // add styles link
  ctx.s.prependLeft(0, stylesCode)

  // babel parse
  const code = ctx.s.toString()

  const babelOptions = (() => {
    const newBabelOptions = createBabelOptions(
      typeof options.babel === 'function'
        ? options.babel(sfc.filename, { ssr: false })
        : options.babel,
    )
    // runPluginOverrides?.(newBabelOptions, { id, ssr })
    return newBabelOptions
  })()

  const plugins = [...babelOptions.plugins]

  const isJSX = script?.lang?.endsWith('x')
  const useFastRefresh = (isJSX
    || (options.jsxRuntime === 'classic'
      ? importReactRE.test(code)
      : code.includes(jsxImportDevRuntime)
      || code.includes(jsxImportRuntime)))

  if (useFastRefresh) {
    plugins.push([
      await loadPlugin('react-refresh/babel'),
      { skipEnvCheck: true },
    ])
  }

  if (options.jsxRuntime === 'classic' && isJSX) {
    if (!options.isProduction) {
      // These development plugins are only needed for the classic runtime.
      plugins.push(
        await loadPlugin('@babel/plugin-transform-react-jsx-self'),
        await loadPlugin('@babel/plugin-transform-react-jsx-source'),
      )
    }
  }

  // Avoid parsing if no special transformation is needed
  let result = null

  if (plugins.length) {
    const parserPlugins = []

    if (isJSX)
      parserPlugins.push('jsx')

    if (sfc.script.lang === 'tsx')
      parserPlugins.push('typescript')

    const babel = await loadBabel()

    result = await babel.transformAsync(code, {
      ...babelOptions,
      ast: true,
      root: options.root,
      filename: `${filename}.tsx`,
      sourceFileName: filename,
      // Required for esbuild.jsxDev to provide correct line numbers
      retainLines: !options.isProduction && isJSX && options.jsxRuntime !== 'classic',
      parserOpts: {
        ...babelOptions.parserOpts,
        sourceType: 'module',
        allowAwaitOutsideFunction: true,
        plugins: parserPlugins as any,
      },
      generatorOpts: {
        ...babelOptions.generatorOpts,
        decoratorsBeforeExport: true,
      },
      presets: ['@babel/preset-typescript', '@babel/preset-react'],
      plugins,
      sourceMaps: true,
    })

    traverse(result?.ast!, {
      enter(path) {
        console.log(path, 'path')
        if (path.isIdentifier({ name: "n" })) {
          path.node.name = "x";
        }
      },
    })
  }

  const resolved: SFCScriptBlock = {
    ...script,
    bindings: ctx.bindingMetadata,
    imports: ctx.userImports,
    content: result ? result.code! : code,
    map:
      options.sourceMap !== false
        ? ((result?.map as unknown as RawSourceMap) || ctx.s.generateMap({
            source: filename,
            hires: true,
            includeContent: true,
          } as unknown as RawSourceMap))
        : undefined,
    scriptAst: scriptAst?.body,
    deps: ctx.deps ? [...ctx.deps] : undefined,
  }

  return resolved
}

function createBabelOptions(rawOptions?: BabelOptions) {
  const babelOptions = {
    babelrc: false,
    configFile: false,
    ...rawOptions,
  } as ReactBabelOptions

  babelOptions.plugins ||= []
  babelOptions.presets ||= []
  babelOptions.overrides ||= []
  babelOptions.parserOpts ||= {} as any
  babelOptions.parserOpts.plugins ||= []

  return babelOptions
}
