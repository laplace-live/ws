import type { Inflates } from './buffer.ts'

import { LaplaceRawEvent } from './events.ts'
import { Live, type LiveOptions } from './live.ts'

/**
 * Configuration options for WebSocket-based live connections.
 * Extends {@link LiveOptions} with an optional WebSocket server address.
 */
export type WSOptions = LiveOptions & {
  /** WebSocket server URL. Defaults to `wss://broadcastlv.chat.bilibili.com/sub`. */
  address?: string
}

/**
 * WebSocket transport for Bilibili live room connections.
 *
 * Wraps a native {@link WebSocket}, wiring its lifecycle events (`open`,
 * `message`, `close`, `error`) into the {@link Live} event system. Binary
 * frames are forwarded as `LaplaceRawEvent<Uint8Array>` for protocol decoding.
 *
 * Not typically instantiated directly — use {@link LiveWS} (server) or the
 * browser-specific `LiveWS` which inject the appropriate inflate
 * implementation.
 *
 * @param inflates - Platform-specific inflate/brotli decompressors.
 * @param roomid   - Numeric Bilibili live room ID.
 * @param options  - WebSocket address and authentication options.
 */
export class LiveWSBase extends Live {
  /** The underlying native WebSocket instance. */
  ws: WebSocket

  constructor(
    inflates: Inflates,
    roomid: number,
    { address = 'wss://broadcastlv.chat.bilibili.com/sub', ...options }: WSOptions = {}
  ) {
    const ws = new WebSocket(address)
    const send = (data: Uint8Array) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
    const close = () => this.ws.close()

    super(inflates, roomid, { send, close, ...options })

    ws.binaryType = 'arraybuffer'
    ws.addEventListener('open', e => this.dispatchEvent(new Event(e.type)))
    ws.addEventListener('message', e =>
      this.dispatchEvent(new LaplaceRawEvent('message', new Uint8Array(e.data as ArrayBuffer)))
    )
    ws.addEventListener('close', e => this.dispatchEvent(new Event(e.type)))
    ws.addEventListener('error', () => this.dispatchEvent(new Event('_error')))

    this.ws = ws
  }
}
