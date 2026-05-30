---
"@laplace.live/ws": major
---

Require an `ArrayBuffer`-backed `Uint8Array` on the binary send surface and bump the TypeScript toolchain to 6.0.

TypeScript 6.0 tightened assignability for generic typed arrays: a bare `Uint8Array` is `Uint8Array<ArrayBufferLike>` (its buffer may be a `SharedArrayBuffer`), and `WebSocket.send` / our transports only accept an `ArrayBuffer`-backed view. The public binary surface is therefore narrowed from `Uint8Array` to `Uint8Array<ArrayBuffer>`:

- `Live.send` and the transport `send` callback: `(data: Uint8Array) => void` → `(data: Uint8Array<ArrayBuffer>) => void`
- `KeepLive.send` / `KeepLiveWS.send`: `(data: Uint8Array)` → `(data: Uint8Array<ArrayBuffer>)`
- `LiveOptions.authBody`: `Uint8Array | Record<string, unknown>` → `Uint8Array<ArrayBuffer> | Record<string, unknown>`

This is a type-level breaking change only — runtime behavior is unchanged.

**Requires TypeScript 5.7+** in consuming projects (when typed arrays became generic; this was already effectively required by the existing `Inflates` types).

**Migration:** Most consumers are unaffected — passing `authBody` as a plain object and not calling `.send()` directly needs no changes. If you pass a `Uint8Array` `authBody` or call `.send()` with a bare `Uint8Array`, make it `ArrayBuffer`-backed: annotate the value as `Uint8Array<ArrayBuffer>`, or pass a fresh copy via `new Uint8Array(data)`. Data produced by this package's own `encoder()` is already `ArrayBuffer`-backed.
