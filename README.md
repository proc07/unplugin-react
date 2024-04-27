# unplugin-react

[![NPM version](https://img.shields.io/npm/v/unplugin-react?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-react)

React template for [unplugin](https://github.com/unjs/unplugin).

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