## item_005_public_readme_with_screenshots_install_and_configure - Public README with screenshots, install and configure
> From version: 0.1.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Replace the developer README with a user-facing one: what Stacks is, screenshots, install, configure, network use, and a short contributing section.
- Keywords: readme, documentation, screenshots, install, configure, users
- Use when: Preparing the 1.0 release or changing user-visible behaviour.
- Skip when: The work is internal refactoring.

# Problem
- The current README is a dev-loop note that references private design documents and a hardcoded local vault path. It does not tell a user what Stacks does or how to set it up.

# Scope
- In:
  - What it is in two sentences, with screenshots or a short GIF of the shelf, board, list and up next (from a sample vault, never the owner's vault).
  - Install: from the community directory, and manual install from a GitHub release.
  - Configure: add a library from a preset, map folders, fields and statuses, example frontmatter for each preset, the `stacks` code block syntax.
  - Network use and privacy section (from item_004).
  - Contributing: dev loop with a configurable vault path (`STACKS_VAULT` with no personal default), tests, preview harness.
  - A sample vault folder (or fixture notes) used for screenshots and manual testing.
- Out:
  - A documentation site.

# Acceptance criteria
- AC1: The README contains no reference to the private vault, its notes or local absolute paths; `scripts/deploy.sh` has no personal default path.
- AC2: A user following only the README installs Stacks and gets a working library from a preset.
- AC3: Screenshots are generated from the sample vault and stored in the repo.

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
- Rationale: The directory listing shows the README; it must be user-facing.

# Notes
- Roadmap milestone: 1.0 - Community release (`road_001_stacks_to_1_0`).
