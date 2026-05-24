/**
 * SVG renderer for the Hall of Graves timeline at 320px wide.
 * Builds a pure SVG string that can be converted to PNG via resvg.
 */

import { SPRITE_BASE, normalizeSpeciesName } from './data.js';

// Layout constants (320px canvas)
const CANVAS_W = 320;
const PADDING = 14;
const LINE_LEFT = 18;
const CONTENT_LEFT = 34;
const LABEL_FONT_SIZE = 13;
const REGION_FONT_SIZE = 10;
const SPRITE_SIZE = 48;
const SPRITE_GAP = 6;
const ROW_GAP = 18;
const NODE_RADIUS = 5;

// Colors
const BG = '#36393f';
const TEXT_BRIGHT = '#dcddde';
const TEXT_MUTED = '#72767d';
const LINE_COLOR = '#4f545c';
const NODE_BORDER = '#72767d';
const GREEN = '#43b581';
const RED = '#ed4245';

/**
 * Build the full SVG string for the timeline.
 * @param {object[]} attempts  Parsed attempt data from parseData()
 * @param {Map} speciesIdCache  Map of species to Pokedex ID (pre-fetched)
 * @returns {string}  SVG markup
 */
export function buildTimelineSVG(attempts, speciesIdCache) {
  // Calculate total height first
  let totalHeight = PADDING;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    totalHeight += LABEL_FONT_SIZE + 4;
    if (attempt.pokemon.length > 0) {
      totalHeight += SPRITE_SIZE;
    }
    totalHeight += ROW_GAP;
  }

  totalHeight += PADDING - ROW_GAP;

  const parts = [];

  // SVG header
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + CANVAS_W + '" height="' + totalHeight + '" viewBox="0 0 ' + CANVAS_W + ' ' + totalHeight + '">');

  // Background
  parts.push('<rect width="' + CANVAS_W + '" height="' + totalHeight + '" fill="' + BG + '"/>');

  // Font style - using system fonts since resvg can't load external fonts on Workers
  parts.push('<style>');
  parts.push('.label { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: ' + LABEL_FONT_SIZE + 'px; font-weight: 600; fill: ' + TEXT_BRIGHT + '; }');
  parts.push('.region { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: ' + REGION_FONT_SIZE + 'px; font-weight: 400; fill: ' + TEXT_MUTED + '; }');
  parts.push('.badge { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 8px; font-weight: 700; fill: #fff; }');
  parts.push('</style>');


  // Timeline line
  const lineTop = PADDING + LABEL_FONT_SIZE / 2;
  const lineBottom = totalHeight - PADDING;
  parts.push('<line x1="' + LINE_LEFT + '" y1="' + lineTop + '" x2="' + LINE_LEFT + '" y2="' + lineBottom + '" stroke="' + LINE_COLOR + '" stroke-width="2" stroke-linecap="round"/>');

  // Attempt rows
  let y = PADDING;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const isCurrent = attempt.isCurrent;
    const labelY = y + LABEL_FONT_SIZE;

    // Node circle
    const nodeCY = labelY - LABEL_FONT_SIZE / 2;
    if (isCurrent) {
      parts.push('<circle cx="' + LINE_LEFT + '" cy="' + nodeCY + '" r="' + NODE_RADIUS + '" fill="' + GREEN + '" stroke="' + GREEN + '" stroke-width="2"/>');
    } else {
      parts.push('<circle cx="' + LINE_LEFT + '" cy="' + nodeCY + '" r="' + NODE_RADIUS + '" fill="' + LINE_COLOR + '" stroke="' + NODE_BORDER + '" stroke-width="2"/>');
    }

    // Label
    const labelMatch = attempt.label.match(/^(ATTEMPT \d+) \(([^)]+)\)$/i);
    let labelText, regionText;
    if (labelMatch) {
      labelText = labelMatch[1];
      regionText = '/ ' + labelMatch[2];
    } else {
      labelText = attempt.label;
      regionText = '';
    }

    const labelColor = isCurrent ? GREEN : TEXT_BRIGHT;
    parts.push('<text x="' + CONTENT_LEFT + '" y="' + labelY + '" class="label" fill="' + labelColor + '">' + escapeXml(labelText) + '</text>');

    if (regionText) {
      const labelWidth = estimateTextWidth(labelText, LABEL_FONT_SIZE);
      parts.push('<text x="' + (CONTENT_LEFT + labelWidth + 4) + '" y="' + labelY + '" class="region">' + escapeXml(regionText) + '</text>');
    }

    // Status badge
    const badgeText = isCurrent ? 'ALIVE' : 'DEAD';
    const badgeColor = isCurrent ? GREEN : RED;
    const badgeX = CONTENT_LEFT + (regionText ? estimateTextWidth(labelText, LABEL_FONT_SIZE) + estimateTextWidth(regionText, REGION_FONT_SIZE) + 8 : estimateTextWidth(labelText, LABEL_FONT_SIZE) + 4);
    const badgeW = estimateTextWidth(badgeText, 8) + 10;
    parts.push('<rect x="' + badgeX + '" y="' + (labelY - 10) + '" width="' + badgeW + '" height="12" rx="2" fill="' + badgeColor + '"/>');
    parts.push('<text x="' + (badgeX + badgeW / 2) + '" y="' + (labelY - 1) + '" class="badge" text-anchor="middle">' + badgeText + '</text>');

    // Pokemon sprites
    const spriteY = y + LABEL_FONT_SIZE + 6;

    if (attempt.pokemon.length > 0) {
      for (let j = 0; j < attempt.pokemon.length; j++) {
        const mon = attempt.pokemon[j];
        const sx = CONTENT_LEFT + j * (SPRITE_SIZE + SPRITE_GAP);
        const sy = spriteY;

        const speciesKey = normalizeSpeciesName(mon.species);
        const dexId = speciesIdCache.get(speciesKey);

        if (dexId) {
          const spriteUrl = SPRITE_BASE + dexId + '.png';
          if (isCurrent) {
            parts.push('<image x="' + sx + '" y="' + sy + '" width="' + SPRITE_SIZE + '" height="' + SPRITE_SIZE + '" href="' + spriteUrl + '" image-rendering="pixelated"/>');
          } else {
            parts.push('<defs><filter id="gs_' + i + '_' + j + '"><feColorMatrix type="saturate" values="0"/></filter></defs>');
            parts.push('<image x="' + sx + '" y="' + sy + '" width="' + SPRITE_SIZE + '" height="' + SPRITE_SIZE + '" href="' + spriteUrl + '" image-rendering="pixelated" filter="url(#gs_' + i + '_' + j + ')" opacity="0.6"/>');
          }
        } else {
          parts.push('<rect x="' + sx + '" y="' + sy + '" width="' + SPRITE_SIZE + '" height="' + SPRITE_SIZE + '" fill="#2f3136" rx="3"/>');
          parts.push('<text x="' + (sx + SPRITE_SIZE / 2) + '" y="' + (sy + SPRITE_SIZE / 2 + 4) + '" font-family="sans-serif" font-size="20" font-weight="bold" fill="' + RED + '" text-anchor="middle">?</text>');
        }
      }
    } else {
      parts.push('<text x="' + CONTENT_LEFT + '" y="' + (spriteY + 12) + '" font-family="sans-serif" font-size="10" fill="' + TEXT_MUTED + '">No Pokemon recorded.</text>');
    }

    y = spriteY + SPRITE_SIZE + ROW_GAP;
  }

  parts.push('</svg>');
  return parts.join('\n');
}

// Helpers

function estimateTextWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

function escapeXml(str) {
  var amp = '&' + 'amp;';
  var lt = '&' + 'lt;';
  var gt = '&' + 'gt;';
  var quot = '&' + 'quot;';
  var apos = '&' + 'apos;';
  return str
    .replace(/&/g, amp)
    .replace(/</g, lt)
    .replace(/>/g, gt)
    .replace(/"/g, quot)
    .replace(/'/g, apos);
}


