/**
 * Real-browser integration tests via Playwright.
 *
 * Bundles src/browser.ts with Bun.build(), serves it over a local HTTP server,
 * loads it in headless Chromium, and runs the full LiveWS / KeepLiveWS suite
 * inside the browser context via page.evaluate().
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { type Browser, chromium, type Page } from 'playwright'

import { acquireAuthBody, randomDanmaku, sendDanmaku, TEST_LOGIN_SYNC_TOKEN, TEST_ROOM } from './utils.ts'

interface BrowserLive {
  live: boolean
  roomid: number
  closed: boolean
  close(): void
  getOnline(): Promise<number>
  // biome-ignore lint/suspicious/noExplicitAny: server payloads are dynamic
  addEventListener(type: string, listener: (e: { data: any }) => void): void
}

interface BrowserKeepLive extends BrowserLive {
  online: number
  connection: BrowserLive
}

declare global {
  interface Window {
    LiveWS: new (roomid: number, opts?: Record<string, unknown>) => BrowserLive
    KeepLiveWS: new (roomid: number, opts?: Record<string, unknown>) => BrowserKeepLive
    __ready: boolean
    __testMsgs: { cmd?: string; info?: unknown[] }[]
    __testLive: BrowserLive
  }
}

let browser: Browser
let page: Page
let server: ReturnType<typeof Bun.serve>

let authV3: Awaited<ReturnType<typeof acquireAuthBody>>
let authV2: Awaited<ReturnType<typeof acquireAuthBody>>

beforeAll(async () => {
  const [buildResult, a3, a2] = await Promise.all([
    Bun.build({
      entrypoints: ['src/browser.ts'],
      target: 'browser',
      format: 'esm',
      outdir: 'test/.browser-e2e-dist',
    }),
    acquireAuthBody(TEST_ROOM),
    acquireAuthBody(TEST_ROOM, 2),
  ])

  if (!buildResult.success) {
    throw new Error(`Bun.build failed: ${buildResult.logs.join('\n')}`)
  }

  authV3 = a3
  authV2 = a2

  const html = await Bun.file('test/browser-e2e.html').text()
  const bundleJs = await Bun.file('test/.browser-e2e-dist/browser.js').text()

  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      if (url.pathname === '/bundle.js') {
        return new Response(bundleJs, { headers: { 'Content-Type': 'application/javascript' } })
      }
      return new Response(html, { headers: { 'Content-Type': 'text/html' } })
    },
  })

  browser = await chromium.launch()
  page = await browser.newPage()
  page.on('console', msg => {
    const type = msg.type()
    const prefix = `[browser${type === 'log' ? '' : ` ${type}`}]`
    console.log(prefix, msg.text())
  })
  await page.goto(`http://localhost:${server.port}`)
  await page.waitForFunction(() => window.__ready === true)
})

afterAll(async () => {
  await browser?.close()
  server?.stop()
})

// -- LiveWS (protover 3, brotli) — shared connection --------------------------

describe('browser LiveWS', () => {
  test('should connect, receive heartbeat, msg, and getOnline', async () => {
    const result = await page.evaluate(
      async ({ address, authBody, roomid }) => {
        const live = new window.LiveWS(roomid, { address, authBody })
        try {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
            live.addEventListener('live', () => {
              console.log('live event fired, roomid:', live.roomid)
              clearTimeout(timer)
              resolve()
            })
          })

          const heartbeat = await new Promise<number>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting for heartbeat')), 4000)
            live.addEventListener('heartbeat', e => {
              console.log('heartbeat received, online:', e.data)
              clearTimeout(timer)
              resolve(e.data)
            })
          })

          const msg = await new Promise<{ cmd?: string }>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting for msg')), 4000)
            live.addEventListener('msg', e => {
              console.log('msg received, cmd:', e.data?.cmd)
              clearTimeout(timer)
              resolve(e.data)
            })
          })

          const online = await live.getOnline()
          console.log('getOnline() returned:', online)

          return {
            liveFlag: live.live,
            roomid: live.roomid,
            heartbeat,
            msgCmd: msg.cmd,
            online,
          }
        } finally {
          live.close()
        }
      },
      { address: authV3.address, authBody: authV3.authBody, roomid: TEST_ROOM }
    )

    expect(result.liveFlag).toBe(true)
    expect(result.roomid).toBe(TEST_ROOM)
    expect(typeof result.heartbeat).toBe('number')
    expect(result.heartbeat).toBeGreaterThanOrEqual(0)
    expect(result.msgCmd).toBeDefined()
    expect(typeof result.online).toBe('number')
    expect(result.online).toBeGreaterThanOrEqual(0)
  })

  test('close sets closed flag and fires close event', async () => {
    const closed = await page.evaluate(
      async ({ address, authBody, roomid }) => {
        const live = new window.LiveWS(roomid, { address, authBody })
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout')), 4000)
          live.addEventListener('live', () => live.close())
          live.addEventListener('close', () => {
            console.log('close event fired')
            clearTimeout(timer)
            resolve()
          })
        })
        return live.closed
      },
      { address: authV3.address, authBody: authV3.authBody, roomid: TEST_ROOM }
    )

    expect(closed).toBe(true)
  })

  test('throws for NaN roomid', async () => {
    const error = await page.evaluate(() => {
      try {
        new window.LiveWS(NaN)
        return null
      } catch (e) {
        if (e instanceof Error) return e.message
        return String(e)
      }
    })

    expect(error).toContain('must be Number not NaN')
  })

  test('throws for non-number roomid', async () => {
    const error = await page.evaluate(() => {
      try {
        // @ts-expect-error intentional bad input
        new window.LiveWS('abc')
        return null
      } catch (e) {
        if (e instanceof Error) return e.message
        return String(e)
      }
    })

    expect(error).toContain('must be Number not NaN')
  })
})

// -- LiveWS (protover 2, zlib) — shared connection ----------------------------

describe('browser LiveWS protover 2', () => {
  test('should connect, receive heartbeat, and msg with protover 2', async () => {
    const result = await page.evaluate(
      async ({ address, authBody, roomid }) => {
        const live = new window.LiveWS(roomid, { address, authBody, protover: 2 })
        try {
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
            live.addEventListener('live', () => {
              console.log('protover 2: live event fired, roomid:', live.roomid)
              clearTimeout(timer)
              resolve()
            })
          })

          const heartbeat = await new Promise<number>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting for heartbeat')), 4000)
            live.addEventListener('heartbeat', e => {
              console.log('protover 2: heartbeat received, online:', e.data)
              clearTimeout(timer)
              resolve(e.data)
            })
          })

          const msg = await new Promise<{ cmd?: string }>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting for msg')), 4000)
            live.addEventListener('msg', e => {
              console.log('protover 2: msg received, cmd:', e.data?.cmd)
              clearTimeout(timer)
              resolve(e.data)
            })
          })

          return {
            liveFlag: live.live,
            roomid: live.roomid,
            heartbeat,
            msgCmd: msg.cmd,
          }
        } finally {
          live.close()
        }
      },
      { address: authV2.address, authBody: authV2.authBody, roomid: TEST_ROOM }
    )

    expect(result.liveFlag).toBe(true)
    expect(result.roomid).toBe(TEST_ROOM)
    expect(typeof result.heartbeat).toBe('number')
    expect(result.heartbeat).toBeGreaterThanOrEqual(0)
    expect(result.msgCmd).toBeDefined()
  })
})

// -- LiveWS send danmaku (protover 3 + 2) -------------------------------------

describe('browser LiveWS send danmaku', () => {
  test.skipIf(!TEST_LOGIN_SYNC_TOKEN)('should receive sent danmaku via WS', async () => {
    const content = randomDanmaku()

    await page.evaluate(
      async ({ address, authBody, roomid }) => {
        window.__testMsgs = []
        const live = new window.LiveWS(roomid, { address, authBody })
        window.__testLive = live
        live.addEventListener('msg', e => {
          console.log('danmaku test: msg received, cmd:', e.data?.cmd)
          window.__testMsgs.push(e.data)
        })
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
          live.addEventListener('live', () => {
            console.log('danmaku test: connected, waiting for danmaku...')
            clearTimeout(timer)
            resolve()
          })
        })
      },
      { address: authV3.address, authBody: authV3.authBody, roomid: TEST_ROOM }
    )

    await sendDanmaku(TEST_ROOM, content)

    const received = await page.evaluate(
      async ({ content }) => {
        return new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            window.__testLive.close()
            reject(new Error('Timeout waiting for sent danmaku'))
          }, 10000)

          const check = (msg: { cmd?: string; info?: unknown[] }) => {
            if (msg.cmd === 'DANMU_MSG' && msg.info?.[1] === content) {
              console.log('danmaku test: matched DANMU_MSG:', msg.info[1])
              clearTimeout(timer)
              window.__testLive.close()
              resolve(msg.info[1])
              return true
            }
            return false
          }

          for (const msg of window.__testMsgs) {
            if (check(msg)) return
          }

          window.__testLive.addEventListener('msg', e => {
            check(e.data)
          })
        })
      },
      { content }
    )

    expect(received).toBe(content)
  })

  test.skipIf(!TEST_LOGIN_SYNC_TOKEN)('should receive sent danmaku via WS with protover 2', async () => {
    const content = randomDanmaku()

    await page.evaluate(
      async ({ address, authBody, roomid }) => {
        window.__testMsgs = []
        const live = new window.LiveWS(roomid, { address, authBody, protover: 2 })
        window.__testLive = live
        live.addEventListener('msg', e => {
          console.log('danmaku test v2: msg received, cmd:', e.data?.cmd)
          window.__testMsgs.push(e.data)
        })
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Timeout waiting for live event')), 4000)
          live.addEventListener('live', () => {
            console.log('danmaku test v2: connected, waiting for danmaku...')
            clearTimeout(timer)
            resolve()
          })
        })
      },
      { address: authV2.address, authBody: authV2.authBody, roomid: TEST_ROOM }
    )

    await sendDanmaku(TEST_ROOM, content)

    const received = await page.evaluate(
      async ({ content }) => {
        return new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => {
            window.__testLive.close()
            reject(new Error('Timeout waiting for sent danmaku'))
          }, 10000)

          const check = (msg: { cmd?: string; info?: unknown[] }) => {
            if (msg.cmd === 'DANMU_MSG' && msg.info?.[1] === content) {
              console.log('danmaku test v2: matched DANMU_MSG:', msg.info[1])
              clearTimeout(timer)
              window.__testLive.close()
              resolve(msg.info[1])
              return true
            }
            return false
          }

          for (const msg of window.__testMsgs) {
            if (check(msg)) return
          }

          window.__testLive.addEventListener('msg', e => {
            check(e.data)
          })
        })
      },
      { content }
    )

    expect(received).toBe(content)
  })
})

// -- KeepLiveWS ---------------------------------------------------------------

describe('browser KeepLiveWS', () => {
  test('should connect and expose online/roomid', async () => {
    const result = await page.evaluate(
      async ({ address, authBody, roomid }) => {
        const keep = new window.KeepLiveWS(roomid, { address, authBody })
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            keep.close()
            reject(new Error('Timeout'))
          }, 4000)
          keep.addEventListener('heartbeat', () => {
            console.log('KeepLiveWS: heartbeat, online:', keep.online)
            clearTimeout(timer)
            resolve()
          })
        })

        const out = { roomid: keep.roomid, online: keep.online, onlineType: typeof keep.online }
        keep.close()
        return { ...out, closed: keep.closed }
      },
      { address: authV3.address, authBody: authV3.authBody, roomid: TEST_ROOM }
    )

    expect(result.roomid).toBe(TEST_ROOM)
    expect(result.onlineType).toBe('number')
    expect(result.closed).toBe(true)
  })

  test('should reconnect after the inner connection is closed', async () => {
    const result = await page.evaluate(
      async ({ address, authBody, roomid }) => {
        const keep = new window.KeepLiveWS(roomid, { address, authBody })

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            keep.close()
            reject(new Error('Timeout waiting for first heartbeat'))
          }, 4000)
          keep.addEventListener('heartbeat', () => {
            console.log('KeepLiveWS reconnect: first heartbeat')
            clearTimeout(timer)
            resolve()
          })
        })

        const firstConnection = keep.connection
        console.log('KeepLiveWS reconnect: closing inner connection...')
        firstConnection.close()

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            keep.close()
            reject(new Error('Timeout waiting for reconnect heartbeat'))
          }, 8000)
          keep.addEventListener('heartbeat', () => {
            console.log('KeepLiveWS reconnect: heartbeat after reconnect')
            clearTimeout(timer)
            resolve()
          })
        })

        const reconnected = keep.connection !== firstConnection
        const out = { reconnected, roomid: keep.roomid, onlineType: typeof keep.online }
        keep.close()
        return out
      },
      { address: authV3.address, authBody: authV3.authBody, roomid: TEST_ROOM }
    )

    expect(result.reconnected).toBe(true)
    expect(result.roomid).toBe(TEST_ROOM)
    expect(result.onlineType).toBe('number')
  })
})
