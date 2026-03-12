/**
 * Browser entry-point tests.
 *
 * Exercises the browser inflate path (pako + JS brotli) instead of node:zlib,
 * ensuring the decompression pipeline that runs in real browsers produces the
 * same results as the server path.
 */
import { KeepLiveWS, LiveWS } from '../src/browser.ts'
import { runLiveWSSuite } from './suite.ts'

runLiveWSSuite('browser', LiveWS, KeepLiveWS)
