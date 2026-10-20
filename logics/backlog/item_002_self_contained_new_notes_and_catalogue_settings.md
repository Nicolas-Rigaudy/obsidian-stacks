## item_002_self_contained_new_notes_and_catalogue_settings - Self-contained new notes and catalogue settings
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-20 18:09:22

# AI Context
- Summary: Make notes created by quick add independent of other plugins, and expose the catalogue choices that are currently hardcoded.
- Keywords: new note, template, dataview, cover, catalogue, steam region, providers, settings
- Use when: Working on note creation or catalogue lookups in the 0.3 milestone.
- Skip when: The work is about views or release packaging.

# Problem
- `src/logic/newNote.ts` writes a `dataviewjs` cover block into new notes, an implicit dependency on Dataview that breaks the "no Dataview" promise for other users.
- `src/catalog/providers.ts` fixes the Steam store region, and users cannot choose which catalogues a library queries or the folder per category for new notes.

# Scope
- In:
  - New-note body uses plain Markdown (a cover image embed or none) by default, with an optional user template file per library.
  - Settings per library: folder for new notes per category, catalogues to query, default status for new items.
  - Global setting for the store region / language used by catalogue lookups.
  - Tests for note building and filenames with the new options.
- Out:
  - New catalogues or keyed APIs.

# Acceptance criteria
- AC1: A note created by quick add in a vault without Dataview renders its cover and contains no `dataviewjs` block by default.
- AC2: A user template file, when set, is used for new notes and its placeholders are filled.
- AC3: The Steam region and the catalogues per library are configurable and respected by quick add and the cover picker.

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
- Rationale: Notes created by Stacks must not depend on another plugin.

# Notes
- Roadmap milestone: 0.3 - Libraries via config (`road_001_stacks_to_1_0`).

# Tasks
- `task_003_self_contained_new_notes_and_catalogue_settings`
