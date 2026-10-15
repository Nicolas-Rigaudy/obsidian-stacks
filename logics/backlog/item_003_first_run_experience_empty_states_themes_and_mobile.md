## item_003_first_run_experience_empty_states_themes_and_mobile - First-run experience, empty states, themes and mobile
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-16 00:53:06

# AI Context
- Summary: Make the first five minutes and everyday look work for users other than the owner: onboarding, empty states, theme compatibility and mobile.
- Keywords: onboarding, first run, empty states, themes, light mode, mobile, accessibility, performance
- Use when: Working on the 0.4 polish milestone.
- Skip when: The work is about correctness or release packaging.

# Problem
- The views were designed and checked against one vault, one theme and a desktop window. A new user opening Stacks with no library sees nothing useful, and the custom shelf styling has not been checked with light mode, popular community themes, mobile or large libraries.

# Scope
- In:
  - First-run screen in the view: explain Stacks in two lines and offer "Add a library from a preset" leading to settings.
  - Empty states per screen and per bookcase/column, with a next action.
  - Theme pass: default light and dark plus two or three popular community themes; colours from CSS variables where possible.
  - Desktop only for 1.0 (owner decision 2026-10-16): set `isDesktopOnly: true` and give the reason in the README; the mobile pass moves to 1.1.
  - Keyboard and screen-reader basics: focusable controls, labels on icon buttons.
  - Performance check with about 1,000 notes in a library.
  - A generic `view: now` embed showing in-progress items across libraries.
- Out:
  - New device drawings or case styles.
  - Faceted filters (1.1).

# Acceptance criteria
- AC1: A fresh vault shows a first-run screen that leads to a working library in under five minutes.
- AC2: Every screen is legible in default light and dark themes and in the chosen community themes.
- AC3: The manifest declares `isDesktopOnly: true` and the README gives the reason (mobile is planned for 1.1).
- AC4: A 1,000-note library opens in under a second on the dev machine and scrolls without visible jank.

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
- Priority: Medium
- Rationale: Needed for 1.0 quality, but after correctness and config.

# Notes
- Roadmap milestone: 0.4 - User-facing polish (`road_001_stacks_to_1_0`).
