## task_007_declarative_settings_tab_getsettingdefinitions - Declarative settings tab (getSettingDefinitions)
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
- [ ] Wave 1: pure definitions builder in `src/settings/settingDefinitions.ts` with tests.
- [ ] Wave 2: new tab class on top of it, wired in `main.ts`, lint and build green.
- [ ] Wave 3: remove the old tab in its own commit.
- [ ] Use `python3 -m logics_manager flow progress task task_007_declarative_settings_tab_getsettingdefinitions.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_007_declarative_settings_tab_getsettingdefinitions.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
