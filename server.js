require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

// Compat: garante fetch mesmo em Node < 18
const fetch = globalThis.fetch || require('node-fetch');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json({ limit: '50kb' }));

const PORT = process.env.PORT || 3000;
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =========================
// Helpers
// =========================
function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function safeText(v, max = 8000) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max).trim() : s;
}

function safeContent(v, max = 25000) {
  let s = String(v ?? '');
  if (!s) return '';
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max).trim() : s;
}

function normalizeInline(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(s) {
  return String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTrailingByline(content, author) {
  const raw = String(content ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const authorRaw = String(author ?? '').trim();
  if (!authorRaw) return trimmed;

  const authorNoAccents = authorRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const authorVariants = [authorRaw, authorNoAccents]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .map((v) => v.split(/\s+/).map(escapeRegex).join('\\s+'));
  if (!authorVariants.length) return trimmed;

  const bylineRe = new RegExp(
    `(?:\\s|\\u00A0)*` +
    `(?:<\\s*p[^>]*>\\s*)?` +
    `(?:&lt;\\s*p[^&]*?&gt;\\s*)?` +
    `(?:[-–—•]*\\s*)?` +
    `(?:por|fonte)\\s*:?\\s*` +
    `(?:[-–—]*\\s*)?` +
    `(?:${authorVariants.join('|')})` +
    `\\s*(?:[\\.|-–—•]*)?` +
    `(?:\\s*<\\s*\\/\\s*p\\s*>\\s*)?` +
    `(?:\\s*<\\s*br\\s*\\/?>\\s*)*` +
    `(?:\\s*&lt;\\s*\\/\\s*p\\s*&gt;\\s*)?` +
    `(?:\\s*&lt;\\s*br\\s*\\/??&gt;\\s*)*` +
    `\\s*$`,
    'i'
  );
  if (bylineRe.test(trimmed)) {
    return trimmed.replace(bylineRe, '').trim();
  }

  return trimmed;
}

function safeIsoDate(v) {
  const d = new Date(v);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

function normalizeSourceUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  let candidate = s;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const u = new URL(candidate);
    u.hash = '';

    if (u.hostname.startsWith('www.')) {
      u.hostname = u.hostname.slice(4);
    }

    if (u.pathname) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }

    const dropParams = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'igshid',
      'mc_cid',
      'mc_eid',
      'ref',
      'ref_src'
    ]);

    for (const key of Array.from(u.searchParams.keys())) {
      if (dropParams.has(key.toLowerCase())) {
        u.searchParams.delete(key);
      }
    }

    let out = u.toString();
    out = out.replace(/\/(\?|$)/, '$1');
    return out;
  } catch (_) {
    let out = s.split('#')[0].trim();
    out = out.replace(/\/+$/, '');
    return out;
  }
}

function safeNumber(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function withTimeout(promise, timeoutMs = 9000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs))
  ]);
}

async function fetchText(url, timeoutMs = 9000) {
  const res = await withTimeout(fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'GeopoliticaEstrategica/1.0 (+markets endpoint)' }
  }), timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function fetchJson(url, timeoutMs = 9000) {
  const res = await withTimeout(fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'GeopoliticaEstrategica/1.0 (+markets endpoint)' }
  }), timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// =========================
// DB helpers (Postgres)
// =========================
async function readPosts(limit = 80) {
  const { rows } = await pool.query(
    `SELECT id,
            slug,
            url,
            category,
            subcategory,
            title,
            excerpt,
            author,
            published_at AS "publishedAt",
            image_url AS "imageUrl",
            source_url AS "sourceUrl",
            source_url AS "source_url",
            urgent
     FROM posts
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function readPostBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT id,
            slug,
            url,
            category,
            subcategory,
            title,
            excerpt,
            content,
            author,
            published_at AS "publishedAt",
            image_url AS "imageUrl",
            source_url AS "sourceUrl",
            source_name AS "sourceName",
            urgent
     FROM posts
     WHERE slug = $1
     LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

async function findPostBySourceUrl(sourceUrl) {
  if (!sourceUrl) return null;
  const { rows } = await pool.query(
    `SELECT id,
            slug,
            url,
            source_url AS "sourceUrl",
            source_url AS "source_url"
     FROM posts
     WHERE source_url = $1
     LIMIT 1`,
    [sourceUrl]
  );
  return rows[0] || null;
}

async function insertPost(post) {
  const { rows } = await pool.query(
    `INSERT INTO posts
      (slug, url, category, subcategory, title, excerpt, content, author,
       published_at, image_url, source_url, source_name, urgent)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id, slug, url`,
    [
      post.slug,
      post.url,
      post.category,
      post.subcategory,
      post.title,
      post.excerpt,
      post.content,
      post.author,
      post.publishedAt,
      post.imageUrl,
      post.sourceUrl,
      post.sourceName,
      post.urgent
    ]
  );
  return rows[0];
}

// =========================
// Parceria (envio de e-mail)
// =========================
app.post('/api/partnership-send', async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');

  try {
    const { nome, sobrenome, email, mensagem } = req.body || {};

    const cleanNome = String(nome || '').trim();
    const cleanSobrenome = String(sobrenome || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanMensagem = String(mensagem || '').trim();

    if (!cleanNome || !cleanSobrenome || !cleanEmail || !cleanMensagem) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ ok: false, error: 'INVALID_EMAIL' });
    }

    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ ok: false, error: 'SMTP_NOT_CONFIGURED' });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    const to = process.env.MAIL_TO || process.env.SMTP_USER || 'geopoliticaestrategica@geopoliticaestrategica.com';
    const subject = 'Novo contato de parceria';

    const textBody =
`Nome: ${cleanNome}
Sobrenome: ${cleanSobrenome}
E-mail: ${cleanEmail}
Mensagem:
${cleanMensagem}
`;

    await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: textBody,
      replyTo: cleanEmail
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'SEND_ERROR' });
  }
});

// =========================
// Markets
// =========================
function fmtBCBDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

async function fetchUSDBRL_BCB_PTAX() {
  for (let back = 0; back <= 10; back++) {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const dateStr = fmtBCBDate(d);
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${dateStr}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`;
    try {
      const data = await fetchJson(url);
      const row = data?.value?.[0];
      const v = safeNumber(row?.cotacaoVenda);
      if (v != null) return v;
    } catch (_) {}
  }
  return null;
}

async function fetchEURUSD_ECB() {
  try {
    const xml = await fetchText('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    const m = xml.match(/currency=['"]USD['"]\s+rate=['"]([0-9.]+)['"]/);
    const v = m ? safeNumber(m[1]) : null;
    return v;
  } catch (_) {
    return null;
  }
}

async function fetchStooqClose(symbol) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
  try {
    const csv = await fetchText(url);
    if (csv.toLowerCase().includes('no data')) return null;
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return null;
    const cols = lines[1].split(',');
    const close = safeNumber(cols[6]);
    return close;
  } catch (_) {
    return null;
  }
}

async function fetchBTCUSD_CoinGecko() {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
    const data = await fetchJson(url);
    return safeNumber(data?.bitcoin?.usd);
  } catch (_) {
    return null;
  }
}

async function fetchFREDLatest(seriesId) {
  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
    const csv = await fetchText(url);
    const lines = csv.trim().split(/\r?\n/);
    for (let i = lines.length - 1; i >= 1; i--) {
      const parts = lines[i].split(',');
      const n = safeNumber(parts?.[1]);
      if (n != null) return n;
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function fetchVIX_CBOE() {
  try {
    const url = 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv';
    const csv = await fetchText(url);
    const lines = csv.trim().split(/\r?\n/);
    for (let i = lines.length - 1; i >= 1; i--) {
      const cols = lines[i].split(',');
      const close = safeNumber(cols?.[4]);
      if (close != null) return close;
    }
    return null;
  } catch (_) {
    return null;
  }
}

app.get('/api/markets', async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');

  const tasks = {
    brent: async () => (await fetchFREDLatest('DCOILBRENTEU')) ?? null,
    gold: async () => (await fetchStooqClose('xauusd')) ?? (await fetchStooqClose('gc.f')) ?? null,
    usdbrl: fetchUSDBRL_BCB_PTAX,
    eurusd: fetchEURUSD_ECB,
    natgas: async () => (await fetchStooqClose('ng.f')) ?? null,
    sp500: async () => (await fetchStooqClose('^spx')) ?? (await fetchStooqClose('spx')) ?? null,
    nasdaq: async () => (await fetchStooqClose('^ndx')) ?? (await fetchStooqClose('ndx')) ?? null,
    bitcoin: fetchBTCUSD_CoinGecko,
    vix: fetchVIX_CBOE
  };

  const entries = await Promise.all(
    Object.entries(tasks).map(async ([k, fn]) => {
      try {
        const v = await fn();
        return [k, v];
      } catch (_) {
        return [k, null];
      }
    })
  );

  const out = {};
  for (const [k, v] of entries) out[k] = v;

  res.json(out);
});

// =========================
// News API (Postgres)
// =========================

// Ingest de matéria (chamado pelo n8n)
app.post('/api/ingest', async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');

  // segurança simples por token
  const token = String(req.header('x-ingest-token') || req.body?.token || '').trim();
  if (!INGEST_TOKEN || token !== INGEST_TOKEN) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  let sourceUrl = null;
  try {
    const payload = req.body || {};

    const title = safeText(payload.title, 220);
    const excerpt = safeText(payload.excerpt || payload.summary, 420);
    const imageUrl = safeText(payload.imageUrl, 800);
    const rawSourceUrl = payload.sourceUrl ?? payload.source_url;
    const normalizedSourceUrl = normalizeSourceUrl(rawSourceUrl);
    sourceUrl = safeText(normalizedSourceUrl, 1200) || null;
    const sourceName = safeText(payload.sourceName, 80);
    const category = safeText(payload.category, 30) || 'GEO';
    const subcategory = safeText(payload.subcategory, 60) || null;
    const author = safeText(payload.author, 60) || 'Geopolítica Estratégica';
    const content = stripTrailingByline(safeContent(payload.content, 25000), author);
    const publishedAt = safeIsoDate(payload.publishedAt || new Date().toISOString());
    const urgent = Boolean(payload.urgent);

    if (!title || !excerpt) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    }

    // Dedupe por source_url
    if (sourceUrl) {
      const existing = await findPostBySourceUrl(sourceUrl);
      if (existing) {
        return res.json({
          ok: true,
          duplicate: true,
          reason: 'DUPLICATE_SOURCE_URL',
          id: existing.id,
          slug: existing.slug,
          url: existing.url || (`/p/${existing.slug}`),
          source_url: sourceUrl
        });
      }
    }

    // slug único
    const baseSlug = slugify(payload.slug || title);
    let slug = baseSlug || ('post-' + Date.now());
    let bump = 2;

    while (true) {
      const check = await pool.query(`SELECT 1 FROM posts WHERE slug = $1 LIMIT 1`, [slug]);
      if (check.rowCount === 0) break;
      slug = `${baseSlug}-${bump}`;
      bump++;
    }

    const url = `/p/${slug}`;

    const post = {
      slug,
      url,
      title,
      excerpt,
      content,
      imageUrl,
      sourceUrl: sourceUrl,
      sourceName: sourceName || null,
      category,
      subcategory,
      author,
      publishedAt,
      urgent
    };

    const inserted = await insertPost(post);
    return res.json({
      ok: true,
      duplicate: false,
      id: inserted.id,
      slug: inserted.slug,
      url: inserted.url,
      source_url: sourceUrl
    });
  } catch (e) {
    if (e && e.code === '23505' && sourceUrl) {
      const existing = await findPostBySourceUrl(sourceUrl);
      if (existing) {
        return res.json({
          ok: true,
          duplicate: true,
          reason: 'DUPLICATE_SOURCE_URL',
          id: existing.id,
          slug: existing.slug,
          url: existing.url || (`/p/${existing.slug}`),
          source_url: sourceUrl
        });
      }
    }
    return res.status(500).json({ ok: false, error: 'DB_ERROR' });
  }
});

// Lista para o feed
app.get('/api/posts', async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');

  try {
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || '80'), 10) || 80));
    const posts = await readPosts(limit);
    const withSourceUrl = posts.map((p) => ({
      ...p,
      source_url: p.source_url ?? p.sourceUrl ?? null
    }));
    res.json({ ok: true, posts: withSourceUrl });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'DB_ERROR' });
  }
});

// Matéria individual (página)
app.get('/api/post/:slug', async (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');

  try {
    const slug = String(req.params.slug || '').trim();
    const post = await readPostBySlug(slug);
    if (!post) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, post });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'DB_ERROR' });
  }
});

// Página de notícia (renderizada no front)
app.get('/p/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'post.html'));
});


// Bloqueia qualquer acesso a rotas/arquivos de debug (mesmo que existam no disco)
app.use((req, res, next) => {
  const p = req.path || '';
  if (p === '/debug.html' || p === '/debug' || p.startsWith('/_private_debug')) {
    return res.status(404).send('Not found');
  }
  return next();
});


// Serve arquivos estáticos
app.use(express.static(path.join(__dirname)));


app.get('*', (req, res) => {
  return res.status(404).send('Not found');
});



app.listen(PORT, () => {
  console.log(`Geopolítica Estratégica rodando em http://localhost:${PORT}`);
});
