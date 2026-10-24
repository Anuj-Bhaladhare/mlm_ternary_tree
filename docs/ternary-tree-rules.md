# Ternary tree rules

The genealogy is a ternary placement tree. A member has at most one placement
parent and each parent can have at most one child in each of the `LEFT`,
`MIDDLE`, and `RIGHT` positions.

## Root and placement

- At most one root is permitted; initial setup creates it. The root has
  `is_root = true`, a null `parent_id`, and a null `position`.
- Every non-root member has a parent and one of `LEFT`, `MIDDLE`, or `RIGHT`.
- PostgreSQL enforces parent/position consistency, the root shape, a single
  root, unique occupied `(parent_id, position)` slots, and no self-parent.
- `sponsor_id` is separate from `parent_id`; a sponsor is not necessarily the
  placement parent.
- Placement is currently explicit: the creator supplies the parent and slot.
  Automatic placement and spillover are not implemented.
- Member creation locks the selected parent and inserts the member plus its
  audit record in one transaction. The unique slot index remains the final
  concurrency guard.
- Ordinary member updates do not change placement. The application does not
  currently support moving existing members; any future correction workflow
  must validate descendants and cycles and record placement history.
- Members are not physically deleted; the foreign keys use restrictive delete
  behavior to protect genealogy and audit history.

## Traversal and subtree counts

Recursive PostgreSQL CTEs traverse descendants. The `LEFT`, `MIDDLE`, and
`RIGHT` subtree counts classify every descendant by the first position below
the selected member. The total descendant count is the sum of those three
subtree counts. These are placement metrics, not direct referrals; direct
referrals are determined from `sponsor_id`.

The current visualization expands a bounded number of levels and can focus on
a member by member code. It displays all three child slots and indicates an
occupied slot separately from an available slot.

## Compensation

Ternary subtree matching, triad/cycle bonuses, carry-forward, rates, caps, and
rounding are not defined by the tree structure. They must not be calculated
until an approved compensation plan specifies those rules.

## Database upgrade

Existing `LEFT` and `RIGHT` placements remain valid. A forward-only migration
adds `MIDDLE` to the `member_position` enum; existing rows and root records are
not rewritten.
