import { KeepLive } from './common.ts'
import { inflates } from './inflate/node.ts'
import { LiveTCPBase, type TCPOptions } from './tcp.ts'
import { LiveWSBase, type WSOptions } from './ws-node.ts'

export type { LiveOptions } from './common.ts'
export type { TCPOptions } from './tcp.ts'
export type { WSOptions } from './ws-node.ts'

export { relayEvent } from './common.ts'
export { getConf, getRoomid } from './extra.ts'

export class LiveWS extends LiveWSBase {
  constructor(roomid: number, opts?: WSOptions) {
    super(inflates, roomid, opts)
  }
}

export class LiveTCP extends LiveTCPBase {
  constructor(roomid: number, opts?: TCPOptions) {
    super(inflates, roomid, opts)
  }
}

export class KeepLiveWS extends KeepLive<typeof LiveWSBase> {
  constructor(roomid: number, opts?: WSOptions) {
    super(LiveWSBase, inflates, roomid, opts)
  }
}

export class KeepLiveTCP extends KeepLive<typeof LiveTCPBase> {
  constructor(roomid: number, opts?: TCPOptions) {
    super(LiveTCPBase, inflates, roomid, opts)
  }
}
