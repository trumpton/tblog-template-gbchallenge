# Working on this theme bundle

This repo *is* a single TBlog Theme Bundle (TTB v2) -- see
`README.md` and the main TBlog repository's `tblog/themes/THEME-SPEC.md`
for the full bundle format.

## Always upissue the zip

**Every commit that changes any of this theme's files (`theme.json`,
`templates/`, `static/`, `thumbnail.png`) must bump `theme.json`'s
`"version"` field and rebuild the zip**, even for a small tweak (a CSS
fix, a copy change, a config edit) -- not just for "real" releases:

```
./scripts/build-theme-zip.sh
```

This removes any previously-built `gbchallenge-theme_v<old version>.zip`
and writes a fresh `gbchallenge-theme_v<new version>.zip` named after
the full version in `theme.json`. A blog's Import picker (and any admin
re-adding this bundle to the shared library) only ever sees this named
zip -- if the version isn't bumped and the zip isn't rebuilt, the file
on disk keeps its old name and content, and there is nothing new to
import, however the source files were actually changed.

Bump at least the patch component (`1.6.0` -> `1.6.1`) for anything
short of a deliberate, user-facing release bump. Never reuse a version
number that's already been committed.
