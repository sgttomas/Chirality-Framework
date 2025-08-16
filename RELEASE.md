# Chirality Framework — Release Summary

This document provides a concise reference for releasing a new version of the Chirality Framework.
For detailed, step-by-step instructions, see [RELEASING.md](./RELEASING.md).

---

## Release Cadence
- **Patch** releases: As needed for bug fixes and security patches.
- **Minor** releases: Every 4–8 weeks for new features and improvements.
- **Major** releases: Infrequent, only when breaking changes are necessary.

---

## Quick Checklist

1. **Prepare**
   - Merge all changes into the `main` (or `release`) branch.
   - Ensure CI passes: lint, type-check, tests.
   - Verify `CHANGELOG.md` and `VERSION.md` are updated.

2. **Version Bump**
   ```bash
   npm version [major|minor|patch] -m "chore(release): %s"
   ```

3. **Tag & Push**
   ```bash
   git push origin main --tags
   ```

4. **Publish**
   - If applicable, publish to npm:
     ```bash
     npm publish
     ```
   - Deploy backend services if part of this release.

5. **Announce**
   - Draft a GitHub Release with highlights from CHANGELOG.md.
   - Notify contributors and community channels.

---

## Semantic Versioning Recap

We follow Semantic Versioning:
- **MAJOR**: Breaking changes
- **MINOR**: Backward-compatible features
- **PATCH**: Backward-compatible fixes

---

## Related Docs
- RELEASING.md — Full release process
- CHANGELOG.md — Complete version history