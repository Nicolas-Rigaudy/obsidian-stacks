## item_004_obsidian_plugin_guidelines_compliance - Obsidian plugin guidelines compliance
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-19 15:51:55

# AI Context
- Summary: Bring code, manifest and repo in line with the Obsidian plugin guidelines and the directory's automated review.
- Keywords: guidelines, review, manifest, compliance, eslint, obsidianmd, submission requirements
- Use when: Preparing the 1.0 release or answering review feedback.
- Skip when: The work is feature development.

# Problem
- Stacks has never been checked against the Obsidian developer policies and plugin guidelines that the directory review applies.

# Scope
- In:
  - Add ESLint to the repo (config, dev dependencies, `npm run lint` script) with the official Obsidian plugin (`eslint-plugin-obsidianmd`); the repo has no ESLint today. Owner decision 2026-10-19: ESLint lands with this item, not with task_001.
  - Run it and fix its findings.
  - Manifest: description wording per the guidelines (short, no "Obsidian", ends with a period), correct `minAppVersion`, `isDesktopOnly` decided in item_003, `fundingUrl` only if wanted.
  - Code review against the guidelines: no default hotkeys, command names without the plugin name, sentence case in UI text, settings headings via `setHeading`, no `innerHTML` with user data, no global `app`, no leaked listeners (register* helpers), views not detached on unload, `requestUrl` for network, no console noise, styles in `styles.css` rather than inline.
  - Network disclosure: list every external service queried (Open Library, Steam, Wikipedia, TVmaze, Kitsu) and when, as the developer policies require.
  - LICENSE and author fields checked.
- Out:
  - README writing (item_005) and release automation (item_006).

# Acceptance criteria
- AC1: `npm run lint` exists, runs the Obsidian ESLint plugin, and reports no errors.
- AC2: A checklist of the plugin guidelines is ticked in this item's notes with the commit that fixed each finding.
- AC3: The README and settings tab disclose every network request and that nothing is sent without a user action.

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
- Rationale: Directory review blocks on guideline violations.

# Notes
- Roadmap milestone: 1.0 - Community release (`road_001_stacks_to_1_0`).
