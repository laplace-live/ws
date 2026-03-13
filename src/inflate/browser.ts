import { BrotliDecode } from './brotli.ts'

const inflateAsync = async (d: Uint8Array) => {
  const { inflate } = await import('pako')
  return inflate(d)
}
const brotliDecompressAsync = (d: Uint8Array) => Uint8Array.from(BrotliDecode(Int8Array.from(d)))

export const inflates = { inflateAsync, brotliDecompressAsync }
