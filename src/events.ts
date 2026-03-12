/**
 * A typed {@link Event} that carries an arbitrary data payload.
 *
 * Used throughout the library to deliver structured messages such as
 * heartbeat counts, danmaku payloads, and other server-pushed data.
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
export class DataEvent<T> extends Event {
  data: T
  constructor(type: string, data: T) {
    super(type)
    this.data = data
  }
}

/**
 * A meta-event dispatched alongside every other event on a {@link Live}
 * or {@link KeepLive} instance, wrapping the original event.
 *
 * Listeners on the `"event"` type receive an `EventEvent` for every
 * dispatched event, enabling a single catch-all handler.
 *
 * @example
 * ```ts
 * live.addEventListener('event', (e) => {
 *   console.log('any event fired:', (e as EventEvent).event.type)
 * })
 * ```
 */
export class EventEvent extends Event {
  event: Event
  constructor(event: Event) {
    super('event')
    this.event = event
  }
}
