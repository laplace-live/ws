import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import type { LaplaceRawEvent } from '../src/events.ts'
import type { Live } from '../src/live.ts'
import type { WSOptions } from '../src/ws.ts'

import { acquireAuthBody, randomDanmaku, sendDanmaku, TEST_LOGIN_SYNC_TOKEN, TEST_ROOM } from './utils.ts'

type LiveWSConstructor = new (roomid: number, opts?: WSOptions) => Live
type KeepLiveWSConstructor = new (
  roomid: number,
  opts?: WSOptions
) => {
  roomid: number
  online: number
  closed: boolean
  connection: Live
  close(): void
  addEventListener<T = unknown>(
    type: string,
    listener: (event: LaplaceRawEvent<T>) => void,
    options?: boolean | AddEventListenerOptions
  ): void
}

/**
 * Shared WebSocket integration suite. Call once per entry-point (server / browser)
 * with the corresponding LiveWS and KeepLiveWS classes.
 */
export function runLiveWSSuite(label: string, LiveWS: LiveWSConstructor, KeepLiveWS: KeepLiveWSConstructor) {
  let authV3: Awaited<ReturnType<typeof acquireAuthBody>>
  let authV2: Awaited<ReturnType<typeof acquireAuthBody>>

  beforeAll(async () => {
    ;[authV3, authV2] = await Promise.all([acquireAuthBody(TEST_ROOM), acquireAuthBody(TEST_ROOM, 2)])
  })

  describe(`${label} LiveWS`, () => {
    const connections: Live[] = []

    afterAll(() => {
      for (const c of connections) {
        try {
          c.close()
        } catch {}
      }
    })

    test('should connect, receive heartbeat, msg, and getOnline', async () => {
      const live = new LiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })
      connections.push(live)

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
        live.addEventListener('live', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      expect(live.live).toBe(true)
      expect(live.roomid).toBe(TEST_ROOM)

      const heartbeat = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for heartbeat')), 4000)
        live.addEventListener('heartbeat', e => {
          clearTimeout(timer)
          resolve(e.data)
        })
      })

      expect(typeof heartbeat).toBe('number')
      expect(heartbeat).toBeGreaterThanOrEqual(0)

      const msg = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for msg')), 4000)
        live.addEventListener('msg', e => {
          clearTimeout(timer)
          resolve(e.data)
        })
      })

      expect(msg).toBeDefined()

      const online = await live.getOnline()
      expect(typeof online).toBe('number')
      expect(online).toBeGreaterThanOrEqual(0)
    })

    test('close sets closed flag and fires close event', async () => {
      const live = new LiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), 4000)
        live.addEventListener('live', () => live.close())
        live.addEventListener('close', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      expect(live.closed).toBe(true)
    })

    test('should connect, receive heartbeat, and msg with protover 2', async () => {
      const live = new LiveWS(TEST_ROOM, { address: authV2.address, authBody: authV2.authBody, protover: 2 })
      connections.push(live)

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
        live.addEventListener('live', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      expect(live.live).toBe(true)
      expect(live.roomid).toBe(TEST_ROOM)

      const heartbeat = await new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for heartbeat')), 4000)
        live.addEventListener('heartbeat', e => {
          clearTimeout(timer)
          resolve(e.data)
        })
      })

      expect(typeof heartbeat).toBe('number')
      expect(heartbeat).toBeGreaterThanOrEqual(0)

      const msg = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for msg')), 4000)
        live.addEventListener('msg', e => {
          clearTimeout(timer)
          resolve(e.data)
        })
      })

      expect(msg).toBeDefined()
    })

    test.skipIf(!TEST_LOGIN_SYNC_TOKEN)('should receive sent danmaku via WS', async () => {
      const live = new LiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })
      connections.push(live)

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
        live.addEventListener('live', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      const content = randomDanmaku()
      await sendDanmaku(TEST_ROOM, content)

      const received = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for sent danmaku')), 10000)
        live.addEventListener('msg', (e: LaplaceRawEvent<{ cmd?: string; info?: unknown[] }>) => {
          const data = e.data
          if (data.cmd === 'DANMU_MSG' && data.info?.[1] === content) {
            clearTimeout(timer)
            resolve(data.info[1])
          }
        })
      })

      expect(received).toBe(content)
    })

    test.skipIf(!TEST_LOGIN_SYNC_TOKEN)('should receive sent danmaku via WS with protover 2', async () => {
      const live = new LiveWS(TEST_ROOM, { address: authV2.address, authBody: authV2.authBody, protover: 2 })
      connections.push(live)

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
        live.addEventListener('live', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      const content = randomDanmaku()
      await sendDanmaku(TEST_ROOM, content)

      const received = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for sent danmaku')), 10000)
        live.addEventListener('msg', (e: LaplaceRawEvent<{ cmd?: string; info?: unknown[] }>) => {
          const data = e.data
          if (data.cmd === 'DANMU_MSG' && data.info?.[1] === content) {
            clearTimeout(timer)
            resolve(data.info[1])
          }
        })
      })

      expect(received).toBe(content)
    })

    test('throws for NaN roomid', () => {
      expect(() => new LiveWS(NaN)).toThrow('must be Number not NaN')
    })

    test('throws for non-number roomid', () => {
      // @ts-expect-error intentional bad input
      expect(() => new LiveWS('abc')).toThrow('must be Number not NaN')
    })
  })

  describe(`${label} KeepLiveWS`, () => {
    test('should connect and expose online/roomid', async () => {
      const keep = new KeepLiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          keep.close()
          reject(new Error('Timeout'))
        }, 4000)
        keep.addEventListener('heartbeat', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      expect(keep.roomid).toBe(TEST_ROOM)
      expect(typeof keep.online).toBe('number')

      keep.close()
      expect(keep.closed).toBe(true)
    })

    test('should reconnect after the inner connection is closed', async () => {
      const keep = new KeepLiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          keep.close()
          reject(new Error('Timeout waiting for first heartbeat'))
        }, 4000)
        keep.addEventListener('heartbeat', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      const firstConnection = keep.connection
      firstConnection.close()

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          keep.close()
          reject(new Error('Timeout waiting for reconnect heartbeat'))
        }, 8000)
        keep.addEventListener('heartbeat', () => {
          clearTimeout(timer)
          resolve()
        })
      })

      expect(keep.connection).not.toBe(firstConnection)
      expect(keep.roomid).toBe(TEST_ROOM)
      expect(typeof keep.online).toBe('number')

      keep.close()
    })
  })
}
