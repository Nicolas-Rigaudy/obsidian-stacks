## task_001_books_flow_correctness_pass - Books flow correctness pass
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 90%
> Progress: 95%
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
- 2026-10-19: `npm run build` (tsc + esbuild) and `npm test` pass (150 tests, 15 new); `logics-manager lint` OK. No ESLint is configured in the repo.
- 2026-10-19 (after owner decisions): `npm run build` and `npm test` pass (155 tests, 5 new in `tests/correction.test.ts`); `logics-manager lint` OK. ESLint moved to item_004.
- 2026-10-29: `npm test` (218), `npm run build` and `npm run lint` (0 errors) pass. `tests/liveIndex.test.ts` drives `LiveIndex` with a stubbed `obsidian` module; removing the rebuild on a metadata change fails 3 of its tests.
- Manual checks in Obsidian still needed for AC1-AC4 (no GUI in the implementing session).

# Report
- 2085394 Quick add keeps "Create without a match" when the search fails (AC4).
- 8bee46d Games/films search reports a failure when every catalogue is unreachable instead of "Nothing found" (`mergeSettled`, tested) (AC4).
- 825d32c Catalogue failures explained in words (offline, rate limit, server error, unreadable answer) in quick add and the cover picker (`catalogErrorMessage`, tested) (AC4).
- 1786e02 "Rescan libraries" command.
- 2bb55c6 Loading state until the metadata cache has resolved at startup, with a 5 s fallback after layout ready (`ReadyGate`, tested) (AC2).
- 6c577d1 Progress clicks: one log line and one Undo per burst, restoring the value from before the first click (`Bursts`, tested) (AC3).
- AC1: code review found no gap (metadata `changed`, vault `delete`/`rename` all mark libraries dirty; tabs, embeds and the series panel re-render on `changed`); needs the manual check.
- fc665c2 Typed page correction: same toast and Undo as clicks; Undo restores the value from before the correction; settles any open click burst first, so each keeps its own Undo (tested).
- 5ad4be9 `LiveIndex` tests (AC1, AC2): a metadata change in a library folder rebuilds that library with the new value; a burst rebuilds once; changes outside every folder are ignored; new notes, deletes and renames show up; `ready` stays false until the cache resolves.
- Left: manual checks for AC1-AC4 in Obsidian by the owner, then closeout.

# Decisions
- 2026-10-19 (owner): one log line and one Undo per burst of progress clicks (1.2 s quiet period), Undo back to before the first click. Commit 6c577d1 stays.
- 2026-10-19 (owner): a typed page correction gets the same toast and Undo as clicks (fc665c2). Its log line keeps the "corrected" note.
- 2026-10-19 (owner): ESLint is added as part of item_004 (Obsidian plugin guidelines), not in this task.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): `prod_001_stacks_a_shelf_for_your_media_notes`
- Architecture decision(s): (none yet)
