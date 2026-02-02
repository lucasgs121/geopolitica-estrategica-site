const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, '[]', 'utf8');
}

function loadPosts() {
  ensureStore();
  try {
    const raw = fs.readFileSync(POSTS_FILE, 'utf8');
    const data = JSON.parse(raw || '[]');
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function savePosts(posts) {
  ensureStore();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function uniqueSlug(baseSlug, existingSlugs) {
  let slug = baseSlug || 'post';
  if (!existingSlugs.has(slug)) return slug;

  let n = 2;
  while (existingSlugs.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

function upsertPost(newPost) {
  const posts = loadPosts();

  const existingSlugs = new Set(posts.map(p => p.slug).filter(Boolean));

  const createdAt = new Date().toISOString();
  const sourceUrl = (newPost.sourceUrl || '').trim();

  // evita duplicar por sourceUrl
  if (sourceUrl) {
    const already = posts.find(p => p.sourceUrl === sourceUrl);
    if (already) return { posts, post: already, created: false };
  }

  const baseSlug = slugify(newPost.slug || newPost.title || '');
  const slug = uniqueSlug(baseSlug, existingSlugs);

  const post = {
    id: `p_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    slug,
    title: String(newPost.title || '').trim(),
    summary: String(newPost.summary || '').trim(),
    content: String(newPost.content || '').trim(),
    imageUrl: String(newPost.imageUrl || '').trim(),
    sourceName: String(newPost.sourceName || '').trim(),
    sourceUrl: sourceUrl,
    publishedAt: newPost.publishedAt ? String(newPost.publishedAt) : createdAt,
    createdAt,
    tags: Array.isArray(newPost.tags) ? newPost.tags : [],
  };

  // mais novo primeiro
  posts.unshift(post);
  savePosts(posts);

  return { posts, post, created: true };
}

function listPosts(limit = 30) {
  const posts = loadPosts();
  return posts.slice(0, limit).map(p => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    imageUrl: p.imageUrl,
    publishedAt: p.publishedAt,
  }));
}

function getPostBySlug(slug) {
  const posts = loadPosts();
  return posts.find(p => p.slug === slug) || null;
}

module.exports = {
  upsertPost,
  listPosts,
  getPostBySlug,
};
