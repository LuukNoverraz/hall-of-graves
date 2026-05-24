/**
 * Cloudflare Pages Function: /image
 *
 * Generates a 320px-wide PNG image of the Hall of Graves timeline.
 * Uses @resvg/resvg-wasm (pure WASM, works on Workers free tier) to
 * render an SVG to PNG.
 *
 * Data is fetched from nuzlocke_data.yaml at the project root.
 *
 * URL: https://hall-of-graves.noverraz.tv/image
 *
 * NOTE: To deploy, run: npm install
 * Cloudflare Pages will automatically install dependencies and
 * bundle the WASM module.
 */

import { parseData, normalizeSpeciesName, POKEAPI_BASE } from './lib/data.js';
import { buildTimelineSVG } from './lib/renderer.js';

// ── Main handler ──────────────────────────────────────────────────
export async function onRequest(context) {
  try {
    // 1. Fetch the YAML data file from the deployed site
    const { request } = context;
    const url = new URL(request.url);
    const yamlUrl = `${url.origin}/nuzlocke_data.yaml`;

    const yamlResponse = await fetch(yamlUrl);
    if (!yamlResponse.ok) {
      throw new Error(`Failed to fetch nuzlocke_data.yaml: ${yamlResponse.status}`);
    }
    const yamlText = await yamlResponse.text();

    // 2. Parse the attempt data
    const attempts = parseData(yamlText);

    if (!attempts || attempts.length === 0) {
      return new Response('No attempt data found.', { status: 500 });
    }

    // 3. Fetch all species IDs from PokeAPI (with caching)
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

    // 4. Build the SVG
    const svgString = buildTimelineSVG(attempts, speciesIdCache);

    // 5. Convert SVG to PNG using resvg-wasm
    const pngBuffer = await svgToPng(svgString);

    // 6. Return the PNG
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('Image generation failed:', err);
    // Fallback: return the SVG so the URL still works
    try {
      const { request } = context;
      const url = new URL(request.url);
      const yamlUrl = `${url.origin}/nuzlocke_data.yaml`;
      const yamlResponse = await fetch(yamlUrl);
      const yamlText = await yamlResponse.text();
      const attempts = parseData(yamlText);
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
    const resvgModule = await import('@resvg/resvg-wasm');

    try {
      await resvgModule.initWasm();
    } catch (e) {
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
