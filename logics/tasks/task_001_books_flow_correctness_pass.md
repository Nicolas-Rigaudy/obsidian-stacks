## task_001_books_flow_correctness_pass - Books flow correctness pass
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Corvus
> Indicators reviewed: 2026-10-19 15:09:03

# AI Context
- Summary: Fix the correctness gaps in the books flow (external edits, cold start, rapid writes, catalogue failures), one bug per commit with regression tests.
- Keywords: books, flow, correctness, pass
- Use when: Implementing milestone 0.2 or fixing a bug in the shelf, board, list or up-next flow.
- Skip when: The work is about presets, new libraries or release packaging.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_000_books_flow_correctness_pass`

# Acceptance criteria
- AC1: An edit made to a note outside Obsidian shows up in every open Stacks view and embed within a second, without reopening it.
- AC2: Opening Obsidian with a Stacks tab restored shows a loading state, then the full library, never an empty or partial shelf.
- AC3: Ten rapid progress clicks on one note end with the expected value and one undo restores the previous one.
- AC4: With the network off, quick add and the cover picker show a clear notice and do not throw.
- AC5: `npm test` and `npm run build` pass, with new regression tests for each fix.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_001_books_flow_correctness_pass.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_001_books_flow_correctness_pass.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): `prod_001_stacks_a_shelf_for_your_media_notes`
- Architecture decision(s): (none yet)
