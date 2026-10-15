## req_000_stacks_1_0_in_the_obsidian_community_plugin_directory - Stacks 1.0 in the Obsidian community plugin directory
> From version: 0.1.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Umbrella request to take Stacks from a single-vault 0.1.0 plugin to a public 1.0 listed in the Obsidian community plugin directory.
- Keywords: stacks, obsidian, community plugin, 1.0, release, library, shelf, board
- Use when: Scoping or sequencing work on the path to the Stacks 1.0 public release.
- Skip when: You need details of a single feature; read the linked backlog item instead.

# Needs
- Stacks works today for one vault whose folders, fields and statuses are baked into the default settings; another Obsidian user cannot install it and get a working shelf.
- The plugin must reach the Obsidian community plugin directory: guidelines compliance, a user-facing README, a release workflow publishing the build assets, versions.json, and the submission PR to obsidianmd/obsidian-releases.
- Order the work so correctness of the existing books flow comes first, then generalising libraries through config, then user-facing polish, then distribution.

# Context
- Current state (0.1.0): standalone ItemViews (Shelf, Board, List, Up next), a `stacks` code block for embeds, a live index over the metadata cache, frontmatter writes through processFrontMatter, quick add from public catalogues (Open Library, Steam, Wikipedia, TVmaze, Kitsu), cover picker, undo toasts, search, sorting, remembered view state, ordered/loose series and Buy next.
- 135 node:test unit tests cover the pure logic in `src/logic/` and `src/settings/settings.ts`; `npm run build` type-checks and bundles cleanly.
- Gaps found while reading the code: default library folders point at one specific vault layout; new notes embed a `dataviewjs` cover block (implicit Dataview dependency); the Steam search region is fixed; the README is a developer note that points at private design docs; there is no release workflow.
- Roadmap: `road_001_stacks_to_1_0`; product brief: `prod_001_stacks_a_shelf_for_your_media_notes`.

# Acceptance criteria
- AC1: A new Obsidian user can install Stacks from the community directory, point it at their own folders and see their notes on a shelf and a board without editing JSON.
- AC2: The plugin passes the Obsidian plugin guidelines and the directory review, with a release workflow and versions.json in place.
- AC3: The work is split into backlog items linked to versioned roadmap milestones.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_001_stacks_a_shelf_for_your_media_notes`
- Architecture decision(s): (none yet)

# References
- `src/settings/settings.ts`
- `src/logic/newNote.ts`
- `src/catalog/providers.ts`
- `README.md`
- `manifest.json`

# Backlog
- `item_000_books_flow_correctness_pass`
- `item_001_neutral_defaults_and_library_presets`
- `item_002_self_contained_new_notes_and_catalogue_settings`
- `item_003_first_run_experience_empty_states_themes_and_mobile`
- `item_004_obsidian_plugin_guidelines_compliance`
- `item_005_public_readme_with_screenshots_install_and_configure`
- `item_006_github_release_workflow_and_versions_json`
- `item_007_community_directory_submission`
