import net, { type Socket } from 'node:net'

import type { Inflates } from './buffer.ts'

import { DataEvent } from './events.ts'
import { Live, type LiveOptions } from './live.ts'

/**
 * Configuration options for TCP-based live connections.
 * Extends {@link LiveOptions} with optional host and port overrides.
 */
export type TCPOptions = LiveOptions & {
  /** TCP server hostname. Defaults to `broadcastlv.chat.bilibili.com`. */
  host?: string
  /** TCP server port. Defaults to `2243`. */
  port?: number
}

/**
 * TCP transport for Bilibili live room connections.
 *
 * Wraps a Node.js TCP {@link Socket}, handling packet reassembly from the
 * stream and forwarding complete frames into the {@link Live} event system.
 *
 * Not typically instantiated directly — use {@link LiveTCP} which injects
 * the Node.js inflate implementation.
 *
 * @param inflates - Platform-specific inflate/brotli decompressors.
 * @param roomid   - Numeric Bilibili live room ID.
 * @param options  - TCP host/port and authentication options.
 */
export class LiveTCPBase extends Live {
  /** The underlying Node.js TCP socket. */
  socket: Socket
  /** @internal Accumulator for incomplete packets from the TCP stream. */
  buf: Buffer
  /** @internal Counter for periodic buffer compaction. */
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

  /**
   * Extract complete packets from the internal buffer and dispatch them
   * as `message` events. Compacts the buffer periodically to avoid
   * unbounded memory growth from `Buffer.concat` / `slice` chains.
   * @internal
   */
  splitBuffer() {
    while (this.buf.length >= 4 && this.buf.readInt32BE(0) <= this.buf.length) {
      const size = this.buf.readInt32BE(0)
      const pack = this.buf.subarray(0, size)
      this.buf = this.buf.subarray(size)
      this.i++
      if (this.i > 5) {
        this.i = 0
        this.buf = Buffer.from(this.buf)
      }
      this.dispatchEvent(new DataEvent('message', pack as Uint8Array))
    }
  }
}
