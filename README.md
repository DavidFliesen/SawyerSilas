# Sawyer Silas · Official Music
https://sawyersilas.pages.dev

**Website release v1.1.13** · [https://davidfliesen.github.io/SawyerSilas](https://davidfliesen.github.io/SawyerSilas)

Artist page for singer/songwriter Sawyer Silas with songs released via Ridgeworn Records.

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

## How the catalog updates

### Release-link updater in v1.1.8

The old visitor-time lookup checked Apple only. It did not receive release notifications or commit new service links. The new **Update verified release links** GitHub Actions workflow checks every 30 minutes (:17 and :47 UTC), with a manual **Actions → Update verified release links → Run workflow** option. Upload all changed files at the repository root, including `.github/workflows/release-links.yml` (file pickers sometimes omit folders beginning with a dot).

Enable Actions if GitHub prompts. The workflow requests `contents: write` for its built-in token; repository policy and branch rules must permit its commit to `main`. No personal token or music API key is required. It commits only when verified links change, allowing the connected Cloudflare Git integration to deploy the update. Scheduled runs can be delayed; GitHub may disable schedules in public repositories after 60 days of inactivity. Check the Actions log for source failures and commit errors.

Discovery checks Apple's U.S. artist catalog and Deezer independently, plus an optional cross-service resolver and HyperFollow for candidate URLs. Candidates must identify the song and artist in the service's own title metadata; Apple/Deezer catalog records require the exact title and artist. Artist profiles, search URLs, pre-saves, and distributor pages are excluded. Some services block metadata access or expose no usable lookup, so this cannot guarantee automatic links from every store. A failed source is retried on the next run and never removes a previously verified link.

The published JSON in `public/data/caught-in-the-rise-links.json` and the song's static grid preserve links through API outages. Visible song pages refresh published data every five minutes. The live Apple endpoint is a secondary discovery path; its cache is now five minutes and upstream errors are logged. It does not control release timing. There is no DistroKid email/webhook connection. An authenticated external integration may send the optional `repository_dispatch` event `release-published`; polling needs no such integration.

This updater currently watches **Caught in the Rise** only. Add separate identity/configuration and an updater target for future songs. Keep all master audio outside GitHub.

The Pages Function at `/api/catalog` looks up the verified Sawyer Silas Apple Music artist ID in the U.S. iTunes catalog and caches successful responses for five minutes at the edge. It runs when visitors load the page. A new release can appear automatically after Apple lists it. The automatically discovered rows link to Apple Music. The three launch releases have dedicated story pages with direct music-service links. If the lookup fails, visitors can still open the three story pages and use their published links.

The homepage is in `public/index.html`. Edit the individual song stories, covers, and direct listening links in `public/songs/<song-slug>/index.html`. Add confirmed storefront URLs to the song’s Listen section as they become available. Newly discovered catalog entries link directly to Apple Music until you create a dedicated story page and add it to the homepage.

## Audio sample

Every song page uses the browser’s built-in player for a 30-second preview. “Gator Bob” and “One More Angel” stream their promotional samples from iTunes. “Caught in the Rise” plays the excerpt at `public/assets/caught-in-the-rise-preview.m4a` immediately, independently of the catalog. The site package contains only this excerpt. Keep the master WAV outside the repository.

## Local preview

Run `node build.mjs` to produce the static site in `dist/`. Serve `dist/` with a local web server to check the song pages and their links. To run the catalog endpoint as well, use `npx wrangler pages dev dist` from the project root.

The music service icons are sourced from [Simple Icons](https://github.com/simple-icons/simple-icons) and [Musicfetch’s Qobuz brand assets](https://musicfetch.io/services/qobuz/assets).

## Search discovery and ownership verification (v1.1.8)

The build generates one canonical URL per page, XML sitemap, robots.txt, Open Graph/Twitter cards, and JSON-LD structured metadata for the artist, website, song and breadcrumbs. The default canonical site is https://sawyersilas.pages.dev/; temporary deployment URLs are not used. For a future custom domain, set SITE_URL to that permanent HTTPS URL and rebuild. Structured metadata supports discovery; it does not guarantee search indexing, ranking, or a rich result.

After deploying:

1. Google Search Console: https://search.google.com/search-console/ — Add a URL-prefix property for https://sawyersilas.pages.dev/ (not the temporary numbered deployment URL). Choose HTML-file verification: put Google's exact verification file in public/ and deploy, then click Verify. Alternatively add its exact HTML meta tag inside the homepage head. Keep the verification file/tag in place. Submit https://sawyersilas.pages.dev/sitemap.xml. Use URL Inspection for https://sawyersilas.pages.dev/songs/caught-in-the-rise/ and request indexing.
2. Bing Webmaster Tools: https://www.bing.com/webmasters/ — Import your verified Google Search Console site, or add/verify it separately, then submit the same sitemap. There is no need to pay a search-submission service.
3. Link the permanent site from your Spotify/Apple Music artist profiles and social accounts. These are normal links, not search-engine registrations. Check that the site is publicly accessible without Cloudflare Access login. Do not register the numbered deployment URLs as separate sites.

This connection's accessible GitHub installation (179134200) returned only DavidFliesen/adoptacommunity in its selected-repository list. DavidFliesen has admin/push rights to SawyerSilas, but those are user rights, not the app token's permissions. Public reads can succeed without app repository access. Open https://github.com/settings/installations/179134200 and add SawyerSilas to the selected repositories, save, and refresh/reconnect the GitHub connection in ChatGPT. Check that the app requests Contents read/write; if its declared permissions are read-only, repository selection alone cannot add write capability. App workflow-file changes may also need Workflows write. This is separate from GitHub Actions workflow-token permissions and Cloudflare's GitHub app.
