# Design Notes — Restaurant OS

Design tokens extracted from `src/app/globals.css` and `tailwind.config.ts`. All UI must consume these tokens — no hardcoded hex in components.

## Brand palette

### Cyprus (primary green)
| Token | Hex |
|-------|-----|
| cyprus-50 | `#E8F1EF` |
| cyprus-100 | `#C6DEDB` |
| cyprus-200 | `#8FBFB9` |
| cyprus-300 | `#4F9A91` |
| cyprus-400 | `#1C766C` |
| cyprus-500 | `#005A52` |
| cyprus-600 | `#004741` (DEFAULT) |
| cyprus-700 | `#013A35` |
| cyprus-800 | `#012B28` |
| cyprus-900 | `#01201D` |

### Sand (warm neutral)
| Token | Hex |
|-------|-----|
| sand-50 | `#FBFAF6` |
| sand-100 | `#F5F2EA` |
| sand-200 | `#F0EDE4` (DEFAULT) |
| sand-300 | `#E4DFD0` |
| sand-400 | `#D3CCB8` |

## Semantic tokens (light theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#F0EDE4` | Page background |
| `--surface` | `#FBFAF6` | Cards, panels |
| `--surface-2` | `#F5F2EA` | Inputs, secondary surfaces |
| `--line` | `#D6D0C0` | Borders, dividers |
| `--content` | `#0B1F1B` | Primary text |
| `--muted` | `#4A5C56` | Secondary text |
| `--faint` | `#7E8A84` | Placeholders, labels |
| `--brand` | `#004741` | Primary actions, links |
| `--accent` | `#1C766C` | Accent highlights |
| `--positive` | `#158060` | Success states |
| `--warning` | `#B07A14` | Warning, halted plans |
| `--danger` | `#B02D2D` | Destructive actions, errors |

## Dark theme

Dark mode inverts to a black field (`#080808`) with Sand-type text (`#F0EDE4`) and a brighter Cyprus accent (`#14A88C`). All semantic tokens are redefined under `.dark` in `globals.css`.

## Typography

- **Sans:** Inter (`--font-inter`) — body, UI
- **Display:** Space Grotesk (`--font-grotesk`) — headings, stat numbers

## Radii

| Token | Value |
|-------|-------|
| `rounded-xl` | 0.9rem |
| `rounded-2xl` | 1.25rem |
| `rounded-3xl` | 1.75rem |

## Shadows

| Token | Description |
|-------|-------------|
| `shadow-soft` | Subtle card elevation |
| `shadow-lift` | Hover / modal elevation |
| `shadow-glow` | Brand-focused glow ring |

## shadcn/ui mapping

shadcn CSS variables alias to semantic tokens:
- `--primary` → `--brand`
- `--background` → `--bg`
- `--destructive` → `--danger`
- etc. (see `:root` in `globals.css`)

## Derived values (not in original prototype)

| Token | Value | Usage |
|-------|-------|-------|
| `--halted-opacity` | `0.6` | Muted row styling for halted restaurant plans |

These were derived from the existing palette by reducing visual weight without introducing new colors.
