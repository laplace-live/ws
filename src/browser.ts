import { KeepLive } from './common.ts'
import { inflates } from './inflate/browser.ts'
import { LiveWSBase, type WSOptions } from './ws-client.ts'

export type { LiveOptions } from './common.ts'
export type { WSOptions } from './ws-client.ts'

export { DataEvent, EventEvent } from './common.ts'

export class LiveWS extends LiveWSBase {
  constructor(roomid: number, opts?: WSOptions) {
    super(inflates, roomid, opts)
  }
}

export class KeepLiveWS extends KeepLive<typeof LiveWSBase> {
  constructor(roomid: number, opts?: WSOptions) {
    super(LiveWSBase, inflates, roomid, opts)
  }
}
