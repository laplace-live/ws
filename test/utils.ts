import type { BilibiliInternal } from '@laplace.live/internal'

export const TEST_ROOM = 456117
export const TEST_LOGIN_SYNC_TOKEN = process.env.TEST_LOGIN_SYNC_TOKEN

// Uses Man'yogana
const DANMAKU_CHARS = '阿伊宇将於加幾久介己散之須世曾多千川天止奈仁怒祢乃八比不部保末三牟女猫也由與良利流礼呂和乎尓'

export function randomDanmaku(len = 4) {
  const randomChars = Array.from({ length: len }, () => DANMAKU_CHARS[Math.floor(Math.random() * DANMAKU_CHARS.length)])
  return `テスト${randomChars.join('')}`
}

/**
 * Acquire a valid authBody from the Laplace proxy, following the same
 * pattern as references/createRoomConnection.ts.
 */
export async function acquireAuthBody(roomid: number, protover: 2 | 3 = 3) {
  const url = `${process.env.TEST_AUTH_BODY_URL}/${roomid}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  const json: BilibiliInternal.HTTPS.Prod.GetDanmuInfo = await resp.json()

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
      protover,
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

/**
 * Send a danmaku message to a live room via the Laplace proxy.
 * Requires `TEST_LOGIN_SYNC_TOKEN` to be set in the environment.
 */
export async function sendDanmaku(roomId: number, content: string) {
  if (!TEST_LOGIN_SYNC_TOKEN) {
    throw new Error('TEST_LOGIN_SYNC_TOKEN is not set')
  }

  const resp = await fetch(`${process.env.TEST_LIVE_SEND_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, content, loginSyncToken: TEST_LOGIN_SYNC_TOKEN }),
  })

  const json: BilibiliInternal.HTTPS.Prod.DanmakuSend = await resp.json()

  if (json.code !== 0) {
    throw new Error(`sendDanmaku failed: ${json.message} (code: ${json.code})`)
  }

  return json
}
