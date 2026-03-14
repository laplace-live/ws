import { encoder, type Inflates, makeDecoder } from './buffer.ts'
import { LaplaceEventTarget, LaplaceRawEvent } from './events.ts'

/**
 * Options for configuring the Bilibili live connection authentication.
 *
 * When {@link authBody} is provided it takes precedence over all other
 * fields and is sent as the join payload verbatim.
 */
export type LiveOptions = {
  /** Protocol version. Defaults to `3` (brotli-compressed). */
  protover?: 1 | 2 | 3
  /** Authentication token obtained from the danmaku info API. */
  key?: string
  /**
   * Pre-built authentication body. When supplied as a `Uint8Array` it is
   * sent raw; when supplied as an object it is JSON-encoded before sending.
   * Takes precedence over {@link key}, {@link uid}, and {@link buvid}.
   */
  authBody?: Uint8Array | Record<string, unknown>
  /** User ID. Defaults to `0` (anonymous). */
  uid?: number
  /** Browser unique visitor ID used for risk-control tracking. */
  buvid?: string
}

/**
 * Base class for a single Bilibili live room connection.
 *
 * Extends {@link LaplaceEventTarget} and emits the following events:
 *
 * | Event         | Payload            | Description                                      |
 * |---------------|--------------------|--------------------------------------------------|
 * | `open`        | —                  | Underlying transport connected.                  |
 * | `live`        | —                  | Server acknowledged the join (room entered).     |
 * | `heartbeat`   | `LaplaceRawEvent<number>`| Online viewer count received from server.        |
 * | `msg`         | `LaplaceRawEvent<any>`   | Any server command message.                      |
 * | `DANMU_MSG`   | `LaplaceRawEvent<any>`   | Danmaku (chat) message.                          |
 * | `close`       | —                  | Connection closed.                               |
 * | `error`       | —                  | Unrecoverable error (connection is closed).      |
 * | `event`       | `LaplaceRawEvent<Event>` | Meta-event wrapping every dispatched event.      |
 *
 * Subclasses ({@link LiveWSBase}, {@link LiveTCPBase}) provide the concrete
 * transport and supply `send` / `close` callbacks to this constructor.
 *
 * @param inflates - Platform-specific inflate + brotli decompressors.
 * @param roomid   - Numeric Bilibili live room ID.
 * @param options  - Transport callbacks and authentication options.
 *
 * @throws {Error} If `roomid` is not a finite number.
 */
export class Live extends LaplaceEventTarget {
  /** The live room ID this instance is connected to. */
  roomid: number
  /** Latest known online viewer count, updated on each heartbeat. */
  online: number
  /** `true` after the server acknowledges the join (`welcome` packet). */
  live: boolean
  /** `true` after {@link close} has been called. */
  closed: boolean
  /** @internal Handle for the heartbeat interval timer. */
  timeout: ReturnType<typeof setTimeout>

  /** Send raw binary data over the underlying transport. */
  send: (data: Uint8Array) => void
  /** Gracefully close the connection and set {@link closed} to `true`. */
  close: () => void

  constructor(
    inflates: Inflates,
    roomid: number,
    {
      send,
      close,
      protover = 3,
      key,
      authBody,
      uid = 0,
      buvid,
    }: { send: (data: Uint8Array) => void; close: () => void } & LiveOptions
  ) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }

    super()
    this.roomid = roomid
    this.online = 0
    this.live = false
    this.closed = false
    this.timeout = setTimeout(() => {}, 0)

    this.send = send
    this.close = () => {
      this.closed = true
      close()
    }

    const decode = makeDecoder(inflates)

    this.addEventListener<Uint8Array>('message', async e => {
      const buffer = e.data
      const packs = await decode(buffer)
      packs.forEach(({ type, data }) => {
        if (type === 'welcome') {
          this.live = true
          this.dispatchEvent(new Event('live'))
          this.send(encoder('heartbeat'))
        }
        if (type === 'heartbeat') {
          this.online = data
          clearTimeout(this.timeout)
          this.timeout = setTimeout(() => this.heartbeat(), 1000 * 30)
          this.dispatchEvent(new LaplaceRawEvent('heartbeat', this.online))
        }
        if (type === 'message') {
          this.dispatchEvent(new LaplaceRawEvent('msg', data))
          const cmd = data.cmd || data.msg?.cmd
          if (cmd) {
            if (cmd.includes('DANMU_MSG')) {
              this.dispatchEvent(new LaplaceRawEvent('DANMU_MSG', data))
            } else {
              this.dispatchEvent(new LaplaceRawEvent(cmd, data))
            }
          }
        }
      })
    })

    this.addEventListener('open', () => {
      if (authBody) {
        this.send(authBody instanceof Uint8Array ? authBody : encoder('join', authBody))
      } else {
        const hi: {
          uid: number
          roomid: number
          protover: number
          platform: string
          type: number
          key?: string
          buvid?: string
        } = { uid: uid, roomid, protover, platform: 'web', type: 2 }
        if (key) {
          hi.key = key
        }
        if (buvid) {
          hi.buvid = buvid
        }
        const buf = encoder('join', hi)
        this.send(buf)
      }
    })

    this.addEventListener('close', () => {
      clearTimeout(this.timeout)
    })

    this.addEventListener('_error', () => {
      this.close()
      this.dispatchEvent(new Event('error'))
    })
  }

  /** Send a heartbeat packet to the server. */
  heartbeat() {
    this.send(encoder('heartbeat'))
  }

  /**
   * Send a heartbeat and resolve with the online viewer count from the
   * next heartbeat response.
   * @returns A promise that resolves with the current online count.
   */
  getOnline() {
    this.heartbeat()
    return new Promise<number>(resolve => this.addEventListener('heartbeat', e => resolve(e.data), { once: true }))
  }
}
