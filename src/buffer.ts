/**
 * Platform-specific inflate/decompress implementations injected into the
 * decoder at construction time.
 *
 * - **Node / Bun**: backed by `node:zlib` (`inflate` + `brotliDecompress`).
 * - **Browser**: backed by `pako` (inflate) + a bundled JS Brotli decoder.
 */
export type Inflates = {
  inflateAsync: (b: Uint8Array) => Uint8Array | Promise<Uint8Array>
  brotliDecompressAsync: (b: Uint8Array) => Uint8Array | Promise<Uint8Array>
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function concatUint8Arrays(arrs: Uint8Array[]) {
  let totalLength = 0
  for (const arr of arrs) totalLength += arr.length
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrs) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

const cutBuffer = (buffer: Uint8Array) => {
  const bufferPacks: Uint8Array[] = []
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  let size: number
  for (let i = 0; i < buffer.length; i += size) {
    size = view.getInt32(i)
    bufferPacks.push(buffer.slice(i, i + size))
  }
  return bufferPacks
}

/**
 * Create an async decoder function that parses raw Bilibili live WebSocket
 * frames into structured packets.
 *
 * Each frame has a 16-byte header:
 * - bytes 0–3: total packet length (int32 BE)
 * - bytes 4–5: header length (int16 BE, always 16)
 * - bytes 6–7: protocol version (0 = JSON, 1 = heartbeat, 2 = zlib, 3 = brotli)
 * - bytes 8–11: operation (2 = heartbeat req, 3 = heartbeat resp, 5 = message, 7 = join, 8 = welcome)
 * - bytes 12–15: sequence id
 *
 * Compressed frames (protocol 2/3) are recursively decoded after inflation.
 *
 * @link https://github.com/lovelyyoshino/Bilibili-Live-API/blob/master/API.WebSocket.md
 * @param inflates - Platform-specific decompression implementations.
 * @returns An async function that decodes a raw `Uint8Array` frame into an
 *          array of `{ buf, type, protocol, data }` packets.
 */
export const makeDecoder = ({ inflateAsync, brotliDecompressAsync }: Inflates) => {
  const decoder = async (buffer: Uint8Array) => {
    const packs = await Promise.all(
      cutBuffer(buffer).map(async buf => {
        const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
        const body = buf.slice(16)
        const protocol = view.getInt16(6)
        const operation = view.getInt32(8)

        let type = 'unknow'
        if (operation === 3) {
          type = 'heartbeat'
        } else if (operation === 5) {
          type = 'message'
        } else if (operation === 8) {
          type = 'welcome'
        }

        // biome-ignore lint/suspicious/noExplicitAny: server payloads are dynamic
        let data: any
        if (protocol === 0) {
          data = JSON.parse(textDecoder.decode(body))
        }
        if (protocol === 1 && body.length === 4) {
          const bodyView = new DataView(body.buffer, body.byteOffset, body.byteLength)
          data = bodyView.getUint32(0)
        }
        if (protocol === 2) {
          data = await decoder(await inflateAsync(body))
        }
        if (protocol === 3) {
          data = await decoder(await brotliDecompressAsync(body))
        }

        return { buf, type, protocol, data }
      })
    )

    return packs.flatMap(pack => {
      if (pack.protocol === 2 || pack.protocol === 3) {
        return pack.data as typeof packs
      }
      return pack
    })
  }

  return decoder
}

type EncodeType = 'heartbeat' | 'join'

/**
 * Encode a Bilibili live protocol packet with a 16-byte header and an
 * optional body.
 *
 * Header layout:
 * - bytes 0–3: total length (header + body)
 * - bytes 4–5: header length (16)
 * - bytes 6–7: protocol version (1)
 * - bytes 8–11: operation (`2` for heartbeat, `7` for join)
 * - bytes 12–15: sequence id (1)
 *
 * @param type - Packet type: `"heartbeat"` (keep-alive) or `"join"` (room enter).
 * @param body - Optional payload. Objects are JSON-stringified; strings are
 *               encoded as UTF-8. Defaults to an empty string.
 * @returns The encoded packet as a `Uint8Array`.
 */
export const encoder = (type: EncodeType, body: string | Record<string, unknown> = '') => {
  const encoded = typeof body === 'string' ? body : JSON.stringify(body)
  const head = new Uint8Array(16)
  const headView = new DataView(head.buffer, head.byteOffset, head.byteLength)
  const buffer = textEncoder.encode(encoded)

  headView.setInt32(0, buffer.length + head.length)
  headView.setInt16(4, 16)
  headView.setInt16(6, 1)
  if (type === 'heartbeat') {
    headView.setInt32(8, 2)
  }
  if (type === 'join') {
    headView.setInt32(8, 7)
  }
  headView.setInt32(12, 1)
  return concatUint8Arrays([head, buffer])
}
