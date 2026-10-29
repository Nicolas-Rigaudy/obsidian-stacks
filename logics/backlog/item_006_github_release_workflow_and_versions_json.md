## item_006_github_release_workflow_and_versions_json - GitHub release workflow and versions.json
> From version: 0.1.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-10-20 18:13:33

# AI Context
- Summary: Automate releases: a GitHub Actions workflow that builds on a version tag and publishes main.js, manifest.json and styles.css, with versions.json kept in sync.
- Keywords: release, github actions, workflow, tag, versions.json, manifest, main.js, styles.css
- Use when: Cutting a release or changing the build.
- Skip when: The work is feature development.

# Problem
- There is no release automation. The directory installs plugins from GitHub release assets, so each release must carry `main.js`, `manifest.json` and `styles.css`, tagged with the exact manifest version (no `v` prefix).

# Scope
- In:
  - `.github/workflows/release.yml`: on a tag push, `npm ci`, `npm test`, `npm run build`, then create a draft GitHub release with the three assets.
  - `npm version` flow via `version-bump.mjs` updating `manifest.json` and `versions.json` together; document it in the README contributing section.
  - `versions.json` maps each released version to its `minAppVersion`.
  - A CI workflow running tests and build on pushes and pull requests.
- Out:
  - Beta channel through BRAT (optional, post-1.0).

# Acceptance criteria
- AC1: Pushing tag `0.x.y` produces a draft release with exactly main.js, manifest.json and styles.css attached.
- AC2: The tag, `manifest.json` version and the latest `versions.json` entry always match.
- AC3: CI fails a pull request when tests or the build fail.

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
- Rationale: The directory installs from release assets; no release, no listing.

# Notes
- Roadmap milestone: 1.0 - Community release (`road_001_stacks_to_1_0`).
- Task `task_006_github_release_workflow_and_versions_json` was finished via `logics-manager flow finish task` on 2026-10-29.

# Tasks
- `task_006_github_release_workflow_and_versions_json`
