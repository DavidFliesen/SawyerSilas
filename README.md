# Sawyer Silas · Official Music

**Website release v1.0.1** · [https://davidfliesen.github.io/SawyerSilas](https://davidfliesen.github.io/SawyerSilas)

Artist page for singer/songwriter Sawyer Silas with songs released via Ridgeworn Records.

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

4. Deploy and open the assigned `pages.dev` address. Add a custom domain in the Pages project if you want one. If you do, set `SITE_URL` to its full HTTPS origin in the production build environment and redeploy so the canonical URL and social card use it. You can also set `SITE_URL` to your final `pages.dev` origin. Without it, the build uses Cloudflare’s deployment URL for the social card.
5. Share the deployed home page in your social profiles and artist accounts wherever a website field is available. Use `/#story`, `/#listen`, or `/#music` to link to a particular section.

Cloudflare redeploys after pushes to the connected branch. [Cloudflare Pages Git guide](https://developers.cloudflare.com/pages/get-started/git-integration/)

## How the catalog updates

The Pages Function at `/api/catalog` looks up the verified Sawyer Silas Apple Music artist ID in the U.S. iTunes catalog and caches successful responses for one hour at the edge. It runs when visitors load the page. A new release can appear automatically after Apple lists it. The automatically discovered rows link to Apple Music. The three launch releases use their individual HyperFollow links so fans can choose among available services. If the lookup fails, visitors can still see those releases and use their links.

The featured story, cover, and dates are editable in `public/index.html`. Add social or artist links to the footer there. To feature a different release, update the featured content and date in the HTML, the date in `public/site.js`, and the featured title in `functions/api/catalog.js`.

## Audio sample

The player appears when the catalog provides a preview for the featured song. To choose exactly what people hear, put your own cleared MP3 clip at `public/assets/caught-in-the-rise-preview.mp3` and set `LOCAL_PREVIEW` in `public/site.js` to `'./assets/caught-in-the-rise-preview.mp3'`. An MP3 clip is optional. The page always offers the featured HyperFollow link.

## Local preview

Run `node build.mjs` to produce the static site in `dist/`. Open `dist/index.html` for an offline look. To run the catalog endpoint as well, use `npx wrangler pages dev dist` from the project root.
