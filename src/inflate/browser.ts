import { Buffer } from 'buffer'
import { inflate } from 'pako'

import { BrotliDecode } from './brotli.ts'

const inflateAsync = (d: Buffer) => Buffer.from(inflate(d))
const brotliDecompressAsync = (d: Buffer) => Buffer.from(BrotliDecode(Int8Array.from(d)))

export const inflates = { inflateAsync, brotliDecompressAsync, Buffer }
