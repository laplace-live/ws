import { brotliDecompressSync, inflateSync } from 'node:zlib'

// Sync on purpose: frames are small (typically a few KB), and the async
// variants' threadpool round-trip costs ~3x more than the decompression itself.
const inflateAsync = (b: Uint8Array) => inflateSync(b)
const brotliDecompressAsync = (b: Uint8Array) => brotliDecompressSync(b)

export const inflates = { inflateAsync, brotliDecompressAsync }
