import { promisify } from 'node:util'
import { brotliDecompress, inflate } from 'node:zlib'
import { Buffer } from 'buffer'

const inflateAsync = promisify<Parameters<typeof inflate>[0], Parameters<Parameters<typeof inflate>[2]>[1]>(inflate)
const brotliDecompressAsync = promisify<
  Parameters<typeof brotliDecompress>[0],
  Parameters<Parameters<typeof brotliDecompress>[1]>[1]
>(brotliDecompress)

export const inflates = { inflateAsync, brotliDecompressAsync, Buffer }
