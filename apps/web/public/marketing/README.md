# Marketing site images (canonical)

Curated photos for the homepage, `/gallery`, and seeded CMS media should live **only** here as static files:

- `hero.jpg`, `1bhk.jpg`, `2bhk.jpg`, `full-farm.jpg`

Reference them in admin as root-relative paths, e.g. **`/marketing/hero.jpg`**.

Older DB rows may still use `/hero.jpg`; the app normalizes those to `/marketing/…` and Next.js redirects legacy URLs.

Replace the committed minimal JPEGs with your real assets before launch.
