## prod_001_stacks_a_shelf_for_your_media_notes - Stacks: a shelf for your media notes
> Date: 2026-10-16
> Status: Proposed
> Related request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
> Related backlog: (none yet)
> Related task: (none yet)
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Stacks turns the notes you already keep about books, comics, games, films and series into a library you can see and use: a shelf of covers, a board by status, a list, and an "Up next" queue that respects series order. Everything lives in your notes' frontmatter, so nothing is locked in a database and the plugin can be removed without losing data. It is built on Obsidian's stable view API (ItemView, metadata cache, processFrontMatter), not on Dataview or the Bases extension surface, so it stays fast and does not go stale after bulk edits.

It is for Obsidian users who track what they read, play and watch in plain notes and want a visual shelf and a kanban board over them without writing queries. 1.0 headline: **install, point it at a folder, and your media notes become a shelf and a board you can drag, update and add to in seconds.**

```mermaid
%% logics-kind: product
%% logics-signature: product|stacks_a_shelf_for_your_media_notes|generated
flowchart LR
    A[0.1 Current books flow] --> B[0.2 Correctness]
    B --> C[0.3 Libraries via config]
    C --> D[0.4 User-facing polish]
    D --> E[1.0 Community release]
    E --> F[1.x Filters, more media, boards beyond media]
```

# Goals
- Any user can map Stacks onto their own folders, fields and status values from the settings tab, starting from a preset (books, comics, games, films and series), with no JSON editing.
- The existing books flow (shelf, board, list, up next, progress, quick add, cover picker, undo, series) is correct under real use: external edits, rapid clicks, startup before the metadata cache is ready, catalogue failures.
- Every write goes through processFrontMatter and is undoable; notes stay readable without the plugin.
- Stacks is listed in the Obsidian community plugin directory with a README that shows what it does and how to set it up.

# Non-goals
- A database, sync service or account: notes and their frontmatter remain the only source of truth.
- Building on the Bases custom-view extension API or depending on Dataview.
- Recommendations or automatic additions to the wishlist (post-1.0, after a research spike).
- Boards for non-media notes (projects, tasks) in 1.0; the engine stays config-driven so this can come later.
- Paid or keyed catalogue APIs (Google Books, TMDB with keys) in 1.0.
- Localisation of the UI in 1.0.

# Scope and guardrails
- In: correctness of the current flows, library presets and field mapping in settings, neutral defaults, self-contained new-note templates, first-run experience, theme and mobile checks, guidelines compliance, public README, release workflow, versions.json, directory submission.
- Out: recommendations, non-media boards, new device drawings beyond those already shipped, localisation (all post-1.0).
- Guardrail: correctness before polish, polish before distribution; new ideas go to 1.1 or later unless they block a 1.0 exit signal.
- Guardrail: the public repo and README never reference the owner's private vault or its notes.

# Key product decisions
- 2026-09-24: standalone ItemViews instead of a Bases extension; shelf and board both ship.
- 2026-09-24: config-driven engine from day one; libraries are configuration, not code.
- 2026-10-16 (proposed, owner to confirm): the 1.0 bar is "works for a stranger's vault from a preset", not feature parity with the owner's setup.

# Success signals
- A fresh vault with sample notes reaches a working shelf and board from a preset in under five minutes, following only the README.
- No open correctness bug in the books flow; the unit test suite stays green and grows with each fix.
- The submission PR to obsidianmd/obsidian-releases is merged and the automated review reports no blocking issue.
- Disabling the plugin leaves every note intact and readable.

# References
- Product back-reference: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Roadmap: `road_001_stacks_to_1_0`
- Task back-reference: (none yet)
