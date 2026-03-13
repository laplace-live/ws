import type { BilibiliInternal } from '@laplace.live/internal'

export const TEST_ROOM = 5050

/**
 * Acquire a valid authBody from the Laplace proxy, following the same
 * pattern as references/createRoomConnection.ts.
 */
export async function acquireAuthBody(roomid: number) {
  const url = `https://workers.laplace.cn/bilibili/room-conn-info-v2/${roomid}`
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
