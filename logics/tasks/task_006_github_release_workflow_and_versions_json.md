## task_006_github_release_workflow_and_versions_json - GitHub release workflow and versions.json
> From version: 0.1.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Corvus
> Indicators reviewed: 2026-10-20 18:13:33

# AI Context
- Summary: CI on pushes and pull requests, a tag-triggered draft release with main.js, manifest.json and styles.css, and a version consistency check.
- Keywords: github, release, workflow, versions, json
- Use when: Releasing or changing the workflows.
- Skip when: The work is about features or the README.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_006_github_release_workflow_and_versions_json`

# Acceptance criteria
- AC1: Pushing tag `0.x.y` produces a draft release with exactly main.js, manifest.json and styles.css attached.
- AC2: The tag, `manifest.json` version and the latest `versions.json` entry always match.
- AC3: CI fails a pull request when tests or the build fail.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_006_github_release_workflow_and_versions_json.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_006_github_release_workflow_and_versions_json.md` after implementation.

# Validation
- 2026-10-20: `node scripts/check-release.mjs` passes on the repo and refuses a `v` prefix; `tests/release.test.ts` (5 tests); `npm test` and `npm run build` pass. The workflows have not run on GitHub yet.

# Report
- 76dcb76 `.github/workflows/ci.yml` (tests and build on push to master and every pull request, AC3; lint added in b75aa29) and `.github/workflows/release.yml` (tag `x.y.z`: consistency check, tests, build, draft release with the three assets, AC1). `.npmrc` sets an empty tag prefix so `npm version` tags `x.y.z`; `version-bump.mjs` keeps `manifest.json` and `versions.json` in step; `scripts/check-release.mjs` and its tests fail when tag, package, manifest and last `versions.json` entry differ (AC2).
- Left, for the owner: AC1 needs a real tag push to see the draft release (publishing is a release action, not done); check the first CI run on GitHub.

# Links
- Request: `req_000_stacks_1_0_in_the_obsidian_community_plugin_directory`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
