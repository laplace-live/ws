# @laplace.live/ws

Bilibili Live WebSocket/TCP API. Browser support via `@laplace.live/ws/browser`

This project is based on [bilibili-live-ws](https://github.com/simon300000/bilibili-live-ws) and has the exact same API as the original project, with the following differences:

- Pure ESM
- Uses web-standard `EventTarget`/`Event` instead of Node.js `EventEmitter` polyfills
- Uses native `WebSocket` API directly, removing `isomorphic-ws` and `ws` dependencies
- No `Buffer` polyfills
- Typed `on<T>()`/`off<T>()` convenience methods
- Conditional `exports` field with `./server`, `./client`, `./browser` sub-path exports

## Install

```bash
bun add @laplace.live/ws
```

## Usage

```typescript
import type { BilibiliInternal } from "@laplace.live/internal";
import { LiveWS, KeepLiveWS } from "@laplace.live/ws";

const live = new LiveWS(25034104, { key: "...", address: "wss://..." });

live.on("open", () => console.log("Connection established"));
live.on("live", () => console.log("Room entered"));
live.on<number>("heartbeat", ({ data }) => console.log("Online:", data));
live.on<{ cmd: string }>("msg", ({ data }) =>
  console.log("Command:", data.cmd),
);
live.on<BilibiliInternal.WebSocket.Prod.DANMU_MSG>("DANMU_MSG", ({ data }) =>
  console.log("DANMU_MSG msg_id", data.msg_id),
);
```

### Browser

```typescript
import type { BilibiliInternal } from "@laplace.live/internal";
import { KeepLiveWS } from "@laplace.live/ws/browser";

const live = new KeepLiveWS(25034104, { key: "...", address: "wss://..." });
live.on<BilibiliInternal.WebSocket.Prod.DANMU_MSG>("DANMU_MSG", ({ data }) =>
  console.log("DANMU_MSG msg_id", data.msg_id),
);
```

### Using addEventListener

Since `LiveWS` and `KeepLiveWS` extend `EventTarget`, you can also use the
standard `addEventListener` API. Events carrying data are instances of
`LaplaceRawEvent<T>`, which extends `Event` with a typed `data` property.

```typescript
import { LiveWS, LaplaceRawEvent } from "@laplace.live/ws";

const live = new LiveWS(25034104, { key: "...", address: "wss://..." });

live.addEventListener("heartbeat", (e) => {
  const online = (e as LaplaceRawEvent<number>).data;
  console.log("Online:", online);
});

live.addEventListener("DANMU_MSG", (e) => {
  const data = (e as LaplaceRawEvent<unknown>).data;
  console.log("Danmaku:", data);
});
```

### TCP (Node.js / Bun only)

```typescript
import { LiveTCP, KeepLiveTCP } from "@laplace.live/ws";

const live = new LiveTCP(25034104, { key: "..." });
live.on<number>("heartbeat", ({ data }) => console.log("Online:", data));
```

## License

MIT
