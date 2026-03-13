import { inflates } from './inflate/browser.ts'
import { KeepLive } from './keep-live.ts'
import { LiveWSBase, type WSOptions } from './ws.ts'

export type { LiveEventMap } from './events.ts'
export type { LiveOptions } from './live.ts'
export type { WSOptions } from './ws.ts'

export { LaplaceRawEvent } from './events.ts'

/**
 * WebSocket client for a Bilibili live room (browser).
 *
 * Uses the native `DecompressionStream` API for zlib inflate and a
 * bundled JS decoder for brotli decompression, requiring no Node.js
 * built-ins or third-party dependencies.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @param opts   - Optional WebSocket address and authentication options.
 *
 * @example
 * ```ts
 * import { LiveWS } from '@laplace.live/ws/browser'
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
 * Auto-reconnecting WebSocket client for a Bilibili live room (browser).
 *
 * Wraps the browser {@link LiveWS} with automatic reconnection on
 * disconnect or heartbeat timeout. All events from the underlying
 * connection are forwarded to this instance.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @param opts   - Optional WebSocket address and authentication options.
 *
 * @example
 * ```ts
 * import { KeepLiveWS } from '@laplace.live/ws/browser'
 *
 * const keep = new KeepLiveWS(12345, { key: '...' })
 * keep.on('DANMU_MSG', (e) => console.log(e.data))
 * ```
 */
export class KeepLiveWS extends KeepLive<LiveWSBase> {
  constructor(roomid: number, opts?: WSOptions) {
    super(() => new LiveWSBase(inflates, roomid, opts))
  }
}
