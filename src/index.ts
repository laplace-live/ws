import { inflates } from './inflate/node.ts'
import { KeepLive } from './keep-live.ts'
import { LiveTCPBase, type TCPOptions } from './tcp.ts'
import { LiveWSBase, type WSOptions } from './ws.ts'

export type { LiveEventMap } from './events.ts'
export type { LiveOptions } from './live.ts'
export type { TCPOptions } from './tcp.ts'
export type { WSOptions } from './ws.ts'

export { LaplaceRawEvent } from './events.ts'
export { getConf, getRoomid } from './extra.ts'

/**
 * WebSocket client for a Bilibili live room (Node.js / Bun).
 *
 * Uses `node:zlib` for inflate and brotli decompression.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @param opts   - Optional WebSocket address and authentication options.
 *
 * @example
 * ```ts
 * import { LiveWS } from '@laplace.live/ws'
 *
 * const live = new LiveWS(12345, { key: '...', address: 'wss://...' })
 * live.on('DANMU_MSG', (e) => console.log(e.data))
 * ```
 */
export class LiveWS extends LiveWSBase {
  constructor(roomid: number, opts?: WSOptions) {
    super(inflates, roomid, opts)
  }
}

/**
 * TCP client for a Bilibili live room (Node.js / Bun only).
 *
 * Uses `node:zlib` for inflate and brotli decompression, and `node:net`
 * for the TCP transport.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @param opts   - Optional TCP host/port and authentication options.
 *
 * @example
 * ```ts
 * import { LiveTCP } from '@laplace.live/ws'
 *
 * const live = new LiveTCP(12345, { key: '...' })
 * live.on('heartbeat', (e) => console.log('online:', e.data))
 * ```
 */
export class LiveTCP extends LiveTCPBase {
  constructor(roomid: number, opts?: TCPOptions) {
    super(inflates, roomid, opts)
  }
}

/**
 * Auto-reconnecting WebSocket client for a Bilibili live room
 * (Node.js / Bun).
 *
 * Wraps {@link LiveWS} with automatic reconnection on disconnect or
 * heartbeat timeout. All events from the underlying connection are
 * forwarded to this instance.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @param opts   - Optional WebSocket address and authentication options.
 *
 * @example
 * ```ts
 * import { KeepLiveWS } from '@laplace.live/ws'
 *
 * const keep = new KeepLiveWS(12345, { key: '...' })
 * keep.on('DANMU_MSG', (e) => console.log(e.data))
 * ```
 */
export class KeepLiveWS extends KeepLive<typeof LiveWSBase> {
  constructor(roomid: number, opts?: WSOptions) {
    super(LiveWSBase, inflates, roomid, opts)
  }
}

/**
 * Auto-reconnecting TCP client for a Bilibili live room
 * (Node.js / Bun only).
 *
 * Wraps {@link LiveTCP} with automatic reconnection on disconnect or
 * heartbeat timeout. All events from the underlying connection are
 * forwarded to this instance.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @param opts   - Optional TCP host/port and authentication options.
 *
 * @example
 * ```ts
 * import { KeepLiveTCP } from '@laplace.live/ws'
 *
 * const keep = new KeepLiveTCP(12345, { key: '...' })
 * keep.on('heartbeat', (e) => console.log('online:', e.data))
 * ```
 */
export class KeepLiveTCP extends KeepLive<typeof LiveTCPBase> {
  constructor(roomid: number, opts?: TCPOptions) {
    super(LiveTCPBase, inflates, roomid, opts)
  }
}
