## task_003_self_contained_new_notes_and_catalogue_settings - Self-contained new notes and catalogue settings
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
> Indicators reviewed: 2026-10-20 18:09:22

# AI Context
- Summary: New notes from quick add are plain Markdown with an optional per-library template, and catalogue choices (sources per library, Steam region and language, default status) are settings.
- Keywords: self, contained, new, notes, catalogue, settings
- Use when: Working on note creation, templates or catalogue lookups.
- Skip when: The work is about views, library presets or release packaging.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_002_self_contained_new_notes_and_catalogue_settings`

# Acceptance criteria
- AC1: A note created by quick add in a vault without Dataview renders its cover and contains no `dataviewjs` block by default.
- AC2: A user template file, when set, is used for new notes and its placeholders are filled.
- AC3: The Steam region and the catalogues per library are configurable and respected by quick add and the cover picker.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_003_self_contained_new_notes_and_catalogue_settings.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_003_self_contained_new_notes_and_catalogue_settings.md` after implementation.

# Validation
- 2026-10-20: `npm run build` and `npm test` pass (181 tests, new ones in `tests/newNote-undo.test.ts` and `tests/catalogOptions.test.ts`); no ESLint yet (item_004).
- Manual check in Obsidian still needed for AC1 (quick add in a vault without Dataview shows the cover) and AC3 (network lookups with a region and sources switched off). No GUI or network checks in the implementing session.

# Report
- Default body is plain Markdown: heading, `![cover|240](url)` embed, creator and source lines; no `dataviewjs` (tested, AC1).
- Optional per-library template file (`templatePath`): body and extra frontmatter with `{{title}} {{creator}} {{category}} {{status}} {{cover}} {{year}} {{isbn}} {{link}} {{platform}} {{total}} {{date}}`; Stacks' own fields always win; a missing file falls back to the built-in body with a notice (AC2, tested).
- Catalogues per library (`disabledCatalogs`, `src/catalog/sources.ts`), default status for new items, global Steam region and language (`catalog` in settings); respected by quick add and the cover picker (AC3). Data saved before 0.3 keeps region FR, fresh installs get US/english.
- The network disclosure text in the settings tab is a first draft; the full disclosure belongs to item_004.
- Left: manual checks AC1 and AC3 in Obsidian by the owner, then closeout.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
