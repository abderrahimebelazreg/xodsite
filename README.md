# Studio / Apps — Self-Hosted Hub & Publisher

An editorial, high-performance landing page and app distribution hub for independent software projects, powered by **SQLite** and styled in the high-contrast aesthetic of ArtCraft (`getartcraft.com`).

---

## What's Included

- **Native SQLite Database Engine**: Built with Node.js's native `node:sqlite`. Zero npm dependencies required!
- **Interactive Admin Control Panel (`/admin.html`)**:
  - Upload app icons directly from your computer (PNG, SVG, JPG, WebP) with instant visual preview.
  - Publish apps with:
    - **App Name**
    - **Title / Tagline**
    - **Icon** (image upload or path)
    - **Description**
    - **GitHub Repository URL**
    - **Download URL** (optional direct installer link)
    - **License** (optional, e.g. MIT, Apache 2.0, GPL)
    - **Version** (e.g. `v0.1.0`)
    - **Category** (Desktop, Utility, Developer, Editor, Design, Audio)
    - **Tags** (e.g. `RUST, ICED, LINUX`)
    - **Key Highlights / Bullet points**
    - **Featured Toggle** (places the app in the hero spotlight & dock)
  - Real-time Edit and Delete actions.
  - One-click **Sync to `apps.json`** for deploying statically to GitHub Pages.
- **Frontend App Hub (`index.html`)**:
  - Custom branding using your topbar logo (`assets/logoOfwebsite.png`).
  - Real-time search and category filtering.
  - Dynamic GitHub release asset resolution (queries the GitHub public API for latest releases and binaries).
  - Featured **XOD Editor** spotlight with live interactive theme switcher (`Obsidian`, `Emerald`, `Amber`, `Nordic`) and one-click copy install command.

---

## Quick Start

### 1. Start the SQLite Server

You can run any of the following commands:

```bash
# Using npm:
npm start

# Or directly with Node:
node server.js

# Or using the bash script:
./start.sh
```

### 2. Open in Your Browser

- **Public Website**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## How It Works

1. **Database (`apps.db`)**: Stores all applications locally in a SQLite database file.
2. **Icon Uploads (`assets/uploads/`)**: Any icon uploaded via the admin form is safely saved to `assets/uploads/` with a unique timestamped filename.
3. **Static Compatibility (`apps.json`)**: Whenever you add, edit, or delete an app, the server automatically updates `apps.json`. This means you can deploy the folder to **GitHub Pages** (which only serves static files) and the site will still load all your published apps!

---

## Deploying to GitHub Pages

1. In the admin dashboard, click **"Sync apps.json"** (or make any edit).
2. Push `index.html`, `admin.html`, `styles.css`, `app.js`, `apps.json`, and `assets/` to your GitHub repository.
3. In GitHub: go to **Settings → Pages → Deploy from a branch (`main` / root)**.
4. Your site is live!
