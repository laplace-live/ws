# @laplace.live/ws

LAPLACE Live! flavored bilibili live WebSocket/TCP API.

This project is based on [bilibili-live-ws](https://github.com/simon300000/bilibili-live-ws) and has the exact same API as the original project, with the following differences:

- Pure ESM
- Uses web-standard `EventTarget`/`Event` instead of Node.js `EventEmitter` polyfills
- Uses native `WebSocket` API directly, removing `isomorphic-ws` and `ws` dependencies
- No `Buffer` polyfills
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

## License

MIT
