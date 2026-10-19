## item_000_books_flow_correctness_pass - Books flow correctness pass
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-19 15:09:03

# AI Context
- Summary: Close the remaining correctness gaps in the existing books flow before anything is generalised.
- Keywords: correctness, books, external edits, live index, startup, rescan, write races, catalogue errors
- Use when: Working on the 0.2 milestone or a bug in the shelf, board, list or up-next flow.
- Skip when: The work is about new libraries, presets or release packaging.

# Problem
- The books flow (shelf, board, list, up next, progress, quick add, cover picker, undo, series, buy next) was built and checked in phases, but some checks never ran: edits made outside Obsidian (or by other plugins) reaching an open view, behaviour before the metadata cache has resolved at startup, and rapid repeated writes on the same note.
- Catalogue lookups can fail (offline, rate limits, changed JSON) and the failure path is not covered end to end.

# Scope
- In:
  - Verify and fix external-edit propagation to every open view and embed.
  - Loading state until the metadata cache is resolved; a manual "Rescan libraries" command as a safety valve.
  - Serialised, debounced writes per note (progress bumps, drags, status changes) with undo still correct.
  - Clear notices when a catalogue is unreachable or returns nothing; quick add still offers "create without a match".
  - Regression tests in `tests/` for every bug fixed.
- Out:
  - Changes to default folders or presets (item_001).
  - New features.

# Acceptance criteria
- AC1: An edit made to a note outside Obsidian shows up in every open Stacks view and embed within a second, without reopening it.
- AC2: Opening Obsidian with a Stacks tab restored shows a loading state, then the full library, never an empty or partial shelf.
- AC3: Ten rapid progress clicks on one note end with the expected value and one undo restores the previous one.
- AC4: With the network off, quick add and the cover picker show a clear notice and do not throw.
- AC5: `npm test` and `npm run build` pass, with new regression tests for each fix.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: contributes to a stranger reaching a working shelf and board.
- request-AC2 -> This backlog slice. Proof: contributes to directory readiness.
- request-AC3 -> This backlog slice. Proof: linked to a roadmap milestone.


# Decision framing
- Product framing: Covered by `prod_001_stacks_a_shelf_for_your_media_notes`
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_001_stacks_a_shelf_for_your_media_notes`
- Architecture decision(s): (none yet)
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Primary task(s): (none yet)

# Priority
- Priority: High
- Rationale: Correctness of the existing flow gates every later milestone.

# Notes
- Roadmap milestone: 0.2 - Books flow correctness (`road_001_stacks_to_1_0`).

# Tasks
- `task_001_books_flow_correctness_pass`
