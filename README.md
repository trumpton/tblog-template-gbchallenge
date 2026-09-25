# GB Challenge

A TBlog theme (TTB v2) for a charity's events blog -- one post per
fundraising event, a warm sunset hero banner, and a navy/gold editorial
look.

## What's included

- **Overview** post format -- a single `Overview` section, for a short
  standalone update.
- **Event** post format -- three sections, `Overview`, `Post` and
  `Photos`. `Overview` opens with a large hand-lettered drop cap (see
  "Font" below); `Post` renders in two columns.
- A full-bleed header banner (`static/img/banner.jpg`) with a navy
  gradient scrim, ready for a blog's own title/tagline.
- Sidebar archive, tags and popular-posts widgets; a filterable post
  list; a footer.

## Installing

Import `gbchallenge-theme_v<version>.zip` (built by
`scripts/build-theme-zip.sh`, see below) from a blog's Themes page, or
add it to the shared library as an admin. See the main TBlog
repository's `tblog/themes/SPEC.md` for the full TTB bundle format.

## Font

The drop cap uses **Kleymissky** by gluk (fontspace.com/kleymissky-font-f19453),
licensed under the SIL Open Font License 1.1 -- see
`static/fonts/Kleymissky-OFL-LICENSE.txt`. The font file ships under
`static/fonts/` and is hand-declared in `static/css/style.css` as
`@font-face { font-family: "Kleymissky"; ... }`, so `theme.json`'s own
`ornate_font` values can reference it by that name directly.

## Rebuilding the zip

Any change to this theme's files (including a `theme.json` version
bump) should be followed by:

```
./scripts/build-theme-zip.sh
```

which rebuilds `gbchallenge-theme_v<version>.zip` at the repo root,
removing any previously built zip for an older version.
