# @laplace.live/ws

Bilibili Live WebSocket/TCP API. Browser support via `@laplace.live/ws/browser` (experimental).

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
// Or specifically use @laplace.live/ws/server or @laplace.live/ws/client
import { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } from "@laplace.live/ws";

const live = new LiveWS(25034104);

live.on<T>("open", () => console.log("Connection established"));
live.on("live", () => {
  live.on<T>("heartbeat", console.log);
});
```

## License

MIT
