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

## Notes

1.resolveId 钩子

(它允许你自定义模块的解析过程。这个钩子想象成一个“拦截器”，它可以拦截到Vite 对模块的解析请求，然后根据自己的需求来处理这个请求。)
实现一些功能： 支持自定义的模块格式、优化模块的查找过程、实现模块的懒加载（可以返回一个虚拟模块,然后在 load 钩子中提供真实的模块代码）

2.load 钩子

- 1.加载 xx.react 文件id，不做任何处理。(给transform 转换回来进行处理)
- 2.对 url ?react 文件类型：为子部分虚拟模块选择相应的块。使用 filename 获取之前解析过的sfc数据（缓存）。拿取style、其他的code返回。 

3.transform 钩子

- 1.加载 .react 文件，获取code代码进行提取。通过 vue/compiler-sfc 的SFCDescriptor 解析创建 SFCDescriptor（描述符结构数据体），这里会进行cache 缓存下来，用于 css 等import?css 的获取.
- 1.2.对 template code 处理：通过 babel/parser 编译成ast树，traverse 遍历html节点进行添加 data-v-id 属性，用于给 style scoped 关联样式，再 generate 编译成字符串
- 1.3.对 style code 处理：通过SFC的结果内容获取styls 部分信息生成 import link 字符串，添加到js代码中。
- 1.4.对 js code 处理：使用 babel 解析成ast树，自动生成返回函数, 并且把 template 嵌入再函数return中（自动生成 return 函数）
  - export default
  - export default function() {}
  - export default FuncName
- 1.5.脚本交还给浏览器执行之后，触发 load 钩子，执行加载组件中的css、子组件文件。
- 2.处理 .react 文件中的sub block request。 
  - 2.1 style 处理：vite 已经处理预处理器和 CSS 模块，所以这只是应用特定于 SFC 的转换，例如作用域模式和 CSS 变量重写 (v-bind(var))
  - 2.2 模版中如何编写多个style 模块，根据 url 的 query.index 来获取对应的 css 样式模块。

## License

[MIT](./LICENSE) License © 2024-PRESENT [proc07](https://github.com/proc07)