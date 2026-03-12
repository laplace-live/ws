/**
 * A typed {@link Event} that carries an arbitrary data payload.
 *
 * Used throughout the library to deliver structured messages such as
 * heartbeat counts, danmaku payloads, and other server-pushed data.
 *
 * Also used internally with `LaplaceRawEvent<Event>` as a catch-all meta-event
 * (type `"event"`) to forward all events through {@link KeepLive}.
 *
 * @typeParam T - The type of the data payload attached to this event.
 *
 * @example
 * ```ts
 * live.on<number>('heartbeat', (e) => {
 *   console.log('online:', e.data)
 * })
 * ```
 */
export class LaplaceRawEvent<T> extends Event {
  data: T
  constructor(type: string, data: T) {
    super(type)
    this.data = data
  }
}
