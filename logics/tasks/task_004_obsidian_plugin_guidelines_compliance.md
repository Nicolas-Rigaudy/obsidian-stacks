## task_004_obsidian_plugin_guidelines_compliance - Obsidian plugin guidelines compliance
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Corvus
> Indicators reviewed: 2026-10-21 20:00:52

# AI Context
- Summary: Bring Stacks in line with the Obsidian developer policies and plugin guidelines: ESLint with the official plugin, manifest wording, UI text, network disclosure.
- Keywords: obsidian, plugin, guidelines, compliance
- Use when: Working on directory readiness or fixing a guideline finding.
- Skip when: The work is about features, the README text or release automation.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_004_obsidian_plugin_guidelines_compliance`

# Acceptance criteria
- AC1: `npm run lint` exists, runs the Obsidian ESLint plugin, and reports no errors.
- AC2: A checklist of the plugin guidelines is ticked in this item's notes with the commit that fixed each finding.
- AC3: The README and settings tab disclose every network request and that nothing is sent without a user action.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_004_obsidian_plugin_guidelines_compliance.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_004_obsidian_plugin_guidelines_compliance.md` after implementation.

# Validation
- 2026-10-21: `npm run lint` 0 errors, 2 warnings; `npm test` (212 tests) and `npm run build` pass.
- 2026-10-20: `npm run lint` reports 0 errors (12 warnings left, below); `npm test` (190 tests) and `npm run build` pass; `logics-manager lint` OK.
- Finish workflow executed on 2026-10-21.
- Linked backlog/request close verification passed.

# Report
- b75aa29 ESLint with `eslint-plugin-obsidianmd` (`npm run lint`, `eslint.config.mjs`, run in CI); all 13 errors fixed: banned `builtin-modules` dependency replaced by `node:module`, `[object Object]` stringification, floating promises, inline style assignment (`setCssProps`), manual HTML headings (`setHeading`), deprecated `setWarning` (AC1).
- ccd0e47 Manifest: description without the plugin name, ends with a period; `isDesktopOnly: true` (owner decision 2026-10-16, mobile is 1.1). `minAppVersion` 1.13.0 kept (the API used needs it). No `fundingUrl`. LICENSE is MIT with the author's name.
- Guidelines checklist (AC2): [x] no default hotkeys (none registered); [x] command names without the plugin name; [x] no `innerHTML`/`outerHTML`; [x] no global `app` (it is passed in); [x] `requestUrl` only for network (no `fetch`/XHR); [x] listeners through `register*`; [x] no default `console` noise (two `console.error` in failure paths only); [x] styles in `styles.css`, dynamic values through `setCssProps`/`style.setProperty` of CSS variables; [x] settings headings via `setHeading` (b75aa29); [x] popout-safe timers in the plugin (`window.setTimeout`, b75aa29).
- Network disclosure (AC3): the settings tab lists the five services and that lookups happen only while searching (`Catalogue lookups` section, 9234907); the README has a table of every host and what is sent (cfa01e6).
- Open warnings, left on purpose: 7 `ui/sentence-case` on proper nouns (Steam, Wikipedia...) and examples (heuristic false positives); `prefer-setting-definitions` and `display()` deprecation: migrating the settings tab to the declarative `getSettingDefinitions` API (1.13) is a rewrite of the tab and is worth a separate item; `this.update()` follows from it.
- Declarative settings API landed (034181d, a0ce393): the `prefer-setting-definitions` and `display()` warnings are gone. The network wording in the settings tab (`Catalogue lookups`) and the README still matches the five services. 2 `ui/sentence-case` warnings remain on purpose (an example string and the proper noun Game Boy Advance).
- Finished on 2026-10-21.
- Linked backlog item(s): `item_004_obsidian_plugin_guidelines_compliance`
- Related request(s): `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
