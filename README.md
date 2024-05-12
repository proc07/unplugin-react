# unplugin-react

[![NPM version](https://img.shields.io/npm/v/unplugin-react?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-react)

Transform React SFC to JavaScript.

## Features

- ⚡️ Support Vite, Webpack, Rollup, esbuild and more, powered by [unplugin](https://github.com/unjs/unplugin).
- [todo] ✨ Support `<script setup>` and macros.
- ✨ Supports Using Pre-Processors and Scoped CSS、CSS Modules.
- ✨ Supports both components and directives.
- 🦾 Full TypeScript support.
- 🔥 Hot module replacement (HMR) support for Vite.

## Install

```bash
npm i unplugin-react
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import React from 'unplugin-react/vite'

export default defineConfig({
  plugins: [
    React({ /* options */ }),
  ],
})
```

Example: [`playground/`](./playground/)

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import React from 'unplugin-react/rollup'

export default {
  plugins: [
    React({ /* options */ }),
  ],
}
```

<br></details>


<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-react/webpack')({ /* options */ })
  ]
}
```

<br></details>


## Credits

- [Vite](https://github.com/vitejs/vite) - Next generation frontend tooling. It's fast!
- [unplugin](https://github.com/unjs/unplugin) - Unified plugin system for Vite, Rollup, Webpack, and more

## License

[MIT](./LICENSE) License © 2024-PRESENT [proc07](https://github.com/proc07)