# @laplace.live/ws

LAPLACE Live! flavored bilibili live WebSocket/TCP API.

A modern, web-standard rewrite of [bilibili-live-ws](https://github.com/simon300000/bilibili-live-ws). It provides the same core classes (`LiveWS`, `LiveTCP`, `KeepLiveWS`, `KeepLiveTCP`) but uses a different event API and drops all Node.js polyfills:

- Pure ESM
- Web-standard `EventTarget`/`Event` instead of Node.js `EventEmitter` — use `addEventListener` / `removeEventListener` instead of `.on()` / `.once()`
- Native `WebSocket` API directly — no `isomorphic-ws` or `ws` dependencies
- Typed `addEventListener` via `LiveEventMap` with `@laplace.live/internal` types
- Conditional `exports` field with `./server`, `./client`, `./browser` sub-path exports

## Install

```bash
bun add @laplace.live/ws
```

## Usage

Known Bilibili events are auto-typed via `LiveEventMap` — no manual generics
or casting needed:

```typescript
import { LiveWS } from "@laplace.live/ws";

const live = new LiveWS(25034104, { key: "...", address: "wss://..." });

// Built-in events are typed automatically
live.addEventListener("open", () => console.log("Connection established"));
live.addEventListener("live", () => console.log("Room entered"));
live.addEventListener("heartbeat", ({ data }) => console.log("Online:", data));

// Known Bilibili commands are typed from @laplace.live/internal
live.addEventListener("DANMU_MSG", ({ data }) => console.log(data.msg_id));
live.addEventListener("SEND_GIFT", ({ data }) => console.log(data.giftName));
live.addEventListener("SUPER_CHAT_MESSAGE", ({ data }) =>
  console.log(data.message),
);

// Dynamic/unknown events use a generic fallback
live.addEventListener<{ custom: string }>("NEW_CMD", ({ data }) =>
  console.log(data.custom),
);
```

### Browser

```typescript
import { LiveWS, KeepLiveWS } from "@laplace.live/ws/client";

const live = new LiveWS(25034104, { key: "...", address: "wss://..." });
live.addEventListener("DANMU_MSG", ({ data }) => console.log(data.msg_id));
```

### Auto-reconnecting

```typescript
import { KeepLiveWS } from "@laplace.live/ws";

const keep = new KeepLiveWS(25034104, { key: "...", address: "wss://..." });
keep.addEventListener("heartbeat", ({ data }) => console.log("Online:", data));
keep.addEventListener("DANMU_MSG", ({ data }) => console.log(data.msg_id));
```

### TCP (Node.js / Bun only)

```typescript
import { LiveTCP } from "@laplace.live/ws/server";

const live = new LiveTCP(25034104, { key: "..." });
live.addEventListener("heartbeat", ({ data }) => console.log("Online:", data));
```

## Migrating from bilibili-live-ws

### Event listeners

Replace `.on()` / `.once()` with `addEventListener()` / `removeEventListener()`.
Event data is accessed via the event object's `.data` property instead of direct
callback arguments:

```diff
- live.on('heartbeat', (online) => console.log(online));
+ live.addEventListener('heartbeat', ({ data: online }) => console.log(online));

- live.on('DANMU_MSG', (data) => console.log(data));
+ live.addEventListener('DANMU_MSG', ({ data }) => console.log(data));
```

### Catch-all event

The `relayEvent` symbol is replaced by an `event` meta-event:

```diff
- const { relayEvent } = require('bilibili-live-ws');
- live.on(relayEvent, (name, data) => ...);
+ live.addEventListener('event', ({ data }) => ...);
```

### Buffer → Uint8Array

Raw data uses `Uint8Array` instead of `Buffer`. If you pass a custom
`authBody` as binary, use `Uint8Array`:

```diff
- live = new LiveWS(roomid, { authBody: Buffer.from(...) });
+ live = new LiveWS(roomid, { authBody: new Uint8Array(...) });
```

## License

MIT
