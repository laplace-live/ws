import type { Live } from './live.ts'

import { LaplaceRawEvent, type LiveEventMap } from './events.ts'

/**
 * Auto-reconnecting wrapper around a {@link Live} subclass.
 *
 * `KeepLive` maintains a persistent connection to a Bilibili live room by
 * automatically re-creating the underlying {@link Live} instance whenever
 * the connection drops or a heartbeat timeout is reached. All events from
 * the inner connection are forwarded to this instance.
 *
 * @typeParam T - The concrete {@link Live} instance type being managed.
 *
 * @example
 * ```ts
 * const keep = new KeepLiveWS(12345, { key: '...' })
 * keep.addEventListener('heartbeat', (e) => console.log('online:', e.data))
 * keep.addEventListener('DANMU_MSG', ({ data }) => console.log('danmaku:', data.msg_id))
 * ```
 */
export class KeepLive<T extends Live> extends EventTarget {
  /** @internal Factory that creates a fresh connection with the original arguments. */
  private createConnection: () => T
  /** `true` after {@link close} has been called; prevents further reconnects. */
  closed: boolean
  /** Delay in milliseconds before attempting a reconnect. */
  interval: number
  /** Maximum milliseconds to wait for a heartbeat before forcing a reconnect. */
  timeout: number
  /** The current underlying connection instance. */
  connection: T

  constructor(createConnection: () => T) {
    super()
    this.createConnection = createConnection
    this.closed = false
    this.interval = 100
    this.timeout = 45 * 1000
    this.connection = this.createConnection()
    this.connect(false)
  }

  /**
   * Overridden to also dispatch a `LaplaceRawEvent<Event>` with type `"event"`
   * for every event, enabling catch-all listeners.
   */
  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event)
    super.dispatchEvent(new LaplaceRawEvent('event', event))
    return result
  }

  /**
   * Wire up event forwarding and timeout handling on the current connection.
   * When `reconnect` is `true`, the previous connection is closed and a fresh
   * one is created via the factory.
   *
   * @param reconnect - Whether to tear down and recreate the connection first.
   */
  connect(reconnect = true) {
    if (reconnect) {
      this.connection.close()
      this.connection = this.createConnection()
    }
    const connection = this.connection

    let timeout = setTimeout(() => {
      connection.close()
      connection.dispatchEvent(new Event('timeout'))
    }, this.timeout)

    connection.addEventListener('event', e => {
      const evt = e.data
      if (evt.type !== 'error') {
        if (evt instanceof LaplaceRawEvent) {
          this.dispatchEvent(new LaplaceRawEvent(evt.type, evt.data))
        } else {
          this.dispatchEvent(new Event(evt.type))
        }
      }
    })

    connection.addEventListener('error', () => this.dispatchEvent(new Event('e')))
    connection.addEventListener('close', () => {
      if (!this.closed) {
        setTimeout(() => this.connect(), this.interval)
      }
    })

    connection.addEventListener('heartbeat', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        connection.close()
        connection.dispatchEvent(new Event('timeout'))
      }, this.timeout)
    })

    connection.addEventListener('close', () => {
      clearTimeout(timeout)
    })
  }

  /** Latest known online viewer count from the underlying connection. */
  get online() {
    return this.connection.online
  }

  /** The live room ID. */
  get roomid() {
    return this.connection.roomid
  }

  /** Permanently close the connection and stop reconnecting. */
  close() {
    this.closed = true
    this.connection.close()
  }

  /** Send a heartbeat packet to the server. */
  heartbeat() {
    return this.connection.heartbeat()
  }

  /**
   * Send a heartbeat and resolve with the online viewer count from the
   * next heartbeat response.
   * @returns A promise that resolves with the current online count.
   */
  getOnline() {
    return this.connection.getOnline()
  }

  /**
   * Send raw binary data through the underlying connection.
   * @param data - The binary packet to send.
   */
  send(data: Uint8Array) {
    return this.connection.send(data)
  }

  /** {@inheritDoc Live.addEventListener} */
  declare addEventListener: {
    <K extends keyof LiveEventMap>(
      type: K,
      listener: (ev: LiveEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions
    ): void
    <T = unknown>(
      type: string,
      listener: (ev: LaplaceRawEvent<T>) => void,
      options?: boolean | AddEventListenerOptions
    ): void
  }

  /** {@inheritDoc Live.removeEventListener} */
  declare removeEventListener: {
    <K extends keyof LiveEventMap>(
      type: K,
      listener: (ev: LiveEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void
    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
  }
}
