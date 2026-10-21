## item_008_declarative_settings_tab_getsettingdefinitions - Declarative settings tab (getSettingDefinitions)
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-21 19:57:28

# AI Context
- Summary: Move the settings tab from the imperative display() to Obsidian's declarative getSettingDefinitions API (1.13), so the settings are searchable and the directory lint rules pass.
- Keywords: declarative, settings, tab, getsettingdefinitions
- Use when: Changing the settings tab or answering review feedback about prefer-setting-definitions.
- Skip when: The work is on the settings data model rather than the tab.

# Problem
- The tab is built with `display()`, deprecated since Obsidian 1.13, and the lint rule `prefer-setting-definitions` warns about it (left open in item_004). Owner decision 2026-10-21: migrate before 1.0. `manifest.json` already requires 1.13.0, so no version gate is needed.

# Scope
- In:
  - A pure definitions builder (no `obsidian` runtime import) with tests, then a new tab class on top of it.
  - Libraries as pages, statuses and filter chips as lists, native folder and dropdown controls.
  - Keep the old tab until the tests for the new one pass, then remove it in a separate commit.
- Out:
  - Any change to the settings data model or to what each setting does.
  - Checks inside Obsidian (paused for the owner with exact steps).

# Acceptance criteria
- AC1: The tab defines its settings through `getSettingDefinitions()` and has no `display()`.
- AC2: Every setting of the old tab is reachable and edits the same field; tests cover this.
- AC3: `npm test`, `npm run lint` and `npm run build` pass; the `prefer-setting-definitions` warning is gone.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: bounded delivery slice.
- request-AC2 -> This backlog slice. Proof: promotable backlog item.
- request-AC3 -> This backlog slice. Proof: delivery chain includes a task-ready backlog item.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: (to be linked)
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Owner wants it before 1.0; the lint warning is otherwise left in the submission.

# Notes
- Roadmap milestone: 1.0 - Community release (`road_001_stacks_to_1_0`). Follows from item_004.

# Tasks
- `task_007_declarative_settings_tab_getsettingdefinitions`
