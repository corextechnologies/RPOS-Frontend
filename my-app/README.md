# Restaurant OS — Super Admin Portal

Phase 0 foundation + Phase 1 Super Admin portal for multi-tenant restaurant management.

## Run locally

```bash
cd my-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo login (mock API)

| Email | Password |
|-------|----------|
| `superadmin@ros.test` | `Super@1234` |

Mock API is enabled by default (`NEXT_PUBLIC_USE_MOCK` is not `"false"`). Data persists in `localStorage`.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_USE_MOCK` | `true` | Use in-memory mock API |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/v1` | Live API base URL |

## Stack

- Next.js 16 (App Router) + TypeScript
- TanStack Query — server state
- shadcn/ui + Tailwind CSS v4 — UI (Cyprus/Sand theme)
- react-hook-form + zod — forms
- Recharts — dashboard charts
- sonner — toasts

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Shared login (Super Admin) |
| `/super-admin/dashboard` | Restaurants list, stats, filters |
| `/super-admin/restaurants/new` | Add restaurant + admin |
| `/super-admin/restaurants/[id]` | Edit, revoke, delete |
| `/super-admin/restaurants/[id]/billing` | Billing + invoice sharing |
| `/super-admin/settings` | Profile, theme, API mode |

## Feature map

| Feature | Primary files |
|---------|---------------|
| Design tokens | `src/app/globals.css`, `tailwind.config.ts`, `DESIGN_NOTES.md` |
| Auth + role redirect | `src/lib/auth.tsx`, `src/lib/auth/actions.ts` |
| Mock API | `src/lib/api/mock.ts`, `src/lib/api/contract.ts` |
| TanStack Query hooks | `src/lib/hooks/use-restaurants.ts`, `src/lib/api/query-keys.ts` |
| App shell | `src/app/(portals)/super-admin/layout.tsx`, `src/components/layout/` |
| Dashboard + filters | `src/app/(portals)/super-admin/dashboard/page.tsx` |
| Add restaurant + credentials | `src/app/(portals)/super-admin/restaurants/new/page.tsx`, `src/components/ui/credentials-dialog.tsx` |
| Edit / delete / revoke | `src/app/(portals)/super-admin/restaurants/[id]/page.tsx`, `src/components/ui/confirm-dialog.tsx` |
| Plan halt/activate | Dashboard row actions, `mock.haltPlan` / `mock.activatePlan` |
| Billing + share invoice | `src/app/(portals)/super-admin/restaurants/[id]/billing/page.tsx` |
| Form validation | `src/lib/schemas/restaurant.ts` |
| Shared UI kit | `src/components/ui/` |

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```
