# Contributing

Thanks for helping improve this project. **This repository is public** so others can learn from the code, fork it, and experiment—issues and focused pull requests are welcome.

## Learning and experimentation

You do not need permission to run the app locally, try the pipeline on a copy of your data, or use the transcripts for research. If something is unclear in the docs, opening an issue helps the next person too.

## Transcripts and metadata

- **Corrections** — Typos, speaker labels, or obvious transcript errors: open a pull request with a short note in the PR description (which episode, what changed).
- **Metadata** — `publish_date`, titles, and URLs should match the official [Lenny's Podcast](https://www.youtube.com/@LennysPodcast) listing when possible.

## Application code (`frontend/`, `src/`, `supabase/`)

- **Issues first** — For larger changes, open an issue describing the problem or feature so maintainers can align on approach.
- **Pull requests** — Keep PRs focused on one concern. Match existing code style, naming, and patterns in the touched files.
- **Local checks** — From `frontend/`, run `npm run lint` and `npm run build` before submitting when you change the Next.js app.

## Database and migrations

- SQL under `migrations/` should remain idempotent where the project already uses that pattern (e.g. `CREATE TABLE IF NOT EXISTS`, safe re-runs).
- Do not commit secrets or production credentials.

## Community projects list

If you built something that uses this archive and want it listed in the main README, open a PR that adds a single bullet with the project name, link, and one-line description.

## Code of conduct

Be respectful and constructive in issues and pull requests.
