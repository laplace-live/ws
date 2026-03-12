# @laplace.live/ws

Bilibili Live WebSocket/TCP API. Browser support via `@laplace.live/ws/browser` (experimental).

Based on [bilibili-live-ws](https://github.com/simon300000/bilibili-live-ws).

## Install

```bash
npm install @laplace.live/ws
```

## Usage

```javascript
import { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } from "@laplace.live/ws";

const live = new LiveWS(14275133);

live.on("open", () => console.log("Connection established"));
live.on("live", () => {
  live.on("heartbeat", console.log);
});
```

## API

### `new LiveWS(roomid [, options])` / `new LiveTCP(roomid [, options])`

| Option     | Description                                                                                                       | Default                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `address`  | WebSocket URL (LiveWS only)                                                                                       | `wss://broadcastlv.chat.bilibili.com/sub` |
| `host`     | TCP host (LiveTCP only)                                                                                           | `broadcastlv.chat.bilibili.com`           |
| `port`     | TCP port (LiveTCP only)                                                                                           | `2243`                                    |
| `protover` | Protocol version: `1`, `2` (zlib), `3` (brotli)                                                                   | `2`                                       |
| `uid`      | User ID for handshake                                                                                             |                                           |
| `key`      | Auth token for handshake                                                                                          |                                           |
| `buvid`    | Browser unique ID for handshake                                                                                   |                                           |
| `authBody` | Custom auth body. Overrides `protover`, `roomid`, `key`, `uid`, `buvid`. Accepts `object`, `string`, or `Buffer`. |                                           |

### Events

| Event       | Callback                   | Description                                                |
| ----------- | -------------------------- | ---------------------------------------------------------- |
| `open`      | `() => void`               | Connection opened                                          |
| `live`      | `() => void`               | Successfully joined the room                               |
| `heartbeat` | `(online: number) => void` | Server heartbeat received. Auto-sends heartbeat every 30s. |
| `msg`       | `(data: object) => void`   | Any message (danmaku, gift, broadcast, etc.)               |
| `<cmd>`     | `(data: object) => void`   | Specific command, e.g. `DANMU_MSG`, `SEND_GIFT`            |
| `close`     | `() => void`               | Connection closed                                          |
| `error`     | `(error: Error) => void`   | Connection error (also closes the connection)              |
| `message`   | `(buffer: Buffer) => void` | Raw buffer (advanced use)                                  |

### Methods

| Method              | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `live.heartbeat()`  | Send a heartbeat immediately                                        |
| `live.close()`      | Close the connection                                                |
| `live.getOnline()`  | Send heartbeat and return `Promise<number>` with current popularity |
| `live.send(buffer)` | Send raw data                                                       |

### `KeepLiveWS` / `KeepLiveTCP`

Same API as `LiveWS` / `LiveTCP` with automatic reconnection:

- Reconnects automatically after disconnection (default 100ms delay, configurable via `live.interval`)
- `live.connection` exposes the underlying `LiveWS` / `LiveTCP` instance
- `live.closed` indicates whether `close()` was called manually
- `error` / `close` events do not mean the connection is permanently closed; call `live.close()` to stop reconnecting

### `getConf(roomid)`

Resolve CDN host, WebSocket address, and auth key for a room.

```typescript
import { getConf } from "@laplace.live/ws";

const { key, host, address } = await getConf(roomid);
```

### `getRoomid(short)`

Resolve a short room ID to a full room ID.

```typescript
import { getRoomid } from "@laplace.live/ws";

const roomid = await getRoomid(255); // 48743
```

### Internals

| Property                | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| `LiveWS.ws`             | Underlying [WebSocket](https://github.com/websockets/ws) instance                 |
| `LiveTCP.socket`        | Underlying [net.Socket](https://nodejs.org/api/net.html#class-netsocket) instance |
| `LiveTCP.buffer`        | Internal TCP stream buffer                                                        |
| `LiveTCP.splitBuffer()` | Process buffered TCP data into complete packets                                   |

## License

MIT
