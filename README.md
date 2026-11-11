# Sawyer Silas · Official Music
https://sawyersilas.pages.dev

**Website release v1.1.16** · [https://davidfliesen.github.io/SawyerSilas](https://davidfliesen.github.io/SawyerSilas)

Artist page for singer/songwriter Sawyer Silas with songs released via Ridgeworn Records.

## Release v1.1.16

- Removed the unfinished cross-store discovery and GitHub Actions updater so it cannot overwrite verified music links.
- Made the static HTML listening grids authoritative and added build checks that require matching, direct service URLs on the homepage and “Caught in the Rise” page.
- Retained the Cloudflare Apple catalog lookup for adding newly released titles to the homepage without changing repository files.
- Centralized the published website version in `site-config.json`, aligned every page and asset cache version, and expanded the song’s structured data to include all published service links.
- Added Git housekeeping and strengthened the site audit against missing, mismatched, or artist-profile links.

## Release v1.1.13

- Restored the complete “Caught in the Rise” page after its repository file was replaced by a zero-byte empty file.
- Restored the story section, working `#story` and `#listen` anchors, 30-second preview, artist section, catalog, and direct listening links.
- Retained all eight previously verified music-service links and added the newly verified Deezer single page.
- Rechecked the homepage “Read the Story” and “Listening Links” buttons and the equivalent navigation on all three song pages.
- Updated the visible website release number and asset cache version on every page.

## Release v1.1.12

- Removed the unnecessary extra step between the featured “Caught in the Rise” call to action and its story.
- Changed the homepage button from “Explore the single” to “Read the Story” and linked it directly to the song page’s story section.
- Updated every “Song story” catalog link to open the requested song directly at its story section.
- Standardized the primary story buttons across all three song pages and completed a full audit of internal links, anchors, media references, service grids, metadata, and visible version numbers.

## Release v1.1.11

- Added a dedicated 1200 × 630 Facebook and social-sharing card for “Caught in the Rise.”
- Matched the card to the brown-and-gold “Behind the Song” section and blended in the album-cover river, angler, fly line, mayflies, mountains, and sunset.
- Added explicit Open Graph image type, dimensions, and alt text to encourage Facebook to use the large, high-resolution preview.
- Updated the visible website release number and asset cache version on every page.

## Release v1.1.10

- Restored the complete “Caught in the Rise” page after its GitHub source file was uploaded as an empty file.
- Restored the story, 30-second preview, all eight direct music-service links, artist section, catalog, footer, and in-page navigation targets.
- Updated the visible website release number and asset cache version on every page.

## Release v1.1.9

- Added and retained direct “Caught in the Rise” links for Spotify, Apple Music, iTunes, Amazon Music, YouTube, YouTube Music, TIDAL, and iHeartRadio.
- Updated the persistent release-link JSON so scheduled link checks cannot remove these confirmed links.
- Updated the visible website release number and asset cache version on every page.

## Publish through GitHub and Cloudflare Pages

1. Create a GitHub repository named `SawyerSilas`. Put the contents of this ZIP at the root of the repository, so `public/`, `functions/`, and `build.mjs` sit next to this README.
2. In Cloudflare, open **Workers & Pages** and create a **Pages** project with **Connect to Git**. Select your GitHub repository.
3. Use these settings.

| Cloudflare setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `node build.mjs` |
| Build output directory | `dist` |
| Root directory | Repository root |

4. Deploy and open the assigned `pages.dev` address. Add a custom domain in the Pages project if you want one. If you do, set `SITE_URL` to its full HTTPS origin in the production build environment and redeploy so the canonical URL and social card use it. You can also set `SITE_URL` to your final `pages.dev` origin. Without it, the build uses the permanent https://sawyersilas.pages.dev/ address for canonicals, the sitemap, and social cards.
5. Share the deployed home page in your social profiles and artist accounts wherever a website field is available. Use `/#story`, `/#listen`, or `/#music` to link to a particular section.

Cloudflare redeploys after pushes to the connected branch. [Cloudflare Pages Git guide](https://developers.cloudflare.com/pages/get-started/git-integration/)

## How the catalog and listening links update

Verified streaming and download links are stored directly in the listening grids in `public/index.html` and `public/songs/caught-in-the-rise/index.html`. Update both grids together. The build stops if a required service is missing, if the grids disagree, or if a link is an invalid service URL. Artist profiles, search URLs, pre-saves, distributor pages, and unverified destinations should not be used as song links.

There is no GitHub workflow or browser script that changes these links. This keeps a Cloudflare build from replacing a manually verified link with older saved data. Cloudflare deploys the static links after the changed HTML files are committed to `main`.

The Pages Function at `/api/catalog` looks up the verified Sawyer Silas Apple Music artist ID in the U.S. iTunes catalog and caches successful responses for five minutes at the edge. It runs when visitors load the page. A new release can appear automatically after Apple lists it. The automatically discovered rows link to Apple Music. The three launch releases have dedicated story pages with direct music-service links. If the lookup fails, visitors can still open the three story pages and use their published links.

The homepage is in `public/index.html`. Edit the individual song stories, covers, and direct listening links in `public/songs/<song-slug>/index.html`. Add confirmed storefront URLs to the song’s Listen section as they become available. Newly discovered catalog entries link directly to Apple Music until you create a dedicated story page and add it to the homepage.

## Audio sample

Every song page uses the browser’s built-in player for a 30-second preview. “Gator Bob” and “One More Angel” stream their promotional samples from iTunes. “Caught in the Rise” plays the excerpt at `public/assets/caught-in-the-rise-preview.m4a` immediately, independently of the catalog. The site package contains only this excerpt. Keep the master WAV outside the repository.

## Local preview and verification

Set the release in `site-config.json`, then run `node build.mjs` to produce the static site in `dist/`. The build validates the source pages, updates the published footer and CSS/JavaScript cache version, adds canonical and structured metadata, and audits the completed site. Run `node --test tests/*.test.mjs` for the regression tests. Serve `dist/` with a local web server to check the song pages and their links. To run the catalog endpoint as well, use `npx wrangler pages dev dist` from the project root.

The music service icons are sourced from [Simple Icons](https://github.com/simple-icons/simple-icons) and [Musicfetch’s Qobuz brand assets](https://musicfetch.io/services/qobuz/assets).

## Search discovery and ownership verification

The build generates one canonical URL per page, XML sitemap, robots.txt, Open Graph/Twitter cards, and JSON-LD structured metadata for the artist, website, song and breadcrumbs. The default canonical site is https://sawyersilas.pages.dev/; temporary deployment URLs are not used. For a future custom domain, set SITE_URL to that permanent HTTPS URL and rebuild. Structured metadata supports discovery; it does not guarantee search indexing, ranking, or a rich result.

After deploying:

1. Google Search Console: https://search.google.com/search-console/ — Add a URL-prefix property for https://sawyersilas.pages.dev/ (not the temporary numbered deployment URL). Choose HTML-file verification: put Google's exact verification file in public/ and deploy, then click Verify. Alternatively add its exact HTML meta tag inside the homepage head. Keep the verification file/tag in place. Submit https://sawyersilas.pages.dev/sitemap.xml. Use URL Inspection for https://sawyersilas.pages.dev/songs/caught-in-the-rise/ and request indexing.
2. Bing Webmaster Tools: https://www.bing.com/webmasters/ — Import your verified Google Search Console site, or add/verify it separately, then submit the same sitemap. There is no need to pay a search-submission service.
3. Link the permanent site from your Spotify/Apple Music artist profiles and social accounts. These are normal links, not search-engine registrations. Check that the site is publicly accessible without Cloudflare Access login. Do not register the numbered deployment URLs as separate sites.

