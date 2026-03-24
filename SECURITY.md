# Security

## Reporting a vulnerability

If you discover a security issue in **repository code** (for example, the Next.js app, API routes, or scripts that handle credentials), please report it responsibly:

1. **Do not** open a public issue with exploit details.
2. Prefer contacting the repository maintainers through a private channel if one is listed on the GitHub profile or organization page.
3. If no private contact is available, open a GitHub issue titled **Security** and ask to be contacted privately; maintainers can follow up for details.

Include enough information to reproduce or understand the issue (affected paths, versions, and impact) without posting live secrets.

## Scope notes

- **Transcript content** is archival text; reports about factual accuracy or guest quotes are not security issues—use normal issues or PRs.
- **Supabase keys and `.env` files** must never be committed. If you accidentally pushed a secret, revoke and rotate it immediately in the provider dashboard, then remove it from git history if needed.
