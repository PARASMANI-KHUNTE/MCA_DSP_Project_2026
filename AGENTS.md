# Project Workflow & PR Rules

## Pull Request & GitHub Copilot Review Workflow

Whenever working on issues or changes in this repository:

1. **Branching & Local Testing**:
   - Create a dedicated branch off `main` for each issue/task (`fix/<issue-topic>` or `feat/<feature-topic>`).
   - Run tests before pushing:
     - Backend tests: `python -m pytest`
     - Frontend build & check: `npm run build --prefix "India Livability Intelligence System\frontend"`
   - Push branch to origin: `git push -u origin <branch_name>`.

2. **Open PR with Copilot Review**:
   - Immediately request review from GitHub Copilot on PR creation:
     ```bash
     gh pr create --title "<type>(<scope>): <subject>" --body "Fixes #<issue>. <details>" --reviewer @copilot
     # Or using --fill:
     gh pr create --fill --reviewer @copilot
     ```
   - If adding Copilot to an existing PR:
     ```bash
     gh pr edit <PR_NUMBER> --add-reviewer @copilot
     ```

3. **Copilot Review Clearance Before Merge**:
   - **Do NOT merge immediately.** Wait for Copilot review and status checks.
   - Check review state:
     ```bash
     gh pr view <PR_NUMBER> --json reviewDecision,reviews,statusCheckRollup
     ```
   - If Copilot requests changes or highlights bugs/improvements:
     - Implement the fixes, rerun tests, commit, and push.
   - Once Copilot has cleared the review (no outstanding requested changes / approved) and checks are passing:

4. **Merge & Sync**:
   - Merge the PR to main:
     ```bash
     gh pr merge <PR_NUMBER> --merge --delete-branch
     ```
   - Switch to `main` and pull updates:
     ```bash
     git checkout main && git pull origin main
     ```
