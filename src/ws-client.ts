import type { Inflates } from './buffer.ts'

import { DataEvent, Live, type LiveOptions } from './common.ts'

export type WSOptions = LiveOptions & { address?: string }

export class LiveWSBase extends Live {
  ws: WebSocket

  constructor(
    inflates: Inflates,
    roomid: number,
    { address = 'wss://broadcastlv.chat.bilibili.com/sub', ...options }: WSOptions = {}
  ) {
    const ws = new WebSocket(address)
    const send = (data: Uint8Array) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
    const close = () => this.ws.close()

    super(inflates, roomid, { send, close, ...options })

    ws.binaryType = 'arraybuffer'
    ws.addEventListener('open', e => this.dispatchEvent(new Event(e.type)))
    ws.addEventListener('message', e =>
      this.dispatchEvent(new DataEvent('message', new Uint8Array(e.data as ArrayBuffer)))
    )
    ws.addEventListener('close', e => this.dispatchEvent(new Event(e.type)))
    ws.addEventListener('error', () => this.dispatchEvent(new Event('_error')))

    this.ws = ws
  }
}
