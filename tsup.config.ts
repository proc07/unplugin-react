import type { Options } from 'tsup'

export default <Options>{
  entry: ['./src/*.ts'],
  format: ['esm', 'cjs'],
  target: 'node18',
  clean: true,
  dts: true,
  splitting: true,
  cjsInterop: true,
  shims: true,
  onSuccess: 'npm run build:fix',
}
