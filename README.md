# <img src="favicon.svg" width="32" height="32" alt="" style="vertical-align: middle; margin-right: 4px;"> Hall of Graves


> A visual timeline of Nuzlocke attempts, built as a self-contained HTML file.

[![OBS Ready](https://img.shields.io/badge/OBS-Ready-43b581?style=flat-square)](https://obsproject.com/)
[![No Server Needed](https://img.shields.io/badge/No%20Server-Needed-5865f2?style=flat-square)](#)
[![Pokémon Gen V](https://img.shields.io/badge/Pok%C3%A9mon-Gen%20V%20Sprites-ed4245?style=flat-square)](https://pokeapi.co/)

**Hall of Graves** is a simple website that tracks your Pokémon Nuzlocke runs across attempts. Each failed run is displayed as a node on a timeline, with your current alive team highlighted. Pokémon sprites are fetched live from PokeAPI using Generation V artwork.

No server. No dependencies. Just open the file.

## ✨ Features

- **📜 Timeline layout.** Vertical timeline with attempt nodes, dead and alive badges, and region labels.
- **🎨 Gen V sprites.** Each Pokémon gets its official Black and White sprite from PokeAPI.
- **💀 Dead team styling.** Failed attempts are greyed out. Hover to restore color and see details.
- **🖱️ Hover effects.** Sprites scale up on hover with a custom tooltip showing nickname, species, and level.
- **🔤 Pokémon font.** Uses the classic DPPT font for authentic vibes.
- **⚡ Fully static.** No HTTP server required. Works directly from `file://`.
- **📦 Single file.** All data, styles, and logic live inside `index.html`.

## 🚀 How to Use

### 1. Edit your data

Edit `nuzlocke_data.yaml` at the project root. This is the single source of truth.

```yaml
ATTEMPT 1 (Kanto): Nightfall the Piplup lv5, Royalty the Starly lv3, Biefstuk the Bidoof lv4
ATTEMPT 2 (Johto): Blaze the Cyndaquil lv7, Feathers the Hoothoot lv4
ATTEMPT 3 (Sinnoh): Ember the Chimchar lv8, Splash the Magikarp lv5, Sting the Wurmple lv3
```

> **Format:** `ATTEMPT # (Region): Nickname the Species lv#, Nickname the Species lv#, ...`

- The **last line** is your current alive attempt. It gets a green accent.
- All previous lines are treated as dead teams and greyed out.
- Each Pokémon entry follows the pattern `Nickname the Species lv#`.

### 2. Open in your browser

When hosted on a web server, the page fetches `nuzlocke_data.yaml` automatically. When opened locally via `file://`, it falls back to the inline data in the `<script id="nuzlocke-data">` tag inside `index.html`, so it still works without a server.

## 🧩 Data Format Reference

| Part | Example | Notes |
|------|---------|-------|
| Attempt label | `ATTEMPT 1 (Kanto)` | `ATTEMPT # (Region)`. The region becomes small label text. |
| Separator | `: ` | Colon plus space between label and Pokémon list. |
| Pokémon entry | `Nightfall the Piplup lv5` | `Nickname the Species lv#`. |
| Entry separator | `, ` | Comma plus space between entries. |

Species with spaces work fine. `Mr. Mime`, `Farfetch'd`, and `Porygon-Z` are all handled correctly by PokeAPI.

## 🎨 Customization

The page is designed for easy tweaking:

- **Colors.** Edit the CSS in `index.html`. Look for `#36393f`, `#b9bbbe`, and similar values.
- **Sprite size.** Change `width: 96px` and `height: 96px` on `.pokemon-card img`.
- **Font.** Swap the `@font-face` source in the `<style>` block.

## 📁 Project Structure

```
hall-of-graves/
├── index.html              ← The OBS overlay (data, styles, logic)
├── nuzlocke_data.yaml      ← Your attempt data (single source of truth)
├── LICENSE                 ← MIT license
├── fonts/
│   └── pokemon-dppt.otf.woff2  ← Pokémon DPPT font
└── README.md               ← This file
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
