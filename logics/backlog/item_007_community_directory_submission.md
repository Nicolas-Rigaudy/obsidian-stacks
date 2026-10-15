## item_007_community_directory_submission - Community directory submission
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
- Summary: Submit Stacks to the Obsidian community plugin directory and follow the review to merge.
- Keywords: submission, obsidian-releases, community-plugins.json, review, pull request, 1.0.0
- Use when: The 1.0 release is published and the guidelines pass is done.
- Skip when: Any 1.0 prerequisite (items 004 to 006) is still open.

# Problem
- Listing requires a pull request to obsidianmd/obsidian-releases adding Stacks to `community-plugins.json`, and passing the automated and human review.

# Scope
- In:
  - Publish the `1.0.0` GitHub release with the three assets.
  - Open the PR adding `{ id: "stacks", name: "Stacks", author, description, repo: "Nicolas-Rigaudy/obsidian-stacks" }`, with the description identical to `manifest.json`.
  - Answer the automated bot findings and reviewer comments; ship fixes as patch releases.
  - Confirm the plugin id `stacks` is still free right before submitting.
- Out:
  - Announcements (forum, Reddit) beyond a short forum post, which is optional.

# Acceptance criteria
- AC1: The PR passes the automated validation.
- AC2: The PR is merged and Stacks installs from the in-app community plugin browser.

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
- Rationale: This is the 1.0 exit signal.

# Notes
- Roadmap milestone: 1.0 - Community release (`road_001_stacks_to_1_0`).
