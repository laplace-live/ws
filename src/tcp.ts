import net, { type Socket } from 'node:net'

import type { Inflates } from './buffer.ts'

import { DataEvent, Live, type LiveOptions } from './common.ts'

export type TCPOptions = LiveOptions & { host?: string; port?: number }

export class LiveTCPBase extends Live {
  socket: Socket
  buf: Buffer
  i: number

  constructor(
    inflates: Inflates,
    roomid: number,
    { host = 'broadcastlv.chat.bilibili.com', port = 2243, ...options }: TCPOptions = {}
  ) {
    const socket = net.connect(port, host)
    const send = (data: Uint8Array) => {
      socket.write(data)
    }
    const close = () => this.socket.end()

    super(inflates, roomid, { send, close, ...options })

    this.i = 0
    this.buf = Buffer.alloc(0)

    socket.on('ready', () => this.dispatchEvent(new Event('open')))
    socket.on('close', () => this.dispatchEvent(new Event('close')))
    socket.on('error', () => this.dispatchEvent(new Event('_error')))
    socket.on('data', buffer => {
      this.buf = Buffer.concat([this.buf, buffer])
      this.splitBuffer()
    })
    this.socket = socket
  }

  splitBuffer() {
    while (this.buf.length >= 4 && this.buf.readInt32BE(0) <= this.buf.length) {
      const size = this.buf.readInt32BE(0)
      const pack = this.buf.slice(0, size)
      this.buf = this.buf.slice(size)
      this.i++
      if (this.i > 5) {
        this.i = 0
        this.buf = Buffer.from(this.buf)
      }
      this.dispatchEvent(new DataEvent('message', pack as Uint8Array))
    }
  }
}
