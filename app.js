/**
 * Studio / Apps — Client-side App Hub Logic
 * Connects directly to SQLite backend (/api/apps) with fallback to apps.json.
 */

// Default seed fallback if both API and apps.json are inaccessible
const DEFAULT_APPS = [
  {
    id: 1,
    name: "XOD",
    title: "Modal GUI text editor",
    description: "A small modal GUI text editor built with Rust and Iced. Switch themes, stay focused, and edit with modal controls.",
    icon: "assets/xod.png",
    fallbackIcon: "assets/xod-fallback.svg",
    github_url: "https://github.com/abderrahimebelazreg/xod",
    download_url: "",
    license: "MIT / Apache-2.0",
    version: "v0.1.0",
    tags: ["RUST", "ICED", "MODAL", "LINUX"],
    category: "desktop",
    featured: true,
    highlights: ["< 20ms startup", "GPU accelerated", "Zero telemetry", "Pure Rust"]
  }
];

let APPS = [];

// DOM Elements
const grid = document.querySelector("#app-grid");
const searchInput = document.querySelector("#search-input");
const emptyState = document.querySelector("#empty-state");
const countLabel = document.querySelector("#app-count");
const toast = document.querySelector("#toast");
const dockContainer = document.querySelector("#hero-dock");
const dockCard = document.querySelector("#hero-dock-card");
const footerAppsList = document.querySelector("#footer-apps-list");
const filterGroup = document.querySelector("#filter-group");

let activeFilter = "all";
let searchTerm = "";

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function notify(message) {
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes) return "";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function bestAsset(assets = []) {
  if (!assets || !assets.length) return null;
  const usable = assets.filter(a => !/\.(sha256|sha512|sig|asc|md5|txt)$/i.test(a.name));
  const preferred = usable.find(a => /\.(appimage|deb|rpm|exe|msi|dmg|pkg|tar\.gz|zip)$/i.test(a.name));
  return preferred || usable[0] || null;
}

// Fetch GitHub release metadata if GitHub URL is present
async function fetchGithubRelease(githubUrl) {
  if (!githubUrl || !githubUrl.includes("github.com")) return null;
  
  try {
    const parts = githubUrl.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "").split("/");
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];

    const cacheKey = `gh_rel_${owner}_${repo}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const item = JSON.parse(cached);
        if (Date.now() - item.time < 1000 * 60 * 15) return item.data;
      }
    } catch (e) {}

    const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`;
    const response = await fetch(endpoint, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (response.ok) {
      const release = await response.json();
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: release }));
      } catch (e) {}
      return release;
    }
  } catch (err) {
    console.warn("Could not fetch release for:", githubUrl, err);
  }
  return null;
}

// Load applications from SQLite API or fallback to apps.json
async function loadApps() {
  try {
    const res = await fetch("/api/apps");
    if (res.ok) {
      const data = await res.json();
      if (data.apps && data.apps.length > 0) {
        APPS = data.apps;
        return;
      }
    }
  } catch (e) {
    // API not running, fallback to apps.json
  }

  try {
    const res = await fetch("apps.json");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        APPS = data;
        return;
      }
    }
  } catch (e) {
    // apps.json missing, use built-in default
  }

  APPS = DEFAULT_APPS;
}

function renderDock() {
  if (!dockContainer) return;
  if (!APPS.length) {
    if (dockCard) dockCard.style.display = "none";
    return;
  }
  if (dockCard) dockCard.style.display = "block";

  dockContainer.innerHTML = APPS.map((app, index) => `
    <button class="dock-item ${index === 0 ? 'active' : ''}" data-app-id="${app.id}" title="${escapeHTML(app.name)} — ${escapeHTML(app.title || '')}">
      <div class="dock-icon-wrapper">
        <img src="${escapeHTML(app.icon || 'assets/xod.png')}" alt="${escapeHTML(app.name)}" onerror="this.src='assets/xod-fallback.svg'">
      </div>
      <span class="dock-label">${escapeHTML(app.name)}</span>
    </button>
  `).join("");

  dockContainer.querySelectorAll(".dock-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const appId = btn.dataset.appId;
      dockContainer.querySelectorAll(".dock-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const targetCard = document.querySelector(`#card-${appId}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        targetCard.classList.add("card-highlight");
        setTimeout(() => targetCard.classList.remove("card-highlight"), 1800);
      }
    });
  });
}

function renderFooterApps() {
  if (!footerAppsList) return;
  footerAppsList.innerHTML = APPS.map(app => `
    <li><a href="#card-${app.id}">${escapeHTML(app.name)}</a></li>
  `).join("") + `<li><a href="admin.html" style="color:var(--accent-cyan);">+ Add your app</a></li>`;
}

function appCard(app, index) {
  const release = app.releaseData;
  const asset = release ? bestAsset(release.assets) : null;
  const repoUrl = app.github_url || "https://github.com/abderrahimebelazreg";
  const releasesUrl = repoUrl.includes("github.com") ? `${repoUrl.replace(/\/$/, "")}/releases` : repoUrl;
  
  // Resolve download URL
  const downloadUrl = app.download_url || asset?.browser_download_url || releasesUrl;
  const version = release?.tag_name || app.version || "v0.1.0";
  const licenseText = app.license || "MIT / Apache";
  
  const statusBadgeText = release 
    ? (asset ? "LATEST RELEASE" : "RELEASE READY") 
    : (app.download_url ? "DOWNLOAD READY" : "OPEN SOURCE");

  const assetSize = asset ? formatBytes(asset.size) : "";
  const actionText = app.download_url 
    ? "Download ↓" 
    : (asset ? `Download ${assetSize ? `(${assetSize})` : ""} ↓` : "Releases ↗");

  const rawTags = Array.isArray(app.tags) ? app.tags : (app.tags || "").split(",").map(t => t.trim());
  const tagsHtml = rawTags.filter(Boolean).map(tag => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join("");

  const rawHighlights = Array.isArray(app.highlights) ? app.highlights : (app.highlights || "").split("\n").map(h => h.trim());
  const highlightsHtml = rawHighlights.filter(Boolean).map(h => `
    <span class="highlight-item">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${escapeHTML(h)}
    </span>
  `).join("");

  return `
    <article class="pro-card" id="card-${app.id}" style="animation-delay: ${index * 60}ms">
      <div class="card-glow"></div>
      
      <div class="card-header">
        <div class="card-identity">
          <div class="app-icon-box">
            <img src="${escapeHTML(app.icon || 'assets/xod.png')}" alt="${escapeHTML(app.name)} logo" onerror="this.src='assets/xod-fallback.svg'">
          </div>
          <div>
            <div class="card-hud-eyebrow">${escapeHTML((app.category || 'DESKTOP').toUpperCase())}</div>
            <h3 class="card-title">${escapeHTML(app.name)}</h3>
          </div>
        </div>
        <div class="card-badge ${release || app.download_url ? 'live' : 'standard'}">
          <span class="badge-dot"></span> ${escapeHTML(statusBadgeText)}
        </div>
      </div>

      ${app.title ? `<div class="card-tagline">${escapeHTML(app.title)}</div>` : ""}
      <p class="card-description">${escapeHTML(app.description || "")}</p>

      ${highlightsHtml ? `<div class="card-highlights">${highlightsHtml}</div>` : ""}

      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}

      <div class="card-footer">
        <div class="version-meta">
          <span class="version-tag">${escapeHTML(version)}</span>
          <span class="license-tag">${escapeHTML(licenseText)}</span>
        </div>
        <div class="card-actions">
          ${repoUrl ? `
            <a class="btn-ghost" href="${escapeHTML(repoUrl)}" target="_blank" rel="noreferrer" title="Inspect source on GitHub">
              <span>Source</span>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3.5 10.5L10.5 3.5M10.5 3.5H4.5M10.5 3.5V9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
          ` : ""}
          <a class="btn-solid" href="${escapeHTML(downloadUrl)}" target="_blank" rel="noreferrer">
            <span>${actionText}</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderApps() {
  if (!grid) return;
  const filtered = APPS.filter(app => {
    const cat = (app.category || "desktop").toLowerCase();
    const matchesFilter = activeFilter === "all" || cat === activeFilter;
    const haystack = `${app.name} ${app.title || ''} ${app.description || ''} ${(app.tags || []).join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(searchTerm);
  });

  grid.innerHTML = filtered.map(appCard).join("");
  if (emptyState) {
    emptyState.hidden = filtered.length !== 0;
  }
  if (countLabel) {
    countLabel.textContent = `${String(filtered.length).padStart(2, "0")} / ${String(APPS.length).padStart(2, "0")} APPS`;
  }
}

// XOD Spotlight Interactive Themes
function initSpotlightMockup() {
  const themeBtns = document.querySelectorAll(".theme-chip");
  const codeMock = document.querySelector("#mock-code-view");
  if (!themeBtns.length || !codeMock) return;

  const themes = {
    obsidian: {
      bg: "#101115",
      border: "rgba(255,255,255,0.12)",
      lineNum: "#4b4c56",
      kw: "#c084fc",
      fn: "#38bdf8",
      str: "#34d399",
      comment: "#64748b"
    },
    emerald: {
      bg: "#0c1511",
      border: "rgba(16,185,129,0.22)",
      lineNum: "#2e5241",
      kw: "#34d399",
      fn: "#a7f3d0",
      str: "#fef08a",
      comment: "#406e57"
    },
    amber: {
      bg: "#18140c",
      border: "rgba(245,158,11,0.22)",
      lineNum: "#634d28",
      kw: "#fbbf24",
      fn: "#fde68a",
      str: "#f472b6",
      comment: "#786036"
    },
    nordic: {
      bg: "#0f172a",
      border: "rgba(148,163,184,0.25)",
      lineNum: "#334155",
      kw: "#818cf8",
      fn: "#93c5fd",
      str: "#a5f3fc",
      comment: "#475569"
    }
  };

  themeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      themeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const t = themes[btn.dataset.theme] || themes.obsidian;
      codeMock.style.backgroundColor = t.bg;
      codeMock.style.borderColor = t.border;
      
      codeMock.querySelectorAll(".c-kw").forEach(el => el.style.color = t.kw);
      codeMock.querySelectorAll(".c-fn").forEach(el => el.style.color = t.fn);
      codeMock.querySelectorAll(".c-str").forEach(el => el.style.color = t.str);
      codeMock.querySelectorAll(".c-comment").forEach(el => el.style.color = t.comment);
      codeMock.querySelectorAll(".line-no").forEach(el => el.style.color = t.lineNum);

      notify(`Theme switched to <strong>${btn.textContent.trim()}</strong>`);
    });
  });

  const copyInstallBtn = document.querySelector("#copy-install-btn");
  if (copyInstallBtn) {
    copyInstallBtn.addEventListener("click", () => {
      const cmd = copyInstallBtn.dataset.cmd || "cargo install --git https://github.com/abderrahimebelazreg/xod";
      navigator.clipboard.writeText(cmd).then(() => {
        notify("Copied install command to clipboard!");
      }).catch(() => {
        notify("Command: " + cmd);
      });
    });
  }
}

// Global Init
async function init() {
  const yearEl = document.querySelector("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Load apps from SQLite or apps.json
  await loadApps();

  renderDock();
  renderFooterApps();
  renderApps();
  initSpotlightMockup();

  // Search input
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderApps();
    });
  }

  // Filter Buttons
  document.querySelectorAll(".filter-pill").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(".filter-pill.active")?.classList.remove("active");
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      renderApps();
    });
  });

  // Mobile navigation menu toggle
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.classList.toggle("is-active", open);
      document.body.classList.toggle("menu-lock", open);
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.classList.remove("is-active");
        document.body.classList.remove("menu-lock");
      });
    });
  }

  // Enrich with GitHub release data asynchronously
  await Promise.all(APPS.map(async app => {
    if (app.github_url) {
      const rel = await fetchGithubRelease(app.github_url);
      if (rel) {
        app.releaseData = rel;
      }
    }
  }));
  renderApps();

  // IntersectionObserver reveals
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("revealed"));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
