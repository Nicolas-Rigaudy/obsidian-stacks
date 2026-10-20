## item_001_neutral_defaults_and_library_presets - Neutral defaults and library presets
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-20 18:06:32

# AI Context
- Summary: Replace the owner-specific default settings with neutral defaults and selectable library presets so any vault can be configured from the settings tab.
- Keywords: settings, presets, defaults, libraries, folders, fields, status mapping, config
- Use when: Working on the 0.3 milestone or on how libraries are defined.
- Skip when: The work is about the books flow correctness or release packaging.

# Problem
- `src/settings/settings.ts` ships defaults that point at one specific vault's folder layout, field names and status values. On any other vault the plugin indexes nothing and the user has to guess how to map their notes.

# Scope
- In:
  - Neutral defaults: no folder preset, no library enabled until the user picks one.
  - Presets for books, video games and films/series (required for 1.0, owner decision 2026-10-16), plus comics and anime if cheap, each defining category, status vocabulary (with board column order), progress field and total, series fields, and cover field.
  - Settings tab flow: add a library from a preset, choose its folder(s) with folder suggest, rename statuses and fields, remove it.
  - Validation and inline hints when a folder is empty or a field is missing from the notes found.
  - Migration of existing saved settings so the owner's current setup keeps working unchanged.
- Out:
  - Non-media boards (post-1.0).
  - Template and catalogue settings (item_002).

# Acceptance criteria
- AC1: A fresh install indexes nothing and shows no owner-specific path anywhere in settings or code defaults.
- AC2: Adding a "Books" library from its preset and choosing a folder of book notes shows them on the shelf and the board with no further edits.
- AC3: Status values and field names can be remapped from the settings tab, and views follow immediately.
- AC4: Existing saved settings load unchanged (covered by tests in `tests/settings.test.ts`).

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
- Rationale: Without neutral defaults the plugin is unusable outside one vault.

# Notes
- Roadmap milestone: 0.3 - Libraries via config (`road_001_stacks_to_1_0`).

# Tasks
- `task_002_neutral_defaults_and_library_presets`
