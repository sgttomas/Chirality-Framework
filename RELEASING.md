# Releasing Chirality Framework

This document describes the release process and versioning strategy for the **Chirality Framework**.

---

## Versioning
We use [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):
- **MAJOR**: Incompatible API changes.
- **MINOR**: Backward-compatible new features.
- **PATCH**: Backward-compatible bug fixes.

The current version is tracked in:
- `VERSION.md`
- `CHANGELOG.md`

---

## Release Steps

1. **Prepare the Release**
   - Ensure `main` (or `release` branch) is up to date.
   - Run full lint, type checks, and test suite:
     ```bash
     npm run lint && npm run type-check && npm test
     ```

2. **Update Documentation**
   - Update `CHANGELOG.md` with new version section.
   - Confirm `README.md`, `GETTING_STARTED.md`, and API docs reflect any changes.

3. **Bump Version**
   ```bash
   npm version [major|minor|patch] -m "chore(release): %s"
   ```

4. **Tag & Push**
   ```bash
   git push origin main --tags
   ```

5. **Publish**
   - If applicable, publish to npm:
     ```bash
     npm publish
     ```
   - Deploy any backend services as needed.

6. **Announce**
   - Create a GitHub Release from the tag, using the CHANGELOG entry as the release notes.
   - Notify the team/community.

---

## Hotfix Releases

For urgent fixes to production:
- Branch from the latest release tag.
- Apply the fix, bump PATCH version.
- Tag, push, and deploy immediately.

---

## Rollbacks

If a release must be rolled back:
- Identify the last stable tag.
- Revert changes and deploy that version.
- Document the rollback in CHANGELOG.md and an issue.