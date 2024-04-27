import { createRequire } from 'node:module'
import type * as _compiler from '@vue/compiler-sfc'

// extend the descriptor so we can store the scopeId on it
declare module '@vue/compiler-sfc' {
  interface SFCDescriptor {
    id: string
  }
  interface ImportBinding {
    isType: boolean
    imported: string
    local: string
    source: string
    isFromSetup: boolean
    isUsedInTemplate: boolean
  }
}

export function resolveCompiler(root: string): typeof _compiler {
  // resolve from project root first, then fallback to peer dep (if any)
  const compiler = tryResolveCompiler(root) || tryResolveCompiler()
  if (!compiler) {
    throw new Error(
      `Failed to resolve @vue/compiler-sfc.\n`,
    )
  }

  return compiler
}

function tryResolveCompiler(root?: string) {
  return tryRequire('@vue/compiler-sfc', root)
}

const _require = createRequire(import.meta.url || __filename)
function tryRequire(id: string, from?: string) {
  try {
    return from
      ? _require(_require.resolve(id, { paths: [from] }))
      : _require(id)
  }
  catch {}
}
