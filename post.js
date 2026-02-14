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

  function renderParagraphs(container, text) {
    if (!container) return;
    container.innerHTML = '';
    const raw = String(text || '').trim();
    if (!raw) return;

    const blocks = raw.split(/\n{2,}/g);
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
      if (authorEl) authorEl.textContent = post.author ? `Por ${post.author}` : '';

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

      const content = String(post.content || '').trim() || String(post.excerpt || '').trim();
      renderParagraphs(contentEl, content);

      if (sourceEl) {
        const sourceName = String(post.sourceName || '').trim();
        const sourceUrl = String(post.sourceUrl || '').trim();
        if (sourceName || sourceUrl) {
          sourceEl.classList.remove('hidden');
          sourceEl.innerHTML = '';
          const label = document.createElement('span');
          label.textContent = 'Fonte: ';
          sourceEl.appendChild(label);

          if (sourceUrl) {
            const link = document.createElement('a');
            link.href = sourceUrl;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = sourceName || sourceUrl;
            sourceEl.appendChild(link);
          } else {
            const text = document.createElement('span');
            text.textContent = sourceName;
            sourceEl.appendChild(text);
          }
        } else {
          sourceEl.classList.add('hidden');
        }
      }
    })
    .catch(() => {
      showError('Não foi possível carregar a notícia.');
    });
});
