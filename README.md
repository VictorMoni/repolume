# Repolume ✳

Turn public GitHub repositories into a well-presented portfolio. Repolume reviews project metadata and README sections, suggests priorities, and creates editable README drafts.

**Português · English · Español** — light, dark and system themes.

## Features

- Public GitHub profile analysis with repository pagination.
- Checks for description, README, license and topics.
- README heading detection in Portuguese, English and Spanish.
- Improvement priorities and Markdown plan export.
- Editable README generator with language selection and download.
- Search by name, description and topics; filters by programming language and review status.
- Per-profile selections saved only in your browser.
- Keyboard navigation, focus management, live status messages, reduced-motion support and responsive layouts.

## Run locally

Requires Node.js 22 or later. No dependency installation or build is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173.

## Tests

```sh
npm test
```

The 23 tests cover translations, contrast tokens, README analysis, template generation, combined filters and saved selections.

## Deploy to Vercel

Import this repository as a Vercel project. The included `vercel.json` sets the output directory to `dist`, with no install or build command. No environment variables or secrets are needed. Keep the repository root as the Root Directory. Production is available at https://repolume-review.vercel.app.

## How the review works

Each metadata item present earns 1 point, for a total of 4. Additional README checks recognize Markdown and HTML section headings in three languages. They do not assess code quality, correctness or completeness. Non-matching headings may require manual review. An unavailable API response is shown as unverified, not missing. Forks and archived projects are excluded.

README drafts use known metadata and explicit placeholders. Installation commands must come from you. Downloading uses the current editor content. Drafts are not uploaded to GitHub or saved after the editor is closed.

## Privacy and limits

Public data is requested directly from the browser to the GitHub REST API. No login or token is requested, and the app does not modify repositories. Unauthenticated API requests are subject to GitHub rate limits. Language, theme and selected repository IDs are stored locally per profile; the demo uses a separate selection. Selections do not sync across browsers. Search applies only to loaded projects; plans and exports use the indicated selection scope.

See [ACCESSIBILITY.md](ACCESSIBILITY.md) for accessibility improvements, checks and remaining audit limits.

## Support

Report bugs and feature requests in this repository’s Issues. A direct support email for a Developer Program application must be supplied by the maintainer.

## GitHub Developer Program

Repolume is an independent integration with the GitHub API. It does not grant or guarantee GitHub badges. See [the official program requirements](https://docs.github.com/en/integrations/concepts/github-developer-program).

## License

No open-source license has been selected yet. A public repository does not itself grant a license to reuse its code.
