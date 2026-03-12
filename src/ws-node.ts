import type { Agent } from 'node:http'
import WS from 'ws'

import type { Inflates } from './buffer.ts'

import { DataEvent, Live, type LiveOptions } from './common.ts'

export type WSOptions = LiveOptions & { address?: string; agent?: Agent }

export class LiveWSBase extends Live {
  ws: WS

  constructor(
    inflates: Inflates,
    roomid: number,
    { address = 'wss://broadcastlv.chat.bilibili.com/sub', agent, ...options }: WSOptions = {}
  ) {
    const ws = new WS(address, { agent })
    const send = (data: Uint8Array) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
    const close = () => this.ws.close()

    super(inflates, roomid, { send, close, ...options })

    ws.on('open', () => this.dispatchEvent(new Event('open')))
    ws.on('message', (data: Buffer) => this.dispatchEvent(new DataEvent('message', data as Uint8Array)))
    ws.on('close', () => this.dispatchEvent(new Event('close')))
    ws.on('error', () => this.dispatchEvent(new Event('_error')))

    this.ws = ws
  }
}
