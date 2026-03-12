import { describe, expect, test } from 'bun:test'

import { encoder } from '../src/buffer.ts'
import { LaplaceRawEvent } from '../src/events.ts'
import { getRoomid } from '../src/extra.ts'
import { KeepLiveWS, LiveWS } from '../src/index.ts'
import { runLiveWSSuite } from './suite.ts'
import { acquireAuthBody, TEST_ROOM } from './utils.ts'

// -- Shared WebSocket integration suite (server / node:zlib path) -------------

runLiveWSSuite('server', LiveWS, KeepLiveWS)

// -- Server-only: external helpers --------------------------------------------

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

// -- Server-only: encoder -----------------------------------------------------

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

// -- Server-only: LaplaceRawEvent ---------------------------------------------------

describe('LaplaceRawEvent', () => {
  test('carries typed data on the instance', () => {
    const evt = new LaplaceRawEvent('msg', { cmd: 'DANMU_MSG' })
    expect(evt.type).toBe('msg')
    expect(evt.data).toEqual({ cmd: 'DANMU_MSG' })
  })
})
