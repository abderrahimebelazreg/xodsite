# Studio / Apps

A responsive, dark app-download landing page. Built with plain HTML, CSS and JavaScript.

## Quick start

1. Extract the ZIP.
2. Put your original XOD logo at `assets/xod.png` (the site already remembers this path).
3. Open `index.html` in a browser, or deploy the folder to GitHub Pages.

The page uses the GitHub public API to fetch the latest release for each configured repository. If a repository has no published release, the card links to its Releases page instead of pretending the source ZIP is an installer.

## Add another app

Open `app.js` and add another object to the `APPS` array:

```js
{
  name: "APP NAME",
  description: "A short description of the app.",
  owner: "YOUR_GITHUB_USERNAME",
  repo: "YOUR_REPOSITORY",
  category: ["desktop"],
  tags: ["LINUX", "RUST"],
  icon: "assets/app-name.png",
  fallbackIcon: "assets/xod-fallback.svg"
}
```

Add the icon file to `assets/`. Categories currently used by the filters are `desktop` and `utility`.

## Deploy with GitHub Pages

1. Create a new public repository, for example `apps`.
2. Upload `index.html`, `styles.css`, `app.js`, and the `assets` folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. GitHub will show your website URL in the Pages section.

## Important

For visitors to download ready-to-run programs, publish compiled binaries as GitHub Release assets (`.AppImage`, `.deb`, `.exe`, etc.). The website displays a matching release download when one is available. The source-code ZIP is not shown as an application installer.
