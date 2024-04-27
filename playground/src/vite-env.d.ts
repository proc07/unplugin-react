/// <reference types="vite/client" />

// declare module '*.react' {
//   const node: React.FC

//   const content: React.JSX.Element
//   // export default content
//   export default node
// }

declare module '*.react' {
  import { JSX } from 'react'

  export default () => JSX.Element
}
