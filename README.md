# ROS — Main Admin Portal (RPOS-Frontend)

The Main Admin control plane for the Restaurant Operating System. Built with
**Next.js (App Router) + TypeScript + Tailwind + Framer Motion**.

> _One kitchen, infinite branches, zero blind spots._

## Highlights

- **Cyprus / Sand** brand palette with a full **light + dark** theme (toggle in the top bar or Settings), persisted and flash-free.
- **Glassmorphism** surfaces, blurred modal backdrops, and motion throughout.
- **Custom minimalist icon set** — hand-drawn SVGs, no icon library.
- **Inter** UI type + **Space Grotesk** display type (the modern POS/dashboard standard).
- **RBAC-aware** navigation and actions, gated by the signed-in user's permissions.
- **Persistent mock backend** so the whole portal is usable before the API is live.

## Screens

Login · Dashboard · Organizations · Branches · Users · Roles & Permissions ·
Master Data (9 catalogs) · Settings — every screen mapped 1:1 to the RPOS
FastAPI Main Admin endpoints.

## Getting started

```bash
npm install
npm run dev
# http://localhost:3000
```

Demo login (mock mode): **admin@test.com** / **Test@1234**
(quick-fill buttons for other roles are on the login screen).

## Wiring the real backend

The data layer lives in `src/lib/api/` behind a single `ApiClient` contract with
two interchangeable implementations:

- `mock.ts` — persistent in-browser backend (default)
- `http.ts` — live FastAPI client (adds the `/v1` prefix + bearer auth)

To switch, edit `.env.local`:

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Restart the dev server. No component changes are required — the contract matches
the backend schemas (`schemas/*.py`) exactly.

## Structure

```
src/
  app/
    login/                 # split-screen glass login
    (portal)/              # auth-guarded shell (sidebar + topbar)
      dashboard/ organizations/ branches/ users/ roles/ master-data/ settings/
  components/
    icons.tsx              # custom SVG icon set + logomark + spinner
    ui/                    # Button, Field, Modal, Toast, DataTable, Badge, Switch…
    layout/                # Sidebar, Topbar
  lib/
    api/                   # client contract, mock + http adapters, tokens
    auth.tsx theme.tsx     # contexts
    nav.ts types.ts        # nav config, backend-mirrored types
    master-data-config.ts  # config-driven Master Data forms/tables
```
