---
"@laplace.live/ws": minor
---

Decompress incoming frames synchronously on Node.js and Bun (`brotliDecompressSync` / `inflateSync`) instead of the async threadpool variants. In a 500-room benchmark replaying recorded traffic, this used 20% (Node) to 35% (Bun) less CPU and cut median message latency by 32–60%. The browser build is unchanged.
