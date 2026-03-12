import { promisify } from 'node:util'
import { brotliDecompress, inflate } from 'node:zlib'

const _inflate = promisify(inflate)
const _brotli = promisify(brotliDecompress)

const inflateAsync = (b: Uint8Array) => _inflate(b)
const brotliDecompressAsync = (b: Uint8Array) => _brotli(b)

export const inflates = { inflateAsync, brotliDecompressAsync }
