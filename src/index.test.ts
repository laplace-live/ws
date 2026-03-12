import { afterAll, describe, expect, test } from 'bun:test'

import { encoder } from './buffer.ts'
import { DataEvent } from './common.ts'
import { getRoomid } from './extra.ts'
import { KeepLiveWS, LiveWS } from './index.ts'

const TEST_ROOM = 5050

// Response shape from the LAPLACE, mirrors BilibiliInternal.HTTPS.Prod.GetDanmuInfo
type RoomConnInfo = {
  code: number
  message: string
  data: {
    token: string
    host_list: { host: string; port: number; wss_port: number; ws_port: number }[]
    fetcher: number
    ack: string
  }
}

/**
 * Acquire a valid authBody from LAPLACE
 */
async function acquireAuthBody(roomid: number) {
  const url = `https://workers.laplace.cn/bilibili/room-conn-info-v2/${roomid}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const json: RoomConnInfo = await resp.json()

  if (!json.data) {
    throw new Error(`Failed to fetch room connection info for room ${roomid}`)
  }

  const host = json.data.host_list[0]
  const address = `wss://${host?.host}:${host?.wss_port}/sub`

  return {
    address,
    authBody: {
      uid: json.data.fetcher || 0,
      roomid,
      protover: 3,
      buvid: json.data.ack || '',
      support_ack: true,
      queue_uuid: Math.random().toString(36).slice(-8),
      scene: 'room',
      platform: 'web',
      type: 2,
      key: json.data.token || '',
    },
  }
}

// -- External service ---------------------------------------------------------

describe('acquireAuthBody', () => {
  test('should fetch valid connection info from external service', async () => {
    const { address, authBody } = await acquireAuthBody(TEST_ROOM)
    expect(address).toMatch(/^wss:\/\//)
    expect(authBody.key).toBeString()
    expect(authBody.key.length).toBeGreaterThan(0)
    expect(authBody.roomid).toBe(TEST_ROOM)
    expect(authBody.protover).toBe(3)
  })
})

describe('getRoomid', () => {
  test('should resolve a room id to a numeric value', async () => {
    const roomid = await getRoomid(TEST_ROOM)
    expect(typeof roomid).toBe('number')
    expect(roomid).toBeGreaterThan(0)
  })
})

// -- Buffer / encoder ---------------------------------------------------------

describe('encoder', () => {
  test('heartbeat produces a 16-byte header-only packet', () => {
    const buf = encoder('heartbeat')
    expect(buf).toBeInstanceOf(Uint8Array)
    expect(buf.length).toBe(16)

    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    expect(view.getInt32(0)).toBe(16)
    expect(view.getInt16(4)).toBe(16)
    expect(view.getInt32(8)).toBe(2)
  })

  test('join encodes a JSON body after the 16-byte header', () => {
    const body = { uid: 0, roomid: TEST_ROOM, protover: 3, platform: 'web', type: 2 }
    const buf = encoder('join', body)
    expect(buf).toBeInstanceOf(Uint8Array)
    expect(buf.length).toBeGreaterThan(16)

    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    expect(view.getInt32(0)).toBe(buf.length)
    expect(view.getInt16(4)).toBe(16)
    expect(view.getInt32(8)).toBe(7)

    const parsed = JSON.parse(new TextDecoder().decode(buf.slice(16)))
    expect(parsed.roomid).toBe(TEST_ROOM)
    expect(parsed.protover).toBe(3)
  })

  test('join with string body', () => {
    const buf = encoder('join', 'hello')
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
    expect(view.getInt32(8)).toBe(7)
    expect(new TextDecoder().decode(buf.slice(16))).toBe('hello')
  })
})

// -- Custom event classes -----------------------------------------------------

describe('DataEvent', () => {
  test('carries typed data on the instance', () => {
    const evt = new DataEvent('msg', { cmd: 'DANMU_MSG' })
    expect(evt.type).toBe('msg')
    expect(evt.data).toEqual({ cmd: 'DANMU_MSG' })
  })
})

// -- LiveWS integration -------------------------------------------------------

describe('LiveWS', () => {
  const connections: LiveWS[] = []

  afterAll(() => {
    for (const c of connections) {
      try {
        c.close()
      } catch {}
    }
  })

  test('should connect with authBody and fire live event', async () => {
    const { address, authBody } = await acquireAuthBody(TEST_ROOM)

    const live = new LiveWS(TEST_ROOM, { address, authBody })
    connections.push(live)

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
      live.on('live', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    expect(live.live).toBe(true)
    expect(live.roomid).toBe(TEST_ROOM)
  })

  test('should receive heartbeat with online count', async () => {
    const { address, authBody } = await acquireAuthBody(TEST_ROOM)

    const live = new LiveWS(TEST_ROOM, { address, authBody })
    connections.push(live)

    const online = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for heartbeat')), 4000)
      live.on<number>('heartbeat', e => {
        clearTimeout(timer)
        resolve(e.data)
      })
    })

    expect(typeof online).toBe('number')
    expect(online).toBeGreaterThanOrEqual(0)
  })

  test('close sets closed flag and fires close event', async () => {
    const { address, authBody } = await acquireAuthBody(TEST_ROOM)

    const live = new LiveWS(TEST_ROOM, { address, authBody })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), 4000)
      live.on('live', () => live.close())
      live.on('close', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    expect(live.closed).toBe(true)
  })

  test('getOnline() returns a number', async () => {
    const { address, authBody } = await acquireAuthBody(TEST_ROOM)

    const live = new LiveWS(TEST_ROOM, { address, authBody })
    connections.push(live)

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), 4000)
      live.on('live', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    const online = await live.getOnline()
    expect(typeof online).toBe('number')
    expect(online).toBeGreaterThanOrEqual(0)
  })
})

// -- Error handling -----------------------------------------------------------

describe('LiveWS error handling', () => {
  test('throws for NaN roomid', () => {
    expect(() => new LiveWS(NaN)).toThrow('must be Number not NaN')
  })

  test('throws for non-number roomid', () => {
    // @ts-expect-error intentional bad input
    expect(() => new LiveWS('abc')).toThrow('must be Number not NaN')
  })
})

// -- KeepLiveWS integration ---------------------------------------------------

describe('KeepLiveWS', () => {
  test('should connect and expose online/roomid', async () => {
    const { address, authBody } = await acquireAuthBody(TEST_ROOM)

    const keep = new KeepLiveWS(TEST_ROOM, { address, authBody })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        keep.close()
        reject(new Error('Timeout'))
      }, 4000)
      keep.on<number>('heartbeat', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    expect(keep.roomid).toBe(TEST_ROOM)
    expect(typeof keep.online).toBe('number')

    keep.close()
    expect(keep.closed).toBe(true)
  })
})
