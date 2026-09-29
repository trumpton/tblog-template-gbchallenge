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
- A full-bleed, right-aligned sunset hero banner (`static/img/banner.jpg`),
  40vh tall by default (set it with the header widget's Height field), with
  the blog's title/tagline pinned to the photo's own dark band across its
  bottom 40% -- the woman and dog silhouetted at the photo's right edge
  stay in frame at every screen width, cropping only from the left as
  needed.
- Sidebar archive, tags and popular-posts widgets; a filterable post
  list; a footer.

## Installing

Import `gbchallenge-theme_v<version>.zip` (built by
`scripts/build-theme-zip.sh`, see below) from a blog's Themes page, or
add it to the shared library as an admin. See the main TBlog
repository's `tblog/themes/SPEC.md` for the full TTB bundle format.

## Font

The drop cap uses **Cursive Serif Bold** (`static/fonts/CursiveSerif-Bold.ttf`,
the only font file in the theme; its `FONTLOG.txt` and SIL Open Font License text sit alongside). It is hand-declared in
`static/css/style.css` as `@font-face { font-family: "CursiveSerif"; ... }`,
so `theme.json`'s own `ornate_font` values can reference it by that name
directly.

## Header animation

`static/js/birds.js` draws a canvas over the header banner: a flock of
4-10 silhouetted birds lifts off from a random point on the horizon and
flies away over 10-30 s, climbing at 15-30 degrees. The left/right angle
of the flight is anything from 0 to 45 degrees (`HORIZONTAL_ANGLE2`); up
to 15 degrees (`HORIZONTAL_ANGLE1`) the birds are drawn from behind,
beyond that side-on (seen 25 degrees off pure side-on). A steep climb
shortens the flight so it never rises above 90% of the image height.
A small share of flocks start just out of shot, and are in frame within
10 s. 5-10 s later the next flock goes (never more than one at a time).
Wings are out of sync until 40% of the flight. It is skipped when the
visitor prefers reduced motion.

## Rebuilding the zip

Any change to this theme's files (including a `theme.json` version
bump) should be followed by:

```
./scripts/build-theme-zip.sh
```

which rebuilds `gbchallenge-theme_v<version>.zip` at the repo root,
removing any previously built zip for an older version.
