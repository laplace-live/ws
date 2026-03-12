import { describe, expect, it } from 'bun:test'

import { KeepLiveWS as KeepLiveWSBrowser, LiveWS as LiveWSBrowser } from './browser.ts'
import { getConf, getRoomid, KeepLiveTCP, KeepLiveWS, LiveTCP, LiveWS } from './index.ts'

const TIMEOUT = 1000 * 25

function onceLive(
  live: { on(type: string, listener: () => void, options?: AddEventListenerOptions): void },
  event: string
): Promise<void> {
  return new Promise(resolve => live.on(event, () => resolve(), { once: true }))
}

function onceHeartbeat(live: {
  on<T>(type: string, listener: (e: { data: T }) => void, options?: AddEventListenerOptions): void
}): Promise<number> {
  return new Promise(resolve => live.on<number>('heartbeat', e => resolve(e.data), { once: true }))
}

const watch = (
  live:
    | LiveWS
    | LiveTCP
    | KeepLiveWS
    | KeepLiveTCP
    | InstanceType<typeof LiveWSBrowser>
    | InstanceType<typeof KeepLiveWSBrowser>
) =>
  setTimeout(() => {
    if (!live.closed) {
      live.close()
    }
  }, TIMEOUT)

describe('extra', () => {
  it('getRoomid', async () => {
    const roomid = await getRoomid(255)
    expect(roomid).toBe(48743)
  })
})

Object.entries({
  LiveWS,
  LiveTCP,
  KeepLiveWS,
  KeepLiveTCP,
  LiveWSBrowser,
  KeepLiveWSBrowser,
}).forEach(([name, Live]) => {
  describe(name, () => {
    describe('Connect', () => {
      it('online', async () => {
        const live = new Live(12235923)
        watch(live)
        const online = await onceHeartbeat(live)
        live.close()
        expect(online).toBeGreaterThan(0)
      })
      it('roomid must be number', () => {
        expect(() => new (Live as any)('12235923')).toThrow()
      })
      it('roomid can not be NaN', () => {
        expect(() => new (Live as any)(NaN)).toThrow()
      })
    })
    describe('properties', () => {
      describe('roomid', () => {
        Object.entries({
          Mea: 12235923,
          nana: 21304638,
          fubuki: 11588230,
        }).forEach(([roomName, roomid]) => {
          it(`roomid ${roomName}`, async () => {
            const live = new Live(roomid)
            watch(live)
            await onceLive(live, 'live')
            live.close()
            expect(live.roomid).toBe(roomid)
          })
        })
      })
      it('online', async () => {
        const live = new Live(12235923)
        watch(live)
        const online = await onceHeartbeat(live)
        live.close()
        expect(online).toBe(live.online)
      })
      it('closed', async () => {
        const live = new Live(12235923)
        watch(live)
        expect(live.closed).toBe(false)
        await onceLive(live, 'live')
        live.close()
        expect(live.closed).toBe(true)
      })
    })
    describe('functions', () => {
      it('close', async () => {
        const live = new Live(12235923)
        watch(live)
        await onceHeartbeat(live)
        const close = await new Promise(resolve => {
          live.on('close', () => resolve('closed'))
          live.close()
        })
        expect(close).toBe('closed')
      })
      it('getOnline', async () => {
        const live = new Live(12235923)
        watch(live)
        await onceLive(live, 'live')
        const online = await live.getOnline()
        live.close()
        expect(online).toBeGreaterThan(0)
      })
      if (name.includes('Keep')) {
        it('no error relay', async () => {
          const live = new Live(12235923) as KeepLiveWS | KeepLiveTCP
          watch(live)
          await onceLive(live, 'live')
          await new Promise<void>((resolve, reject) => {
            live.on('error', () => reject(), { once: true })
            live.connection.dispatchEvent(new Event('error'))
            setTimeout(resolve, 1000)
          })
          live.close()
        })
      }
      if (name.includes('Keep')) {
        it('close and reopen', async () => {
          const live = new Live(12235923) as KeepLiveWS | KeepLiveTCP
          watch(live)
          await onceLive(live, 'live')
          live.connection.close()
          await onceLive(live, 'live')
          live.close()
        })
      } else {
        it('close on error', async () => {
          const live = new Live(12235923)
          watch(live)
          await onceHeartbeat(live)
          const close = await new Promise(resolve => {
            live.on('close', () => resolve('closed'))
            live.on('error', () => {})
            live.dispatchEvent(new Event('_error'))
          })
          expect(close).toBe('closed')
        })
      }
    })
    describe('options', () => {
      it('protover: 1', async () => {
        const live = new Live(12235923, { protover: 1 })
        watch(live)
        const online = await onceHeartbeat(live)
        live.close()
        expect(online).toBeGreaterThan(0)
      })
      it('protover: 3', async () => {
        const live = new Live(12235923, { protover: 3 })
        watch(live)
        const online = await onceHeartbeat(live)
        live.close()
        expect(online).toBeGreaterThan(0)
      })
      if (name.includes('WS')) {
        it('address', async () => {
          const L = Live as typeof LiveWS | typeof KeepLiveWS
          const live = new L(12235923, {
            address: 'wss://broadcastlv.chat.bilibili.com/sub',
          })
          watch(live)
          const online = await onceHeartbeat(live)
          live.close()
          expect(online).toBeGreaterThan(0)
        })
      } else if (name.includes('TCP')) {
        it('host, port', async () => {
          const live = new Live(12235923, {
            host: 'broadcastlv.chat.bilibili.com',
            port: 2243,
          })
          watch(live)
          const online = await onceHeartbeat(live)
          live.close()
          expect(online).toBeGreaterThan(0)
        })
      } else {
        throw new Error('no options test')
      }
      it('key: token', async () => {
        const { key, host, address } = await getConf(12235923)
        const live = new Live(12235923, { key, host, address })
        watch(live)
        const online = await onceHeartbeat(live)
        live.close()
        expect(online).toBeGreaterThan(0)
      })
    })
  })
})
