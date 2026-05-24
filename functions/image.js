/**
 * Cloudflare Pages Function: /image
 *
 * Generates a 320px-wide PNG image of the Hall of Graves timeline.
 * Uses @resvg/resvg-wasm (pure WASM, works on Workers free tier) to
 * render an SVG to PNG.
 *
 * URL: https://hall-of-graves.noverraz.tv/image
 *
 * NOTE: To deploy, run: npm install
 * Cloudflare Pages will automatically install dependencies and
 * bundle the WASM module.
 */

import { ATTEMPT_DATA, parseData, normalizeSpeciesName, POKEAPI_BASE } from './lib/data.js';
import { buildTimelineSVG } from './lib/renderer.js';

// ── Main handler ──────────────────────────────────────────────────
export async function onRequest(context) {
  try {
    // 1. Parse the attempt data
    const attempts = parseData(ATTEMPT_DATA);

    if (!attempts || attempts.length === 0) {
      return new Response('No attempt data found.', { status: 500 });
    }

    // 2. Fetch all species IDs from PokeAPI (with caching)
    const speciesIdCache = new Map();
    const fetchPromises = [];

    for (const attempt of attempts) {
      for (const mon of attempt.pokemon) {
        const key = normalizeSpeciesName(mon.species);
        if (!speciesIdCache.has(key)) {
          speciesIdCache.set(key, null);
          fetchPromises.push(
            fetchSpeciesId(key).then(id => {
              speciesIdCache.set(key, id);
            })
          );
        }
      }
    }

    await Promise.allSettled(fetchPromises);

    // 3. Build the SVG
    const svgString = buildTimelineSVG(attempts, speciesIdCache);

    // 4. Convert SVG to PNG using resvg-wasm
    const pngBuffer = await svgToPng(svgString);

    // 5. Return the PNG
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Image generation failed:', err);
    // Fallback: return the SVG as a fallback so the URL still works
    try {
      const attempts = parseData(ATTEMPT_DATA);
      const speciesIdCache = new Map();
      const svgString = buildTimelineSVG(attempts, speciesIdCache);
      return new Response(svgString, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response('Failed to generate image: ' + err.message, { status: 500 });
    }
  }
}

// ── PokeAPI fetch ─────────────────────────────────────────────────

async function fetchSpeciesId(key) {
  const url = POKEAPI_BASE + encodeURIComponent(key) + '/';

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.id || null;
  } catch {
    return null;
  }
}

// ── SVG to PNG conversion ─────────────────────────────────────────

let resvgReady = null;

async function ensureResvg() {
  if (resvgReady) return resvgReady;

  resvgReady = (async () => {
    // Dynamic import of the WASM module
    // Cloudflare Pages Functions bundle this automatically
    const resvgModule = await import('@resvg/resvg-wasm');

    // Initialize the WASM runtime.
    // On Cloudflare Workers, the WASM binary is bundled by
    // the Pages build process.
    try {
      await resvgModule.initWasm();
    } catch (e) {
      // initWasm may throw if already initialized or if the
      // WASM binary path is wrong. Try alternative init.
      if (typeof resvgModule.default === 'function') {
        await resvgModule.default();
      }
    }

    return resvgModule;
  })();

  return resvgReady;
}

async function svgToPng(svgString) {
  const resvgModule = await ensureResvg();

  const renderer = new resvgModule.Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: 320,
    },
    font: {
      loadSystemFonts: false,
      defaultFontFamily: 'sans-serif',
    },
    dpi: 96,
  });

  const pngData = renderer.render();
  const pngBuffer = pngData.asPng();

  return pngBuffer;
}
