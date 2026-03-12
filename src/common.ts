import { encoder, type Inflates, makeDecoder } from './buffer.ts'

export type LiveOptions = {
  protover?: 1 | 2 | 3
  key?: string
  authBody?: Uint8Array | Record<string, unknown>
  uid?: number
  buvid?: string
}

export class DataEvent<T> extends Event {
  data: T
  constructor(type: string, data: T) {
    super(type)
    this.data = data
  }
}

export class EventEvent extends Event {
  event: Event
  constructor(event: Event) {
    super('event')
    this.event = event
  }
}

export class Live extends EventTarget {
  roomid: number
  online: number
  live: boolean
  closed: boolean
  timeout: ReturnType<typeof setTimeout>

  send: (data: Uint8Array) => void
  close: () => void

  constructor(
    inflates: Inflates,
    roomid: number,
    {
      send,
      close,
      protover = 3,
      key,
      authBody,
      uid = 0,
      buvid,
    }: { send: (data: Uint8Array) => void; close: () => void } & LiveOptions
  ) {
    if (typeof roomid !== 'number' || Number.isNaN(roomid)) {
      throw new Error(`roomid ${roomid} must be Number not NaN`)
    }

    super()
    this.roomid = roomid
    this.online = 0
    this.live = false
    this.closed = false
    this.timeout = setTimeout(() => {}, 0)

    this.send = send
    this.close = () => {
      this.closed = true
      close()
    }

    const decode = makeDecoder(inflates)

    this.addEventListener('message', async e => {
      const buffer = (e as DataEvent<Uint8Array>).data
      const packs = await decode(buffer)
      packs.forEach(({ type, data }) => {
        if (type === 'welcome') {
          this.live = true
          this.dispatchEvent(new Event('live'))
          this.send(encoder('heartbeat'))
        }
        if (type === 'heartbeat') {
          this.online = data
          clearTimeout(this.timeout)
          this.timeout = setTimeout(() => this.heartbeat(), 1000 * 30)
          this.dispatchEvent(new DataEvent('heartbeat', this.online))
        }
        if (type === 'message') {
          this.dispatchEvent(new DataEvent('msg', data))
          const cmd = data.cmd || data.msg?.cmd
          if (cmd) {
            if (cmd.includes('DANMU_MSG')) {
              this.dispatchEvent(new DataEvent('DANMU_MSG', data))
            } else {
              this.dispatchEvent(new DataEvent(cmd, data))
            }
          }
        }
      })
    })

    this.addEventListener('open', () => {
      if (authBody) {
        this.send(authBody instanceof Uint8Array ? authBody : encoder('join', authBody))
      } else {
        const hi: {
          uid: number
          roomid: number
          protover: number
          platform: string
          type: number
          key?: string
          buvid?: string
        } = { uid: uid, roomid, protover, platform: 'web', type: 2 }
        if (key) {
          hi.key = key
        }
        if (buvid) {
          hi.buvid = buvid
        }
        const buf = encoder('join', hi)
        this.send(buf)
      }
    })

    this.addEventListener('close', () => {
      clearTimeout(this.timeout)
    })

    this.addEventListener('_error', () => {
      this.close()
      this.dispatchEvent(new Event('error'))
    })
  }

  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event)
    super.dispatchEvent(new EventEvent(event))
    return result
  }

  heartbeat() {
    this.send(encoder('heartbeat'))
  }

  getOnline() {
    this.heartbeat()
    return new Promise<number>(resolve =>
      this.addEventListener('heartbeat', e => resolve((e as DataEvent<number>).data), { once: true })
    )
  }

  on<T = unknown>(
    type: string,
    listener: (event: DataEvent<T>) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.addEventListener(type, listener as EventListener, options)
  }

  off<T = unknown>(
    type: string,
    listener: (event: DataEvent<T>) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.removeEventListener(type, listener as EventListener, options)
  }
}

export class KeepLive<Base extends typeof Live> extends EventTarget {
  params: ConstructorParameters<Base>
  closed: boolean
  interval: number
  timeout: number
  connection: InstanceType<Base>
  Base: Base

  constructor(Base: Base, ...params: ConstructorParameters<Base>) {
    super()
    this.params = params
    this.closed = false
    this.interval = 100
    this.timeout = 45 * 1000
    this.connection = new (Base as any)(...this.params)
    this.Base = Base
    this.connect(false)
  }

  dispatchEvent(event: Event): boolean {
    const result = super.dispatchEvent(event)
    super.dispatchEvent(new EventEvent(event))
    return result
  }

  connect(reconnect = true) {
    if (reconnect) {
      this.connection.close()
      this.connection = new (this.Base as any)(...this.params)
    }
    const connection = this.connection

    let timeout = setTimeout(() => {
      connection.close()
      connection.dispatchEvent(new Event('timeout'))
    }, this.timeout)

    connection.addEventListener('event', e => {
      const evt = (e as EventEvent).event
      if (evt.type !== 'error') {
        if (evt instanceof DataEvent) {
          this.dispatchEvent(new DataEvent(evt.type, evt.data))
        } else {
          this.dispatchEvent(new Event(evt.type))
        }
      }
    })

    connection.addEventListener('error', () => this.dispatchEvent(new Event('e')))
    connection.addEventListener('close', () => {
      if (!this.closed) {
        setTimeout(() => this.connect(), this.interval)
      }
    })

    connection.addEventListener('heartbeat', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        connection.close()
        connection.dispatchEvent(new Event('timeout'))
      }, this.timeout)
    })

    connection.addEventListener('close', () => {
      clearTimeout(timeout)
    })
  }

  get online() {
    return this.connection.online
  }

  get roomid() {
    return this.connection.roomid
  }

  close() {
    this.closed = true
    this.connection.close()
  }

  heartbeat() {
    return this.connection.heartbeat()
  }

  getOnline() {
    return this.connection.getOnline()
  }

  send(data: Uint8Array) {
    return this.connection.send(data)
  }

  on<T = unknown>(
    type: string,
    listener: (event: DataEvent<T>) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.addEventListener(type, listener as EventListener, options)
  }

  off<T = unknown>(
    type: string,
    listener: (event: DataEvent<T>) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.removeEventListener(type, listener as EventListener, options)
  }
}
