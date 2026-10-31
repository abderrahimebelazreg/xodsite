/**
 * Studio / Apps — SQLite Backend Server
 * Minimal, zero-dependency Node.js HTTP server powered by native node:sqlite.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DB_PATH = path.join(ROOT_DIR, 'apps.db');
const UPLOADS_DIR = path.join(ROOT_DIR, 'assets', 'uploads');
const EXPORT_JSON_PATH = path.join(ROOT_DIR, 'apps.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    icon TEXT,
    github_url TEXT,
    download_url TEXT,
    license TEXT,
    version TEXT,
    tags TEXT,
    category TEXT DEFAULT 'desktop',
    featured INTEGER DEFAULT 0,
    highlights TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Check if database needs initial seeding (only XOD editor)
const countStmt = db.prepare('SELECT COUNT(*) as total FROM apps');
const countResult = countStmt.get();

if (!countResult || countResult.total === 0) {
  const insertSeed = db.prepare(`
    INSERT INTO apps (name, title, description, icon, github_url, download_url, license, version, tags, category, featured, highlights)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSeed.run(
    'XOD',
    'Modal GUI text editor',
    'A small modal GUI text editor built with Rust and Iced. Switch themes, stay focused, and edit with modal controls.',
    'assets/xod.png',
    'https://github.com/abderrahimebelazreg/xod',
    '',
    'MIT / Apache-2.0',
    'v0.1.0',
    'RUST, ICED, MODAL, LINUX',
    'desktop',
    1,
    '< 20ms startup\nGPU accelerated\nZero telemetry\nPure Rust'
  );
  console.log('Seeded database with initial XOD app.');
}

// Function to export apps to apps.json for GitHub Pages static compatibility
function exportAppsJSON() {
  try {
    const all = db.prepare('SELECT * FROM apps ORDER BY featured DESC, id ASC').all();
    const formatted = all.map(row => ({
      ...row,
      tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      highlights: row.highlights ? row.highlights.split('\n').map(h => h.trim()).filter(Boolean) : [],
      featured: Boolean(row.featured)
    }));
    fs.writeFileSync(EXPORT_JSON_PATH, JSON.stringify(formatted, null, 2));
  } catch (err) {
    console.error('Error exporting apps.json:', err);
  }
}

// Initial export
exportAppsJSON();

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

// Helper to save base64 icon
function saveBase64Icon(base64Data, filenameHint, appName) {
  if (!base64Data || !base64Data.startsWith('data:image/')) return null;

  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) return null;

  let ext = '.png';
  if (filenameHint) {
    const hExt = path.extname(filenameHint).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'].includes(hExt)) {
      ext = hExt;
    }
  } else if (matches[1] === 'svg+xml') {
    ext = '.svg';
  } else if (matches[1]) {
    ext = `.${matches[1]}`;
  }

  const cleanName = (appName || 'app').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  const safeFilename = `${Date.now()}-${cleanName}${ext}`;
  const targetPath = path.join(UPLOADS_DIR, safeFilename);

  fs.writeFileSync(targetPath, Buffer.from(matches[2], 'base64'));
  return `assets/uploads/${safeFilename}`;
}

// Helper to read request body
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --------------------------------------------------------------------------
  // REST API Routes
  // --------------------------------------------------------------------------

  // GET /api/apps — Retrieve all apps
  if (req.method === 'GET' && pathname === '/api/apps') {
    try {
      const rows = db.prepare('SELECT * FROM apps ORDER BY featured DESC, id ASC').all();
      const apps = rows.map(r => ({
        ...r,
        tags: r.tags ? r.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        highlights: r.highlights ? r.highlights.split('\n').map(h => h.trim()).filter(Boolean) : [],
        featured: Boolean(r.featured)
      }));
      return sendJSON(res, 200, { ok: true, apps });
    } catch (err) {
      return sendJSON(res, 500, { ok: false, error: err.message });
    }
  }

  // GET /api/apps/:id — Retrieve single app
  if (req.method === 'GET' && pathname.startsWith('/api/apps/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    if (isNaN(id)) return sendJSON(res, 400, { ok: false, error: 'Invalid app ID' });

    try {
      const row = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
      if (!row) return sendJSON(res, 404, { ok: false, error: 'App not found' });
      return sendJSON(res, 200, {
        ok: true,
        app: {
          ...row,
          tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          highlights: row.highlights ? row.highlights.split('\n').map(h => h.trim()).filter(Boolean) : [],
          featured: Boolean(row.featured)
        }
      });
    } catch (err) {
      return sendJSON(res, 500, { ok: false, error: err.message });
    }
  }

  // POST /api/apps — Create new app
  if (req.method === 'POST' && pathname === '/api/apps') {
    try {
      const data = await parseJSONBody(req);
      const name = (data.name || '').trim();
      if (!name) return sendJSON(res, 400, { ok: false, error: 'App name is required' });

      let icon = data.icon || 'assets/xod-fallback.svg';
      if (data.icon_data) {
        const savedIcon = saveBase64Icon(data.icon_data, data.icon_name, name);
        if (savedIcon) icon = savedIcon;
      }

      const title = (data.title || '').trim();
      const description = (data.description || '').trim();
      const github_url = (data.github_url || '').trim();
      const download_url = (data.download_url || '').trim();
      const license = (data.license || '').trim();
      const version = (data.version || '').trim();
      const tags = Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || '').trim();
      const category = (data.category || 'desktop').trim().toLowerCase();
      const featured = data.featured ? 1 : 0;
      const highlights = Array.isArray(data.highlights) ? data.highlights.join('\n') : (data.highlights || '').trim();

      const stmt = db.prepare(`
        INSERT INTO apps (name, title, description, icon, github_url, download_url, license, version, tags, category, featured, highlights)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(name, title, description, icon, github_url, download_url, license, version, tags, category, featured, highlights);
      const newId = Number(result.lastInsertRowid);

      exportAppsJSON();

      return sendJSON(res, 201, {
        ok: true,
        id: newId,
        message: `App "${name}" successfully created.`
      });
    } catch (err) {
      return sendJSON(res, 500, { ok: false, error: err.message });
    }
  }

  // PUT /api/apps/:id — Update existing app
  if (req.method === 'PUT' && pathname.startsWith('/api/apps/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    if (isNaN(id)) return sendJSON(res, 400, { ok: false, error: 'Invalid app ID' });

    try {
      const existing = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
      if (!existing) return sendJSON(res, 404, { ok: false, error: 'App not found' });

      const data = await parseJSONBody(req);
      const name = data.name !== undefined ? (data.name || '').trim() : existing.name;
      if (!name) return sendJSON(res, 400, { ok: false, error: 'App name cannot be empty' });

      let icon = existing.icon;
      if (data.icon_data) {
        const savedIcon = saveBase64Icon(data.icon_data, data.icon_name, name);
        if (savedIcon) icon = savedIcon;
      } else if (data.icon !== undefined) {
        icon = data.icon.trim() || existing.icon;
      }

      const title = data.title !== undefined ? (data.title || '').trim() : existing.title;
      const description = data.description !== undefined ? (data.description || '').trim() : existing.description;
      const github_url = data.github_url !== undefined ? (data.github_url || '').trim() : existing.github_url;
      const download_url = data.download_url !== undefined ? (data.download_url || '').trim() : existing.download_url;
      const license = data.license !== undefined ? (data.license || '').trim() : existing.license;
      const version = data.version !== undefined ? (data.version || '').trim() : existing.version;
      const tags = data.tags !== undefined ? (Array.isArray(data.tags) ? data.tags.join(', ') : data.tags.trim()) : existing.tags;
      const category = data.category !== undefined ? (data.category || 'desktop').trim().toLowerCase() : existing.category;
      const featured = data.featured !== undefined ? (data.featured ? 1 : 0) : existing.featured;
      const highlights = data.highlights !== undefined ? (Array.isArray(data.highlights) ? data.highlights.join('\n') : data.highlights.trim()) : existing.highlights;

      const stmt = db.prepare(`
        UPDATE apps
        SET name = ?, title = ?, description = ?, icon = ?, github_url = ?, download_url = ?,
            license = ?, version = ?, tags = ?, category = ?, featured = ?, highlights = ?
        WHERE id = ?
      `);

      stmt.run(name, title, description, icon, github_url, download_url, license, version, tags, category, featured, highlights, id);

      exportAppsJSON();

      return sendJSON(res, 200, {
        ok: true,
        message: `App "${name}" updated successfully.`
      });
    } catch (err) {
      return sendJSON(res, 500, { ok: false, error: err.message });
    }
  }

  // DELETE /api/apps/:id — Delete app
  if (req.method === 'DELETE' && pathname.startsWith('/api/apps/')) {
    const id = parseInt(pathname.split('/')[3], 10);
    if (isNaN(id)) return sendJSON(res, 400, { ok: false, error: 'Invalid app ID' });

    try {
      const existing = db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
      if (!existing) return sendJSON(res, 404, { ok: false, error: 'App not found' });

      db.prepare('DELETE FROM apps WHERE id = ?').run(id);

      exportAppsJSON();

      return sendJSON(res, 200, {
        ok: true,
        message: `App "${existing.name}" deleted.`
      });
    } catch (err) {
      return sendJSON(res, 500, { ok: false, error: err.message });
    }
  }

  // POST /api/export — Force export to apps.json
  if (req.method === 'POST' && pathname === '/api/export') {
    try {
      exportAppsJSON();
      return sendJSON(res, 200, { ok: true, message: 'apps.json successfully generated.' });
    } catch (err) {
      return sendJSON(res, 500, { ok: false, error: err.message });
    }
  }

  // --------------------------------------------------------------------------
  // Static File Serving
  // --------------------------------------------------------------------------
  let filePath = pathname === '/' ? '/index.html' : pathname;
  if (filePath === '/admin') filePath = '/admin.html';

  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.join(ROOT_DIR, normalizedPath);

  // Security check: ensure path is within ROOT_DIR
  if (!absolutePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File not found');
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(absolutePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Studio / Apps Server is running at:`);
  console.log(`  - Main Website:   http://localhost:${PORT}`);
  console.log(`  - Admin Dashboard: http://localhost:${PORT}/admin.html`);
  console.log(`  - Database:       ${DB_PATH}`);
  console.log(`======================================================\n`);
});
