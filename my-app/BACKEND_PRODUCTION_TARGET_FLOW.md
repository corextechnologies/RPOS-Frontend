# Backend needed — Production Target lifecycle (Admin → Kitchen → Branch)

The frontend now implements the full production-target flow end to end. Against
the **mock** (`NEXT_PUBLIC_USE_MOCK=true`) it works completely. Against the
**live** backend it needs the endpoints and behaviour below. Everything the
frontend sends/expects is listed here.

## New status flow

The `status` field on a production target must accept this ordered lifecycle:

```
PENDING → ACKNOWLEDGED → IN_PRODUCTION → COMPLETED → ALLOCATED → DISPATCHED → RECEIVED
```

Previously only `PENDING → ACKNOWLEDGED → COMPLETED` existed. **`/complete` now
transitions from `IN_PRODUCTION`, not `ACKNOWLEDGED`.** A bad transition should
return `409 invalid_target_status` (unchanged code).

## New / changed fields on the target payload

- `lines[].kind` — `"FINISHED_GOOD" | "RESALE" | "RAW_MATERIAL"`. The kitchen UI
  splits made items (produced) from resale items (set aside). If omitted the
  frontend defaults a line to `FINISHED_GOOD`, so please send it.
- `lines[].produced` — `boolean`. Set per line as the kitchen marks it ready.
- `allocations[]` — present once allocated. Same shape as the dispatch-request
  allocations already in use:
  `{ id, line_item_id, product_id, product_name, branch_id, branch_name, quantity, status }`
  where `status` is `"ALLOCATED" | "DISPATCHED" | "RECEIVED"`.

## New endpoints

### Kitchen (KITCHEN_MANAGER, auto-scoped to caller's kitchen)

| Method & path | Transition | Notes |
|---|---|---|
| `POST /kitchen/production-targets/{id}/start` | `ACKNOWLEDGED → IN_PRODUCTION` | |
| `POST /kitchen/production-targets/{id}/lines/{lineId}/produced` | marks one line `produced=true` | only while `IN_PRODUCTION` |
| `POST /kitchen/production-targets/{id}/complete` | `IN_PRODUCTION → COMPLETED` | **reject unless every line `produced`**; notify Admin |
| `POST /kitchen/production-targets/{id}/dispatch` | `ALLOCATED → DISPATCHED` | flips every allocation to `DISPATCHED`; notify branches |

`POST .../acknowledge` is unchanged (`PENDING → ACKNOWLEDGED`).

### Admin (owner of the restaurant)

| Method & path | Transition | Body |
|---|---|---|
| `POST /admin/production-targets/{id}/allocate` | `COMPLETED → ALLOCATED` | `{ note?, allocations: [{ line_id, branch_id, quantity }] }` |

Validation for allocate (mirror the dispatch-request allocate):
- Whole positive quantities; unknown branch → `404`; a branch from another
  restaurant → `404` (don't leak scope).
- A line's total allocation must not exceed `line.quantity` (what was produced) →
  `409 target_allocation_exceeds_produced`.
- Validate the whole body before mutating (no half-recorded splits).

### Branch — reuse the existing delivery endpoints

The branch confirms receipt on its existing **Incoming** screen, not a new one.
So the dispatched target's allocations must appear in, and be receivable via, the
**existing** branch delivery endpoints:

- `GET /branch/deliveries` must also return dispatched/received **production-target**
  allocations for the caller's branch (alongside the current `KITCHEN_TO_ADMIN`
  request allocations). Each row: `{ id, request_id, from_label, product_id,
  product_name, quantity, status, created_at }` — `id` is the allocation id,
  `request_id` may carry the target id, `from_label` the kitchen name.
- `POST /branch/deliveries/{allocationId}/receive` must accept a target
  allocation id, mark it `RECEIVED`, and when **all** of a target's allocations
  are received, set the target to `RECEIVED`.

## Stock movement (the one thing the mock does NOT do)

Per the product owner, the mock is intentionally **status-only**. On the **live**
backend, inventory must move with the statuses:

- **Complete / produce** — credit the kitchen's finished-goods stock for the made
  lines (resale lines are already held stock).
- **Dispatch** (`ALLOCATED → DISPATCHED`) — debit the kitchen for every allocated
  quantity. If short, leave both stock and status untouched and return
  `409 insufficient_stock` with the usual rich payload.
- **Branch receive** — credit the branch's stock for that allocation.

This matches how the existing `KITCHEN_TO_ADMIN` dispatch → allocate → dispatch →
branch-receive flow already moves stock; the production-target flow should reuse
the same stock primitives.

## Notifications

The frontend already deep-links `entity_type: "production_target"` for ADMIN,
KITCHEN_MANAGER, and (new) BRANCH_MANAGER (→ `/branch/deliveries`). Please emit
notifications with that `entity_type` and the target id at: acknowledge (→Admin),
complete (→Admin), allocate (→Kitchen), dispatch (→each Branch), fully received
(→Kitchen).
