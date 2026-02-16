document.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.getElementById('postTitle');
  const excerptEl = document.getElementById('postExcerpt');
  const dateEl = document.getElementById('postDate');
  const authorEl = document.getElementById('postAuthor');
  const categoryEl = document.getElementById('postCategory');
  const subcategoryEl = document.getElementById('postSubcategory');
  const urgentEl = document.getElementById('postUrgentBadge');
  const heroEl = document.getElementById('postHero');
  const imageEl = document.getElementById('postImage');
  const contentEl = document.getElementById('postContent');
  const sourceEl = document.getElementById('postSource');
  const errorEl = document.getElementById('postError');

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} • ${timePart}`;
  }

  function normalizeInline(text) {
    return String(text || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeRegex(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripTrailingByline(text, author) {
    const raw = String(text || '');
    const trimmed = raw.trim();
    if (!trimmed) return '';

    const authorRaw = String(author || '').trim();
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

  function renderParagraphs(container, text) {
    if (!container) return;
    container.innerHTML = '';
    const raw = String(text || '').trim();
    if (!raw) return;
    const normalized = raw
      .replace(/\r\n?/g, '\n')
      .replace(/&lt;\s*br\s*\/?&gt;/gi, '\n')
      .replace(/&lt;\s*\/\s*p\s*&gt;/gi, '\n\n')
      .replace(/&lt;\s*p[^&]*?&gt;/gi, '')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*p\s*>/gi, '\n\n')
      .replace(/<\s*p[^>]*>/gi, '');
    let blocks = normalized.split(/\n{2,}/g);
    if (blocks.length === 1) {
      blocks = normalized.split(/\n+/g);
    }
    blocks.forEach((block) => {
      const cleaned = block.replace(/\s+\n/g, '\n').trim();
      if (!cleaned) return;
      const p = document.createElement('p');
      p.textContent = cleaned;
      container.appendChild(p);
    });
  }

  const slug = (window.location.pathname || '').split('/').filter(Boolean).pop();
  if (!slug) {
    showError('Notícia não encontrada.');
    return;
  }

  fetch(`/api/post/${encodeURIComponent(slug)}?ts=${Date.now()}`, { cache: 'no-store' })
    .then(async (res) => {
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : null;
      if (!res.ok || !data || !data.ok || !data.post) {
        throw new Error(data?.error || 'NOT_FOUND');
      }
      return data.post;
    })
    .then((post) => {
      if (titleEl) titleEl.textContent = post.title || 'Sem título';
      if (post.title) document.title = `${post.title} | Geopolítica Estratégica`;

      if (excerptEl) {
        const excerpt = String(post.excerpt || '').trim();
        if (excerpt) {
          excerptEl.textContent = excerpt;
          excerptEl.classList.remove('hidden');
        } else {
          excerptEl.classList.add('hidden');
        }
      }

      if (dateEl) dateEl.textContent = formatDateTime(post.publishedAt);
      if (authorEl) {
        authorEl.textContent = '';
        authorEl.classList.add('hidden');
      }

      if (categoryEl) categoryEl.textContent = post.category || 'GEO';
      if (subcategoryEl) {
        const sub = String(post.subcategory || '').trim();
        if (sub) {
          subcategoryEl.textContent = sub;
          subcategoryEl.classList.remove('hidden');
        } else {
          subcategoryEl.classList.add('hidden');
        }
      }

      if (urgentEl) {
        if (post.urgent) {
          urgentEl.classList.remove('hidden');
        } else {
          urgentEl.classList.add('hidden');
        }
      }

      const imageUrl = String(post.imageUrl || '').trim();
      if (imageUrl && imageEl && heroEl) {
        imageEl.src = imageUrl;
        imageEl.alt = post.title || 'Imagem da notícia';
        heroEl.classList.remove('hidden');
      } else if (heroEl) {
        heroEl.classList.add('hidden');
      }

      const contentRaw = String(post.content || '').trim() || String(post.excerpt || '').trim();
      const content = stripTrailingByline(contentRaw, post.author);
      renderParagraphs(contentEl, content);

      if (sourceEl) {
        const authorName = String(post.author || '').trim();
        if (authorName) {
          sourceEl.classList.remove('hidden');
          sourceEl.innerHTML = '';
          const label = document.createElement('span');
          label.textContent = 'Por: ';
          sourceEl.appendChild(label);
          const text = document.createElement('span');
          text.textContent = authorName;
          sourceEl.appendChild(text);
        } else {
          sourceEl.classList.add('hidden');
          sourceEl.innerHTML = '';
        }
      }
    })
    .catch(() => {
      showError('Não foi possível carregar a notícia.');
    });
});
