import type { Agent } from 'node:http'
import { EventEmitter } from 'events'
import WS from 'ws'

import type { Inflates } from './buffer.ts'

import { Live, type LiveOptions } from './common.ts'

export type WSOptions = LiveOptions & { address?: string; agent?: Agent }

class WSWrapper extends EventEmitter {
  ws: WS

  constructor(address: string, ...args: any[]) {
    super()

    const ws = new WS(address, ...args)
    this.ws = ws

    ws.onopen = () => this.emit('open')
    ws.onmessage = ({ data }) => this.emit('message', data)
    ws.onerror = () => this.emit('error')
    ws.onclose = () => this.emit('close')
  }

  get readyState() {
    return this.ws.readyState
  }

  send(data: Buffer) {
    this.ws.send(data)
  }

  close(code?: number, data?: string) {
    this.ws.close(code, data)
  }
}

export class LiveWSBase extends Live {
  ws: WSWrapper

  constructor(
    inflates: Inflates,
    roomid: number,
    { address = 'wss://broadcastlv.chat.bilibili.com/sub', agent, ...options }: WSOptions = {}
  ) {
    const ws = new WSWrapper(address, { agent })
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
