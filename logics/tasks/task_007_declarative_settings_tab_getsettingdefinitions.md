## task_007_declarative_settings_tab_getsettingdefinitions - Declarative settings tab (getSettingDefinitions)
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: night
> Indicators reviewed: 2026-10-21 19:57:28

# AI Context
- Summary: Rebuild the settings tab on getSettingDefinitions (Obsidian 1.13), then remove the old display() tab.
- Keywords: declarative, settings, tab, getsettingdefinitions
- Use when: Changing the settings tab.
- Skip when: The change is to the settings data model.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_008_declarative_settings_tab_getsettingdefinitions`

# Acceptance criteria
- AC1: The tab defines its settings through `getSettingDefinitions()` and has no `display()`.
- AC2: Every setting of the old tab is reachable and edits the same field; tests cover this.
- AC3: `npm test`, `npm run lint` and `npm run build` pass; the `prefer-setting-definitions` warning is gone.

# Plan
- [x] Wave 1: pure definitions builder in `src/settings/settingDefinitions.ts` with tests.
- [x] Wave 2: new tab class on top of it, wired in `main.ts`, lint and build green.
- [x] Wave 3: remove the old tab in its own commit.
- [ ] Use `python3 -m logics_manager flow progress task task_007_declarative_settings_tab_getsettingdefinitions.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_007_declarative_settings_tab_getsettingdefinitions.md` after implementation.

# Validation
- `npm test` 208 pass (17 new in `tests/settingDefinitions.test.ts`: key uniqueness, every field class, toggles that drop a group, lists, validation); `npm run lint` 0 errors, the `prefer-setting-definitions`, `prefer-update-over-display` and `no-deprecated` warnings of the old tab are gone; `npm run build` OK.
- Not verified inside Obsidian: see Report.

# Report
- API checked in `node_modules/obsidian/obsidian.d.ts` (1.13.1 typings): `getSettingDefinitions`, `update`, `refreshDomState`, `getControlValue`/`setControlValue`, `folder`/`dropdown`/`text`/`toggle`/`textarea` controls and `page`/`group`/`list` items are all `@since 1.13.0`. `manifest.json` already says `minAppVersion` 1.13.0, so no version gate.
- Design: `src/settings/settingDefinitions.ts` is pure (type-only obsidian imports) and holds a key → field binding table; `definitionsTab.ts` is the thin `PluginSettingTab`. Each library is a page; statuses and filter chips are lists (drag to reorder, delete) with imperative rows; folders use the native folder control; the Steam fields use `validate` instead of ignoring bad input.
- Behaviour changes to know about: libraries are pages instead of collapsible sections; status and chip order is by drag handle instead of up/down buttons; bad Steam region or language now shows an inline message.
- `src/settings/folderSuggest.ts` is no longer used (the native folder control replaced it); left in place.
- Left for the owner, to check in Obsidian: list `onReorder` index semantics and that `update()` re-renders the open page after add and delete; the `render` rows for statuses and chips; the warning status on a library page.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
