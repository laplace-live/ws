import { describe, expect, test } from 'bun:test'
import { brotliCompressSync, deflateSync } from 'node:zlib'

import { encoder, makeDecoder } from '../src/buffer.ts'
import { inflates } from '../src/inflate/node.ts'
import { BROTLI_DANMU_MSG_HEX, ZLIB_DANMU_MSG_HEX } from './const.ts'

const textEncoder = new TextEncoder()

/**
 * Build a raw Bilibili live protocol packet from parts.
 *
 * Header layout (16 bytes, big-endian):
 *   [0–3]  total length  |  [4–5] header len (16)
 *   [6–7]  protocol ver  |  [8–11] operation
 *   [12–15] sequence id (1)
 */
function buildPacket(protocol: number, operation: number, body: Uint8Array): Uint8Array {
  const total = 16 + body.length
  const packet = new Uint8Array(total)
  const view = new DataView(packet.buffer)
  view.setInt32(0, total)
  view.setInt16(4, 16)
  view.setInt16(6, protocol)
  view.setInt32(8, operation)
  view.setInt32(12, 1)
  packet.set(body, 16)
  return packet
}

function jsonBody(obj: unknown): Uint8Array {
  return textEncoder.encode(JSON.stringify(obj))
}

function heartbeatBody(count: number): Uint8Array {
  const buf = new Uint8Array(4)
  new DataView(buf.buffer).setUint32(0, count)
  return buf
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  let len = 0
  for (const a of arrays) len += a.length
  const result = new Uint8Array(len)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

const decode = makeDecoder(inflates)

// -----------------------------------------------------------------------------

describe('makeDecoder', () => {
  test('protocol 0 — JSON message', async () => {
    const payload = { cmd: 'DANMU_MSG', msg_id: 42 }
    const packet = buildPacket(0, 5, jsonBody(payload))
    const packs = await decode(packet)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('message')
    expect(packs[0].protocol).toBe(0)
    expect(packs[0].data).toEqual(payload)
  })

  test('protocol 0 — welcome (operation 8)', async () => {
    const payload = { code: 0 }
    const packet = buildPacket(0, 8, jsonBody(payload))
    const packs = await decode(packet)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('welcome')
    expect(packs[0].data).toEqual(payload)
  })

  test('protocol 1 — heartbeat response with viewer count', async () => {
    const count = 123456
    const packet = buildPacket(1, 3, heartbeatBody(count))
    const packs = await decode(packet)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('heartbeat')
    expect(packs[0].protocol).toBe(1)
    expect(packs[0].data).toBe(count)
  })

  test('protocol 2 — zlib-compressed JSON message', async () => {
    const payload = { cmd: 'SEND_GIFT', giftName: 'test' }
    const inner = buildPacket(0, 5, jsonBody(payload))
    const compressed = deflateSync(inner)
    const outer = buildPacket(2, 5, compressed)
    const packs = await decode(outer)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('message')
    expect(packs[0].data).toEqual(payload)
  })

  test('protocol 3 — brotli-compressed JSON message', async () => {
    const payload = { cmd: 'SUPER_CHAT_MESSAGE', message: 'hello' }
    const inner = buildPacket(0, 5, jsonBody(payload))
    const compressed = brotliCompressSync(inner)
    const outer = buildPacket(3, 5, compressed)
    const packs = await decode(outer)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('message')
    expect(packs[0].data).toEqual(payload)
  })

  test('protocol 3 — real server brotli DANMU_MSG with "test v3"', async () => {
    const buf = new Uint8Array(Buffer.from(BROTLI_DANMU_MSG_HEX, 'hex'))
    const packs = await decode(buf)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('message')
    expect(packs[0].protocol).toBe(0)
    expect(packs[0].data.cmd).toBe('DANMU_MSG')
    expect(packs[0].data.info[1]).toBe('test v3')
  })

  test('protocol 2 — real server zlib DANMU_MSG with "test v2"', async () => {
    const buf = new Uint8Array(Buffer.from(ZLIB_DANMU_MSG_HEX, 'hex'))
    const packs = await decode(buf)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('message')
    expect(packs[0].protocol).toBe(0)
    expect(packs[0].data.cmd).toBe('DANMU_MSG')
    expect(packs[0].data.info[1]).toBe('test v2')
  })

  test('unknown operation keeps type as "unknow"', async () => {
    const packet = buildPacket(0, 99, jsonBody({ x: 1 }))
    const packs = await decode(packet)

    expect(packs).toHaveLength(1)
    expect(packs[0].type).toBe('unknow')
  })

  test('multiple concatenated packets decoded in order', async () => {
    const heartbeat = buildPacket(1, 3, heartbeatBody(100))
    const message = buildPacket(0, 5, jsonBody({ cmd: 'TEST' }))
    const packs = await decode(concat(heartbeat, message))

    expect(packs).toHaveLength(2)
    expect(packs[0].type).toBe('heartbeat')
    expect(packs[0].data).toBe(100)
    expect(packs[1].type).toBe('message')
    expect(packs[1].data).toEqual({ cmd: 'TEST' })
  })

  test('compressed frame containing multiple inner packets', async () => {
    const msg1 = buildPacket(0, 5, jsonBody({ cmd: 'A' }))
    const msg2 = buildPacket(0, 5, jsonBody({ cmd: 'B' }))
    const inner = concat(msg1, msg2)
    const compressed = deflateSync(inner)
    const outer = buildPacket(2, 5, compressed)
    const packs = await decode(outer)

    expect(packs).toHaveLength(2)
    expect(packs[0].data).toEqual({ cmd: 'A' })
    expect(packs[1].data).toEqual({ cmd: 'B' })
  })
})

// -----------------------------------------------------------------------------

describe('encoder ↔ decoder round-trip', () => {
  test('heartbeat packet round-trips through decoder', async () => {
    const encoded = encoder('heartbeat')
    const packs = await decode(encoded)

    expect(packs).toHaveLength(1)
    expect(packs[0].protocol).toBe(1)
  })

  test('join packet round-trips through decoder', async () => {
    const body = { uid: 0, roomid: 12345, protover: 3 }
    const encoded = encoder('join', body)
    const packs = await decode(encoded)

    expect(packs).toHaveLength(1)
    expect(packs[0].protocol).toBe(1)
  })
})
