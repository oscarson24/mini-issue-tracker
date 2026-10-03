AI-Reasoning - Mini Issue Tracker
==================================

How I used AI
-------------
I built this project with Claude Code (Claude Opus 5.5) as a pair programmer. The full
session transcript is in this folder.

1. Planning: I gave the requirements (React, .NET + EF Core + Swagger, SQL Server,
   Docker) and asked for options before any code. Claude proposed alternatives for
   Docker setup, API style, migrations, frontend tooling and testing, and wrote
   PLAN.md. I reviewed the options and approved the plan before execution started.
2. Implementation, phase by phase: Claude scaffolded and wrote the code (SQL Server
   container, .NET 10 API, React frontend, Docker Compose). I gave the go-ahead
   at each phase checkpoint, and every phase ended with tests and a commit.
3. Verification: Claude ran backend and frontend tests, smoke-tested the API with
   curl against the real database, and clicked through the UI in Chrome.
4. Review and delivery: an AI code-review pass, then a pull request to main that I
   asked it to merge.
5. Debugging: when the app returned 404s in the browser, I captured a HAR file and
   had Claude analyse it to find the root cause.

Where I overrode or corrected the AI
------------------------------------
- Stopped the first plan write: I interrupted it before the file was saved,
  to review the approach first.
- Frontend architecture: the first plan put API calls in a single `api/issues.ts`
  file. I asked for a dedicated `services/` folder for better control of the API
  methods. It became `apiClient.ts` + `issueService.ts`, and components never call
  fetch directly.
- Styling: the plan proposed plain CSS / CSS Modules. I chose Tailwind CSS instead.
- Branching: I decided that PRs target `main`, not `master`.
- Tooling: when the GitHub CLI wasn't available, I installed it so the PR could be
  created from the session instead of by hand.
- Bug report: I found the 404 error on http://localhost:5173 myself and provided the
  evidence (HAR file). The AI's first hypothesis, a second process listening on
  IPv6 localhost, was wrong. It retracted that after checking. The real cause was its
  own `git switch` to the old `main` during the merge, which briefly deleted
  `vite.config.ts` while the Vite dev server was watching. Vite restarted without its
  `/api` proxy. Fixed by restarting the web container.

Things the AI caught and corrected in its own work (checked by its tests/reviews)
-------------------------------------------------------------------------------------
- Backend tests failed because SQLite stores timestamps with less precision; fixed
  with a fake clock in tests, with no change to production code.
- Removed dead validation code after finding ASP.NET already rejects invalid enum values.
- Dev and production Docker builds shared one image tag; gave dev images a `:dev` tag
  so the modes can't mix.
- Fixed a lint warning (setState inside an effect) by restructuring the useIssues hook.
- The code review found a race condition: switching the filter during a create or
  resolve updated the wrong list. Fixed it and added regression tests.

My judgement
------------
I treated the AI's output as a draft to verify. Architecture decisions
(services layer, Tailwind, Docker strategy, branch targets) were mine. Each phase was
checked against tests and a running app before I approved the next one.
