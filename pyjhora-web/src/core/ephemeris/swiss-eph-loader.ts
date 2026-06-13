/**
 * Swiss Ephemeris module loader.
 *
 * Why this exists: the `swisseph-wasm` emscripten glue locates its `.wasm` and
 * `.data` files at runtime via `import.meta.resolve("./swisseph.wasm")` /
 * `scriptDirectory + "swisseph.wasm"`. Vite does NOT rewrite those forms (only
 * `new URL(x, import.meta.url)`), so in a production build under a non-root
 * base (GitHub Pages: `/PyJHora/`) the glue requests the UNHASHED
 * `/PyJHora/assets/swisseph.wasm`, which doesn't exist → "Aborted(both async
 * and sync fetching of the wasm failed)".
 *
 * Fix: we supply our own `locateFile` that returns the Vite-resolved, hashed,
 * base-correct asset URLs (via `?url` imports). The package's `exports` field
 * blocks bare subpath imports (`swisseph-wasm/wsam/...`), but a relative import
 * into node_modules bypasses `exports` and lets Vite emit the assets and the
 * emscripten factory.
 */
import SwissEph from 'swisseph-wasm';
// Relative deep imports bypass the package's restrictive `exports` map.
// @ts-expect-error - no type declarations for the emscripten factory
import createSwissModule from '../../../node_modules/swisseph-wasm/wsam/swisseph.js';
import wasmUrl from '../../../node_modules/swisseph-wasm/wsam/swisseph.wasm?url';
import dataUrl from '../../../node_modules/swisseph-wasm/wsam/swisseph.data?url';

function locateFile(path: string): string {
  if (path.endsWith('.wasm')) return wasmUrl;
  if (path.endsWith('.data')) return dataUrl;
  return path;
}

/**
 * Create and initialize a SwissEph instance whose WASM/data load from the
 * correct hashed asset URLs. Replaces `new SwissEph(); await initSwissEph()`,
 * which uses the glue's broken default file resolution.
 */
export async function createSwissEph(): Promise<SwissEph> {
  const swe = new SwissEph();

  // In Node / Vitest there is no base path and the glue resolves the WASM/data
  // from disk (fs) relative to the package — our browser asset URLs would break
  // that. Only override file resolution in the browser.
  if (typeof window === 'undefined') {
    await swe.initSwissEph();
    return swe;
  }

  // Browser: mirror what SwissEph.initSwissEph() does, but pass our locateFile
  // to the emscripten factory so the WASM/data resolve under any base path.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (swe as any).SweModule = await createSwissModule({ locateFile });
  swe.set_ephe_path('sweph');
  return swe;
}
