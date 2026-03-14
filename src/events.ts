import type { BilibiliInternal } from '@laplace.live/internal'

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
 * live.addEventListener('heartbeat', (e) => {
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

/**
 * Maps known event names to their event types for typed `addEventListener`.
 *
 * - Built-in lifecycle events (`open`, `live`, `close`, etc.) map to plain `Event`.
 * - `heartbeat` maps to `LaplaceRawEvent<number>` (online viewer count).
 * - `msg` maps to `LaplaceRawEvent<unknown>` (any server command).
 * - Bilibili commands map to `LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.*>`.
 * - Unknown/dynamic events fall through to a generic overload on `addEventListener`.
 */
export interface LiveEventMap {
  open: Event
  live: Event
  close: Event
  error: Event
  heartbeat: LaplaceRawEvent<number>
  msg: LaplaceRawEvent<unknown>
  event: LaplaceRawEvent<Event>

  DANMU_MSG: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.DANMU_MSG>
  RECALL_DANMU_MSG: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.RECALL_DANMU_MSG>
  INTERACT_WORD: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.INTERACT_WORD>
  ENTRY_EFFECT: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ENTRY_EFFECT>
  USER_TOAST_MSG: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.USER_TOAST_MSG>
  USER_TOAST_MSG_V2: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.USER_TOAST_MSG_V2>
  SEND_GIFT: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.SEND_GIFT>
  SEND_GIFT_V2: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.SEND_GIFT_V2>
  INTERACT_WORD_V2: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.INTERACT_WORD_V2>
  SUPER_CHAT_MESSAGE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.SUPER_CHAT_MESSAGE>
  SUPER_CHAT_MESSAGE_DELETE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.SUPER_CHAT_MESSAGE_DELETE>
  USER_VIRTUAL_MVP: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.USER_VIRTUAL_MVP>
  LIKE_INFO_V3_CLICK: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.LIKE_INFO_V3_CLICK>
  POPULARITY_RED_POCKET_START: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.POPULARITY_RED_POCKET_START>
  POPULARITY_RED_POCKET_V2_START: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.POPULARITY_RED_POCKET_V2_START>
  POPULARITY_RED_POCKET_WINNER_LIST: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.POPULARITY_RED_POCKET_WINNER_LIST>
  POPULARITY_RED_POCKET_V2_WINNER_LIST: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.POPULARITY_RED_POCKET_V2_WINNER_LIST>
  ANCHOR_LOT_START: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ANCHOR_LOT_START>
  ANCHOR_LOT_AWARD: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ANCHOR_LOT_AWARD>
  COMMON_NOTICE_DANMAKU: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.COMMON_NOTICE_DANMAKU>
  EFFECT_DANMAKU_MSG: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.EFFECT_DANMAKU_MSG>
  DANMU_ACTIVITY_CONFIG: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.DANMU_ACTIVITY_CONFIG>
  ROOM_CHANGE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_CHANGE>
  ROOM_SILENT_ON: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_SILENT_ON>
  ROOM_SILENT_OFF: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_SILENT_OFF>
  WATCHED_CHANGE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.WATCHED_CHANGE>
  LIKE_INFO_V3_UPDATE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.LIKE_INFO_V3_UPDATE>
  ONLINE_RANK_COUNT: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ONLINE_RANK_COUNT>
  ONLINE_RANK_V2: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ONLINE_RANK_V2>
  ONLINE_RANK_V3: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ONLINE_RANK_V3>
  ROOM_REAL_TIME_MESSAGE_UPDATE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_REAL_TIME_MESSAGE_UPDATE>
  ROOM_REAL_TIME_MESSAGE_UPDATE_V2: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_REAL_TIME_MESSAGE_UPDATE_V2>
  LIVE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.LIVE>
  PREPARING: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.PREPARING>
  WARNING: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.WARNING>
  CUT_OFF: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.CUT_OFF>
  ROOM_BLOCK_MSG: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_BLOCK_MSG>
  ROOM_ADMINS: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_ADMINS>
  room_admin_entrance: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.room_admin_entrance>
  ROOM_ADMIN_REVOKE: LaplaceRawEvent<BilibiliInternal.WebSocket.Prod.ROOM_ADMIN_REVOKE>
  LIVE_OPEN_PLATFORM_DM: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_DM>
  LIVE_OPEN_PLATFORM_SEND_GIFT: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_SEND_GIFT>
  LIVE_OPEN_PLATFORM_SUPER_CHAT: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_SUPER_CHAT>
  LIVE_OPEN_PLATFORM_GUARD: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_GUARD>
  LIVE_OPEN_PLATFORM_LIKE: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_LIKE>
  LIVE_OPEN_PLATFORM_LIVE_ROOM_ENTER: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_LIVE_ROOM_ENTER>
  LIVE_OPEN_PLATFORM_LIVE_START: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_LIVE_START>
  LIVE_OPEN_PLATFORM_LIVE_END: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_LIVE_END>
  LIVE_OPEN_PLATFORM_INTERACTION_END: LaplaceRawEvent<BilibiliInternal.WebSocket.OpenPlatform.LIVE_OPEN_PLATFORM_INTERACTION_END>
}

/**
 * Typed {@link EventTarget} base class for Laplace live connections.
 *
 * Provides typed `addEventListener` / `removeEventListener` via
 * {@link LiveEventMap} and a `dispatchEvent` override that emits a
 * catch-all `"event"` meta-event for every dispatched event.
 *
 * Extend this instead of `EventTarget` when building wrappers around
 * `LiveWS` / `KeepLiveWS` to inherit typed event signatures
 * automatically — no `declare` duplication required.
 *
 * @example
 * ```ts
 * import { LaplaceEventTarget, LaplaceRawEvent } from '@laplace.live/ws'
 *
 * class MyWrapper extends LaplaceEventTarget {
 *   // addEventListener is already typed — no extra `declare` needed
 * }
 * ```
 */
export class LaplaceEventTarget extends EventTarget {
  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event)
    super.dispatchEvent(new LaplaceRawEvent('event', event))
    return result
  }

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

  declare removeEventListener: {
    <K extends keyof LiveEventMap>(
      type: K,
      listener: (ev: LiveEventMap[K]) => void,
      options?: boolean | EventListenerOptions
    ): void
    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
  }
}
