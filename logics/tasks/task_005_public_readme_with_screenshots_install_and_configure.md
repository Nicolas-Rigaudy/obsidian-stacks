## task_005_public_readme_with_screenshots_install_and_configure - Public README with screenshots, install and configure
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Corvus
> Indicators reviewed: 2026-10-20 18:13:33

# AI Context
- Summary: A user-facing README with what, install, configure, network use and contributing, a sample vault and no personal paths.
- Keywords: public, readme, screenshots, install, configure
- Use when: Editing the README, the sample vault or the dev-loop docs.
- Skip when: The work is about the code or release automation.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_005_public_readme_with_screenshots_install_and_configure`

# Acceptance criteria
- AC1: The README contains no reference to the private vault, its notes or local absolute paths; `scripts/deploy.sh` has no personal default path.
- AC2: A user following only the README installs Stacks and gets a working library from a preset.
- AC3: Screenshots are generated from the sample vault and stored in the repo.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_005_public_readme_with_screenshots_install_and_configure.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_005_public_readme_with_screenshots_install_and_configure.md` after implementation.

# Validation
- 2026-10-20: `tests/sampleVault.test.ts` checks that each preset shows the sample notes without edits; `npm test` (190) passes. No private path in README or `scripts/deploy.sh`.

# Report
- cfa01e6 README rewritten (AC1): two-sentence description, views, install (directory and manual), first library from a preset, example frontmatter, `stacks` code block, new notes and templates, network table, develop and release steps. `scripts/deploy.sh` now requires `STACKS_VAULT` (no default). `sample-vault/` holds invented notes for books, games, films and series.
- Left, for the owner: AC3 screenshots (they must show the final look, so they wait for 0.4 and need a visual pass); AC2 hand check that a stranger can follow the README; `tools/preview` still reads snapshot files from a private vault (gitignored, never committed): a sample-vault based snapshot would let the screenshots be generated.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
