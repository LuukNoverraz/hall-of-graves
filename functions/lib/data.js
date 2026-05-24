/**
 * Shared data and parsing logic for Hall of Graves.
 * Used by both the browser page (index.html) and the server-side image generator.
 */

// ── Attempt data ──────────────────────────────────────────────────
// Edit the lines below to update your attempts.
// Format: ATTEMPT # (Region): Nickname the Species lv#, Nickname the Species lv#, ...
export const ATTEMPT_DATA = `ATTEMPT 1 (Kanto): Wipe the Charmander lv12, Monkey the Rattata lv12, Death the Pidgey lv12
ATTEMPT 2 (Hoenn): Joe Pumpkin the Torchic lv10, Table the Wurmple lv5, 21 the Zigzagoon lv7, Elephant Giraffe the Taillow lv10
ATTEMPT 3 (Kanto): Leafal Weapon the Bulbasaur lv12, Tri-Hard the Doduo lv12, Bunny the Bellsprout lv11, Jollypod the Butterfree lv12
ATTEMPT 4 (Sinnoh): Righteous the Budew lv15, Physica the Geodude lv15, Anomaly the Shinx lv14, Eldritch the Zubat lv14, Supernova the Machop lv15, Zenith the Onix lv8`;

// ── Constants ─────────────────────────────────────────────────────
export const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon/';
export const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/';

// ── Parsing ───────────────────────────────────────────────────────

/**
 * Parse a single line of the custom format.
 * Format: ATTEMPT 1 (Kanto): Nightfall the Piplup lv5, Royalty the Starly lv3
 */
export function parseLine(line, index, totalLines) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const colonIdx = trimmed.indexOf(': ');
  if (colonIdx === -1) return null;

  const label = trimmed.slice(0, colonIdx).trim();
  const pokemonStr = trimmed.slice(colonIdx + 2).trim();
  if (!label || !pokemonStr) return null;

  const entries = pokemonStr.split(',').map(s => s.trim()).filter(Boolean);
  const pokemon = [];

  for (const entry of entries) {
    const parsed = parsePokemonEntry(entry);
    if (parsed) pokemon.push(parsed);
  }

  const isCurrent = (index === totalLines - 1);
  return { label, pokemon, isCurrent };
}

/**
 * Parse a single Pokémon entry.
 * Format: "Nightfall the Piplup lv5"
 */
export function parsePokemonEntry(entry) {
  const sepIdx = entry.indexOf(' the ');
  if (sepIdx === -1) return null;

  const nickname = entry.slice(0, sepIdx).trim();
  const rest = entry.slice(sepIdx + 5).trim();

  const levelMatch = rest.match(/^(.*?)\s+lv(\d+)$/i);
  let species, level;

  if (levelMatch) {
    species = levelMatch[1].trim();
    level = parseInt(levelMatch[2], 10);
  } else {
    species = rest;
    level = null;
  }

  if (!nickname || !species) return null;
  return { nickname, species, level };
}

/**
 * Parse the full text content into an array of attempt objects.
 */
export function parseData(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  const totalLines = lines.length;
  const attempts = [];

  for (let i = 0; i < totalLines; i++) {
    const parsed = parseLine(lines[i], i, totalLines);
    if (parsed) attempts.push(parsed);
  }

  return attempts;
}

/**
 * Normalize a species name for the PokeAPI.
 */
export function normalizeSpeciesName(species) {
  return species
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\./g, '');
}
