import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import type { LaplaceRawEvent } from '../src/events.ts'
import type { Live } from '../src/live.ts'
import type { WSOptions } from '../src/ws.ts'

import { acquireAuthBody, randomDanmaku, sendDanmaku, TEST_LOGIN_SYNC_TOKEN, TEST_ROOM } from './utils.ts'

const BASE_TIMEOUT = Number(process.env.TEST_TIMEOUT) || 10000

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

    test(
      'should connect, receive heartbeat, msg, and getOnline',
      async () => {
        const live = new LiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })
        connections.push(live)

        await new Promise<void>(resolve => {
          live.addEventListener('live', () => resolve())
        })

        expect(live.live).toBe(true)
        expect(live.roomid).toBe(TEST_ROOM)

        const heartbeat = await new Promise<number>(resolve => {
          live.addEventListener('heartbeat', e => resolve(e.data))
        })

        expect(typeof heartbeat).toBe('number')
        expect(heartbeat).toBeGreaterThanOrEqual(0)

        const msg = await new Promise<unknown>(resolve => {
          live.addEventListener('msg', e => resolve(e.data))
        })

        expect(msg).toBeDefined()

        const online = await live.getOnline()
        expect(typeof online).toBe('number')
        expect(online).toBeGreaterThanOrEqual(0)
      },
      BASE_TIMEOUT * 2
    )

    test(
      'close sets closed flag and fires close event',
      async () => {
        const live = new LiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })

        await new Promise<void>(resolve => {
          live.addEventListener('live', () => live.close())
          live.addEventListener('close', () => resolve())
        })

        expect(live.closed).toBe(true)
      },
      BASE_TIMEOUT
    )

    test(
      'should connect, receive heartbeat, and msg with protover 2',
      async () => {
        const live = new LiveWS(TEST_ROOM, { address: authV2.address, authBody: authV2.authBody, protover: 2 })
        connections.push(live)

        await new Promise<void>(resolve => {
          live.addEventListener('live', () => resolve())
        })

        expect(live.live).toBe(true)
        expect(live.roomid).toBe(TEST_ROOM)

        const heartbeat = await new Promise<number>(resolve => {
          live.addEventListener('heartbeat', e => resolve(e.data))
        })

        expect(typeof heartbeat).toBe('number')
        expect(heartbeat).toBeGreaterThanOrEqual(0)

        const msg = await new Promise<unknown>(resolve => {
          live.addEventListener('msg', e => resolve(e.data))
        })

        expect(msg).toBeDefined()
      },
      BASE_TIMEOUT * 2
    )

    test.skipIf(!TEST_LOGIN_SYNC_TOKEN)(
      'should receive sent danmaku via WS',
      async () => {
        const live = new LiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })
        connections.push(live)

        await new Promise<void>(resolve => {
          live.addEventListener('live', () => resolve())
        })

        const content = randomDanmaku()
        await sendDanmaku(TEST_ROOM, content)

        const received = await new Promise<string>(resolve => {
          live.addEventListener('msg', (e: LaplaceRawEvent<{ cmd?: string; info?: unknown[] }>) => {
            const data = e.data
            if (data.cmd === 'DANMU_MSG' && data.info?.[1] === content) {
              resolve(data.info[1])
            }
          })
        })

        expect(received).toBe(content)
      },
      BASE_TIMEOUT * 2
    )

    test.skipIf(!TEST_LOGIN_SYNC_TOKEN)(
      'should receive sent danmaku via WS with protover 2',
      async () => {
        const live = new LiveWS(TEST_ROOM, { address: authV2.address, authBody: authV2.authBody, protover: 2 })
        connections.push(live)

        await new Promise<void>(resolve => {
          live.addEventListener('live', () => resolve())
        })

        const content = randomDanmaku()
        await sendDanmaku(TEST_ROOM, content)

        const received = await new Promise<string>(resolve => {
          live.addEventListener('msg', (e: LaplaceRawEvent<{ cmd?: string; info?: unknown[] }>) => {
            const data = e.data
            if (data.cmd === 'DANMU_MSG' && data.info?.[1] === content) {
              resolve(data.info[1])
            }
          })
        })

        expect(received).toBe(content)
      },
      BASE_TIMEOUT * 2
    )

    test('throws for NaN roomid', () => {
      expect(() => new LiveWS(NaN)).toThrow('must be Number not NaN')
    })

    test('throws for non-number roomid', () => {
      // @ts-expect-error intentional bad input
      expect(() => new LiveWS('abc')).toThrow('must be Number not NaN')
    })
  })

  describe(`${label} KeepLiveWS`, () => {
    test(
      'should connect and expose online/roomid',
      async () => {
        const keep = new KeepLiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })

        await new Promise<void>(resolve => {
          keep.addEventListener('heartbeat', () => resolve())
        })

        expect(keep.roomid).toBe(TEST_ROOM)
        expect(typeof keep.online).toBe('number')

        keep.close()
        expect(keep.closed).toBe(true)
      },
      BASE_TIMEOUT
    )

    test(
      'should reconnect after the inner connection is closed',
      async () => {
        const keep = new KeepLiveWS(TEST_ROOM, { address: authV3.address, authBody: authV3.authBody })

        await new Promise<void>(resolve => {
          keep.addEventListener('heartbeat', () => resolve())
        })

        const firstConnection = keep.connection
        firstConnection.close()

        await new Promise<void>(resolve => {
          keep.addEventListener('heartbeat', () => resolve())
        })

        expect(keep.connection).not.toBe(firstConnection)
        expect(keep.roomid).toBe(TEST_ROOM)
        expect(typeof keep.online).toBe('number')

        keep.close()
      },
      BASE_TIMEOUT * 2
    )
  })
}
