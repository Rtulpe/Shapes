# Agent Guidelines for working on Shapes

Purpose
- Provide clear rules and expectations for future agents editing or extending this repository.

Repository notes
- The codebase is a simple browser-based game located at `zabka.html` and `js/` modules.
- Preserve the Apache-2.0 license in the repository root and include a short attribution comment in any new or modified files when appropriate.

Agent workflow
- Create a feature branch per task and include the ticket/issue id in the branch name: `agent/<short-desc>`.
- Commit messages: start with a verb, reference the change, and include `AGENT` tag, e.g. "Add collision damping (AGENT): improve physics".
- Run the app locally after changes: serve the repo and visually verify behavior in a browser.
- Add or update tests where relevant; if no test framework exists, add a minimal smoke-test or instructions in the README.

Code style and safety
- Prefer small, focused changes. Keep functions short and single-responsibility.
- Avoid rewriting large files unless necessary; prefer incremental refactors with tests.
- Do not commit secrets, keys, or credentials.

Documentation
- Update `README.md` for visible user-facing changes and add usage notes for new features.
- Add inline comments for non-obvious logic and reference related files.

File additions
- New files should include a one-line header comment stating the license and a short purpose line.

Testing & verification
- If modifying game logic, add a simple reproducible scenario and instructions in `guidelines.md` or `README.md`.
- Manual verification in browser is acceptable for visual features; document the steps.

When in doubt
- Open an issue describing the proposed change and wait for approval before major rewrites.
