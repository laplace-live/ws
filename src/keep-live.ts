import type { Live } from './live.ts'

import { DataEvent, EventEvent } from './events.ts'

/**
 * Auto-reconnecting wrapper around a {@link Live} subclass.
 *
 * `KeepLive` maintains a persistent connection to a Bilibili live room by
 * automatically re-creating the underlying {@link Live} instance whenever
 * the connection drops or a heartbeat timeout is reached. All events from
 * the inner connection are forwarded to this instance.
 *
 * @typeParam Base - The concrete {@link Live} subclass to manage
 *                   (e.g. `typeof LiveWSBase` or `typeof LiveTCPBase`).
 *
 * @example
 * ```ts
 * const keep = new KeepLiveWS(12345, { key: '...' })
 * keep.on('heartbeat', (e) => console.log('online:', e.data))
 * keep.on('DANMU_MSG', (e) => console.log('danmaku:', e.data))
 * ```
 */
export class KeepLive<Base extends typeof Live> extends EventTarget {
  /** @internal Stored constructor arguments for reconnection. */
  params: ConstructorParameters<Base>
  /** `true` after {@link close} has been called; prevents further reconnects. */
  closed: boolean
  /** Delay in milliseconds before attempting a reconnect. */
  interval: number
  /** Maximum milliseconds to wait for a heartbeat before forcing a reconnect. */
  timeout: number
  /** The current underlying connection instance. */
  connection: InstanceType<Base>
  /** @internal The base class constructor used to create new connections. */
  Base: Base

  constructor(Base: Base, ...params: ConstructorParameters<Base>) {
    super()
    this.params = params
    this.closed = false
    this.interval = 100
    this.timeout = 45 * 1000
    this.connection = new (Base as any)(...this.params)
    this.Base = Base
    this.connect(false)
  }

  /**
   * Overridden to also dispatch an {@link EventEvent} for every event,
   * enabling catch-all listeners via the `"event"` type.
   */
  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event)
    super.dispatchEvent(new EventEvent(event))
    return result
  }

  /**
   * Wire up event forwarding and timeout handling on the current connection.
   * When `reconnect` is `true`, the previous connection is closed and a fresh
   * one is created from the stored constructor parameters.
   *
   * @param reconnect - Whether to tear down and recreate the connection first.
   */
  connect(reconnect = true) {
    if (reconnect) {
      this.connection.close()
      this.connection = new (this.Base as any)(...this.params)
    }
    const connection = this.connection

    let timeout = setTimeout(() => {
      connection.close()
      connection.dispatchEvent(new Event('timeout'))
    }, this.timeout)

    connection.addEventListener('event', e => {
      const evt = (e as EventEvent).event
      if (evt.type !== 'error') {
        if (evt instanceof DataEvent) {
          this.dispatchEvent(new DataEvent(evt.type, evt.data))
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

  /**
   * Subscribe to an event type with a typed {@link DataEvent} listener.
   *
   * @typeParam T - Expected data type carried by the event.
   * @param type     - Event name (e.g. `"heartbeat"`, `"msg"`, `"DANMU_MSG"`).
   * @param listener - Callback receiving a {@link DataEvent DataEvent\<T\>}.
   * @param options  - Standard `addEventListener` options.
   */
  on<T = unknown>(
    type: string,
    listener: (event: DataEvent<T>) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.addEventListener(type, listener as EventListener, options)
  }

  /**
   * Unsubscribe a previously registered listener.
   *
   * @typeParam T - Data type matching the original subscription.
   * @param type     - Event name.
   * @param listener - The same function reference passed to {@link on}.
   * @param options  - Standard `removeEventListener` options.
   */
  off<T = unknown>(
    type: string,
    listener: (event: DataEvent<T>) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.removeEventListener(type, listener as EventListener, options)
  }
}
