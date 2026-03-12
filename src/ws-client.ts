import { EventEmitter } from 'events'

import type { Inflates } from './buffer.ts'

import { Live, type LiveOptions } from './common.ts'

export type WSOptions = LiveOptions & { address?: string }

class WSWrapper extends EventEmitter {
  ws: WebSocket

  constructor(address: string, inflates: Inflates) {
    super()

    const ws = new WebSocket(address)
    this.ws = ws

    ws.binaryType = 'arraybuffer'
    ws.onopen = () => this.emit('open')
    ws.onmessage = ({ data }) => this.emit('message', inflates.Buffer.from(data as ArrayBuffer))
    ws.onerror = () => this.emit('error')
    ws.onclose = () => this.emit('close')
  }

  get readyState() {
    return this.ws.readyState
  }

  send(data: Buffer) {
    this.ws.send(data)
  }

  close(code?: number, reason?: string) {
    this.ws.close(code, reason)
  }
}

export class LiveWSBase extends Live {
  ws: WSWrapper

  constructor(
    inflates: Inflates,
    roomid: number,
    { address = 'wss://broadcastlv.chat.bilibili.com/sub', ...options }: WSOptions = {}
  ) {
    const ws = new WSWrapper(address, inflates)
    const send = (data: Buffer) => {
      if (ws.readyState === 1) {
        ws.send(data)
      }
    }
    const close = () => this.ws.close()

    super(inflates, roomid, { send, close, ...options })

    ws.on('open', (...params) => this.emit('open', ...params))
    ws.on('message', data => this.emit('message', data as Buffer))
    ws.on('close', (code, reason) => this.emit('close', code, reason))
    ws.on('error', error => this.emit('_error', error))

    this.ws = ws
  }
}
