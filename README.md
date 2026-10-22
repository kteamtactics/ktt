# KTT - Kill Team Tactics

Static website (HTML, CSS, JavaScript). No build step. Open `index.html` to test it locally.

## Put it online with GitHub Pages (free)
1. Create an account on github.com, then a new repository (public is simplest for Pages).
2. Upload ALL the files of this folder to the repository (Add file > Upload files; drag the contents, keep the folders).
3. Repository > Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Your site appears at `https://<your-name>.github.io/<repository>/` after a minute.

## Publish from the site itself (owner mode)
1. Open your site with `?owner=1` at the end of the address (example: `.../index.html?owner=1`). An orange bar appears.
2. Create a token: github.com > Settings > Developer settings > Fine-grained tokens > Generate. Select only your repository and set **Contents: Read and write**.
3. In the report builder, article writer or puzzle maker, press "Publish settings", enter `your-name/repository`, the branch (`main`) and the token, then "Test connection".
4. From then on, "Publish on the site" saves your battle analysis, article or puzzle into the data files. The site updates about a minute later. Editing a published item and publishing again replaces it.
The token stays in your browser only. Do not share it.

## Where things are
- `data/` content: `reports.js` (battle analyses), `articles.js`, `pzlist.js` (puzzles), `news.js`, `teams.js`, `ops.js` (Crit/Tac Ops), `pzboards.js` (puzzle boards), `site.js` (newsletter, X block).
- `assets/js/common.js`: menu, footer, social links (`KTT.social`).
- Newsletter: signup opens an email to the address in `KTT.newsletter.mailto` (`data/site.js`). To use a service (Buttondown...) fill `action`.
- Removing something for everyone: delete it from the data file, or use owner mode "Removal list" and send it to whoever maintains the site.
