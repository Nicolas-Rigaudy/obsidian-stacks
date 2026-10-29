## task_002_neutral_defaults_and_library_presets - Neutral defaults and library presets
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Corvus
> Indicators reviewed: 2026-10-29 18:16:37

# AI Context
- Summary: Ship neutral defaults and selectable library presets so any vault is configured from the settings tab, with pre-0.3 saved settings migrated unchanged.
- Keywords: neutral, defaults, library, presets
- Use when: Working on library definition, presets, saved-settings migration or the settings tab library list.
- Skip when: The work is about books flow correctness, new-note templates or release packaging.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_001_neutral_defaults_and_library_presets`

# Acceptance criteria
- AC1: A fresh install indexes nothing and shows no owner-specific path anywhere in settings or code defaults.
- AC2: Adding a "Books" library from its preset and choosing a folder of book notes shows them on the shelf and the board with no further edits.
- AC3: Status values and field names can be remapped from the settings tab, and views follow immediately.
- AC4: Existing saved settings load unchanged (covered by tests in `tests/settings.test.ts`).

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_002_neutral_defaults_and_library_presets.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_002_neutral_defaults_and_library_presets.md` after implementation.

# Validation
- 2026-10-20: `npm run build` and `npm test` pass (169 tests, 14 new in `tests/settings.test.ts`, `tests/hints.test.ts`, `tests/newNote-undo.test.ts`); no ESLint yet (item_004).
- 2026-10-29: 91a466c `tests/liveIndex.test.ts` checks that a field remapped in settings reaches the index on the next rebuild without an edit to the note (AC3, index side); `npm test` (218) passes.
- Manual check in Obsidian still needed for AC2 and AC3 (add Books from the preset in the settings tab, pick a folder, see shelf and board; rename a status and see views follow). No GUI in the implementing session.

# Report
- Neutral defaults: a fresh install has no library; `DEFAULT_SETTINGS.mediaTypes` is empty (AC1, tested). The owner-specific configs moved to `src/settings/legacy.ts`, used only to migrate data saved before 0.3.
- Migration: saved data without `version` is merged over the legacy libraries, then written back in full once at version 2 (`needsMigration`, `src/main.ts`); versioned data stands alone (AC4, tested). After the owner's data has been saved once, `legacy.ts` can be deleted.
- Presets (`src/settings/presets.ts`): books, video games, films & series, comics, anime; no folder, no vault-specific fields (tested). Settings tab: add a library from a preset, remove it, folder suggest, status and field remapping (existing).
- Hints (`src/settings/hints.ts`): missing folder, empty library, notes without a status or with an unlisted status.
- New notes no longer force `type: log` / `area: personal` unless the library's extras name them.
- Note: quick-add commands per library are registered at load, so a library added in settings gets its own command after a reload; "Add to library…" works at once.
- Left: manual checks AC2 and AC3 in Obsidian by the owner, then closeout.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
