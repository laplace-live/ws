import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    browser: 'src/browser.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  fixedExtension: false,
})
