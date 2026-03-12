import { inflate } from 'pako'

import { BrotliDecode } from './brotli.ts'

const inflateAsync = (d: Uint8Array) => inflate(d)
const brotliDecompressAsync = (d: Uint8Array) => Uint8Array.from(BrotliDecode(Int8Array.from(d)))

export const inflates = { inflateAsync, brotliDecompressAsync }
