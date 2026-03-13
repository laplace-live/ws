import { BrotliDecode } from './brotli.ts'

const inflateAsync = async (d: Uint8Array<ArrayBuffer>) => {
  const ds = new DecompressionStream('deflate')
  const writer = ds.writable.getWriter()
  await writer.write(d)
  await writer.close()
  return new Uint8Array(await new Response(ds.readable).arrayBuffer())
}
const brotliDecompressAsync = (d: Uint8Array) => Uint8Array.from(BrotliDecode(Int8Array.from(d)))

export const inflates = { inflateAsync, brotliDecompressAsync }
