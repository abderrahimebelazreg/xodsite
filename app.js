// Add your projects here. Each repository must be public for the live release lookup.
const APPS = [
  {
    name: "XOD",
    description: "A small modal GUI text editor built with Rust and Iced. Switch themes, stay focused, and edit with modal controls.",
    owner: "abderrahimebelazreg",
    repo: "xod",
    category: ["desktop", "utility"],
    tags: ["RUST", "ICED", "LINUX"],
    icon: "assets/xod.png",
    fallbackIcon: "assets/xod-fallback.svg",
    featured: true
  }
  // Add more apps by copying this object:
  // { name:"APP NAME", description:"What it does.", owner:"GITHUB_USERNAME",
  //   repo:"REPOSITORY_NAME", category:["desktop"], tags:["TAG1","TAG2"],
  //   icon:"assets/app-icon.png", fallbackIcon:"assets/xod-fallback.svg" }
];

const grid = document.querySelector("#app-grid");
const searchInput = document.querySelector("#search-input");
const emptyState = document.querySelector("#empty-state");
const countLabel = document.querySelector("#app-count");
const toast = document.querySelector("#toast");
let activeFilter = "all";
let searchTerm = "";

const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function bestAsset(assets = []) {
  const usable = assets.filter(a => !/\.(sha256|sha512|sig|asc|md5|txt)$/i.test(a.name));
  const preferred = usable.find(a => /\.(appimage|deb|rpm|exe|msi|dmg|pkg|apk|tar\.gz|zip)$/i.test(a.name));
  return preferred || usable[0] || null;
}

async function getRelease(app) {
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(app.owner)}/${encodeURIComponent(app.repo)}/releases/latest`;
  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/vnd.github+json" } });
    if (response.status === 404) return { release: null, status: "No release yet" };
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const release = await response.json();
    return { release, status: "LATEST RELEASE" };
  } catch (error) {
    console.warn(`Could not load ${app.name} release:`, error);
    return { release: null, status: "VIEW ON GITHUB", error: true };
  }
}

function appCard(app, index) {
  const release = app.release;
  const asset = release ? bestAsset(release.assets) : null;
  const repoUrl = `https://github.com/${app.owner}/${app.repo}`;
  const releasesUrl = `${repoUrl}/releases`;
  const downloadUrl = asset?.browser_download_url || release?.html_url || releasesUrl;
  const version = release?.tag_name || "Source code";
  const status = release ? (asset ? "LATEST RELEASE" : "RELEASE NOTES") : app.status;
  const actionText = asset ? "Download ↗" : "View releases ↗";
  const tags = (app.tags || []).map(tag => `<span class="meta-tag">${escapeHTML(tag)}</span>`).join("");
  const note = release?.body ? `<div class="release-note">${escapeHTML(release.body.replace(/[#*_`]/g, "").slice(0, 145))}${release.body.length > 145 ? "…" : ""}</div>` : "";
  return `<article class="app-card" style="animation-delay:${index * 75}ms">
    <div class="card-top">
      <div class="app-icon"><img src="${escapeHTML(app.icon)}" alt="${escapeHTML(app.name)} logo" onerror="this.onerror=null;this.src='${escapeHTML(app.fallbackIcon || "assets/xod-fallback.svg")}'"></div>
      <span class="card-status ${release ? "" : "loading"}">${escapeHTML(status)}</span>
    </div>
    <h3 class="app-name">${escapeHTML(app.name)}</h3>
    <p class="app-description">${escapeHTML(app.description)}</p>
    <div class="app-meta">${tags}</div>
    ${note}
    <div class="card-footer">
      <span class="version-label">${escapeHTML(version)}</span>
      <div class="card-actions">
        <a class="card-action" href="${repoUrl}" target="_blank" rel="noreferrer">Source ↗</a>
        <a class="card-action download" href="${downloadUrl}" target="_blank" rel="noreferrer">${actionText}</a>
      </div>
    </div>
  </article>`;
}

function renderApps() {
  const filtered = APPS.filter(app => {
    const matchesFilter = activeFilter === "all" || (app.category || []).includes(activeFilter);
    const haystack = `${app.name} ${app.description} ${(app.tags || []).join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(searchTerm);
  });
  grid.innerHTML = filtered.map(appCard).join("");
  emptyState.hidden = filtered.length !== 0;
  countLabel.textContent = `${String(filtered.length).padStart(2, "0")} ${filtered.length === 1 ? "PROJECT" : "PROJECTS"}`;
}

async function init() {
  document.querySelector("#year").textContent = new Date().getFullYear();
  renderApps();
  await Promise.all(APPS.map(async app => {
    const data = await getRelease(app);
    app.release = data.release;
    app.status = data.status;
  }));
  renderApps();
}

searchInput.addEventListener("input", event => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderApps();
});
document.querySelectorAll(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-button.active")?.classList.remove("active");
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderApps();
  });
});
const menuButton = document.querySelector(".menu-toggle");
menuButton.addEventListener("click", () => {
  const nav = document.querySelector(".nav-links");
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".nav-links a").forEach(link => link.addEventListener("click", () => {
  document.querySelector(".nav-links").classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
}
init();
