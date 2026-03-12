type GET_DANMU_INFO = {
  code: number
  message: string
  ttl: number
  data: {
    business_id: number
    group: string
    host_list: {
      host: string
      port: number
      wss_port: number
      ws_port: number
    }[]
    max_delay: number
    refresh_rate: number
    refresh_row_factor: number
    token: string
  }
}

/**
 * Fetch WebSocket connection configuration for a Bilibili live room directly
 * from the Bilibili API (`getDanmuInfo`).
 *
 * **Note:** This endpoint is subject to Bilibili's risk-control system and
 * may return error code `-352` when called without proper cookies or headers.
 * For production use, consider proxying through an external service that
 * handles authentication.
 *
 * @param roomid - Numeric Bilibili live room ID.
 * @returns An object containing:
 *   - `key` — authentication token for the WebSocket handshake
 *   - `host` — hostname of the danmaku WebSocket server
 *   - `address` — full `wss://` URL ready to pass as `WSOptions.address`
 *   - `raw` — the complete API response for advanced use
 * @throws {Error} If the API returns no data (e.g. invalid room or risk-control block).
 */
export const getConf = async (roomid: number) => {
  const raw = (await fetch(`https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo?id=${roomid}`).then(w =>
    w.json()
  )) as GET_DANMU_INFO
  if (!raw.data) {
    throw new Error(`getConf failed for room ${roomid}: ${raw.message || 'no data'} (code: ${raw.code})`)
  }
  const {
    data: {
      token: key,
      host_list: [{ host }],
    },
  } = raw
  const address = `wss://${host}/sub`
  return { key, host, address, raw }
}

/**
 * Resolve a short (vanity) room ID to its real numeric room ID via the
 * Bilibili API.
 *
 * Short room IDs are custom aliases (e.g. `1`) that map to longer numeric
 * IDs used internally by the live platform.
 *
 * @param short - The short or numeric room ID to resolve.
 * @returns The canonical numeric room ID.
 */
export const getRoomid = async (short: number) => {
  const {
    data: { room_id },
  } = await fetch(`https://api.live.bilibili.com/room/v1/Room/mobileRoomInit?id=${short}`).then(w => w.json())
  return room_id
}
