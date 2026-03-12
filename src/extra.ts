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
 * This no longer works as bilibili rises the risk control level
 * You need to use external service to get the conf
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

export const getRoomid = async (short: number) => {
  const {
    data: { room_id },
  } = await fetch(`https://api.live.bilibili.com/room/v1/Room/mobileRoomInit?id=${short}`).then(w => w.json())
  return room_id
}
