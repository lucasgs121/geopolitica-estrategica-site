/*
 * Script responsável por tornar o site interativo e responsivo.
 * Ele popula o feed dinamicamente, aplica filtros conforme o usuário
 * seleciona categorias, regiões, temas, países, datas e pesquisa por palavras‑chave.
 * Também mantém a data atualizada no topo e permite resetar filtros facilmente.
 */

document.addEventListener('DOMContentLoaded', () => {

  // MOBILE: garante que o ticker (menu + breaking) fique sempre colado logo abaixo do header
  // (evita sobreposição quando o header é sticky)
  const updateMobileHeaderHeightVar = () => {
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    if (!isMobile) return;
    const header = document.querySelector('.header');
    if (!header) return;
    const h = Math.round(header.getBoundingClientRect().height);
    if (h > 0) {
      document.documentElement.style.setProperty('--ge-header-h', `${h}px`);
    }
  };
  updateMobileHeaderHeightVar();
  window.addEventListener('resize', updateMobileHeaderHeightVar, { passive: true });
  window.addEventListener('orientationchange', updateMobileHeaderHeightVar, { passive: true });

  // Atualiza a data no cabeçalho a cada minuto
  const dateSpan = document.querySelector('.date-text');
  function updateDate() {
    const now = new Date();
    const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('pt-BR', { month: 'long' });
    const year = now.getFullYear();
    dateSpan.textContent = `${weekday}, ${day} de ${month} de ${year}`;
  }
  updateDate();


  // ----- Mobile menu (off-canvas) -----
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuBtnRow2 = document.getElementById('mobileMenuBtnRow2');
  // Some layouts use a dedicated breaking-line menu button
  const mobileMenuBtnBreaking = document.getElementById('mobileMenuBtnBreaking');
  const navCloseBtn = document.getElementById('navCloseBtn');
  const navOverlay = document.getElementById('navOverlay');
  const mainNav = document.getElementById('mainNav');

  function geOpenNav(){
    document.body.classList.add('nav-open');
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded','true');
    if (mobileMenuBtnRow2) mobileMenuBtnRow2.setAttribute('aria-expanded','true');
    if (mobileMenuBtnBreaking) mobileMenuBtnBreaking.setAttribute('aria-expanded','true');
  }
  function geCloseNav(){
    document.body.classList.remove('nav-open');
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded','false');
    if (mobileMenuBtnRow2) mobileMenuBtnRow2.setAttribute('aria-expanded','false');
    if (mobileMenuBtnBreaking) mobileMenuBtnBreaking.setAttribute('aria-expanded','false');
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', geOpenNav);
  if (mobileMenuBtnRow2) mobileMenuBtnRow2.addEventListener('click', geOpenNav);
  if (mobileMenuBtnBreaking) mobileMenuBtnBreaking.addEventListener('click', geOpenNav);
  if (navCloseBtn) navCloseBtn.addEventListener('click', geCloseNav);
  if (navOverlay) navOverlay.addEventListener('click', geCloseNav);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') geCloseNav(); });


  // ----- Mobile swipe to close (drag from left to right) -----
  // Only active when the off-canvas menu is open and screen is in mobile range.
  if (mainNav){
    let geTouchStartX = 0;
    let geTouchStartY = 0;
    const geIsMobile = () => window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    const geNavIsOpen = () => document.body.classList.contains('nav-open');

    mainNav.addEventListener('touchstart', (e) => {
      if (!geIsMobile() || !geNavIsOpen()) return;
      const t = e.touches && e.touches[0];
      if (!t) return;
      geTouchStartX = t.clientX;
      geTouchStartY = t.clientY;
    }, { passive: true });

    mainNav.addEventListener('touchend', (e) => {
      if (!geIsMobile() || !geNavIsOpen()) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - geTouchStartX;
      const dy = t.clientY - geTouchStartY;

      // Close on a clear swipe right gesture
      if (dx > 70 && Math.abs(dx) > Math.abs(dy) * 1.4){
        geCloseNav();
      }
    }, { passive: true });


  // ----- Mobile swipe to open (drag from right to left) -----
  // Active when the menu is CLOSED. Start gesture near the right edge to avoid conflicts.
  (function(){
    let startX = 0;
    let startY = 0;
    const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    const navIsOpen = () => document.body.classList.contains('nav-open');
    const isInteractiveEl = (el) => {
      if (!el) return false;
      const tag = (el.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || el.isContentEditable;
    };

    document.addEventListener('touchstart', (e) => {
      if (!isMobile() || navIsOpen()) return;
      const t = e.touches && e.touches[0];
      if (!t) return;

      // Only begin if the touch starts close to the right edge
      const edge = Math.max(20, Math.min(36, window.innerWidth * 0.08));
      if (t.clientX < window.innerWidth - edge) return;

      // Avoid opening while interacting with inputs/buttons
      if (isInteractiveEl(e.target)) return;

      startX = t.clientX;
      startY = t.clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isMobile() || navIsOpen()) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Open on a clear swipe LEFT gesture
      if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.4){
        geOpenNav();
      }
    }, { passive: true });
  })();

  }

  setInterval(updateDate, 60000);

  // Dados de notícias para o feed (mockado). Em um cenário real estes dados viriam de uma API.
  // Cada item possui categoria e subcategoria para permitir filtragem pelo menu
  const feedItems = [
    {
      id: 1,
      category: 'CONFLITOS',
      subcategory: 'israel-ira',
      title: 'Tensão no Estreito de Ormuz: Irã anuncia novos exercícios navais',
      excerpt: 'Análise estratégica urgente sobre o aumento de atividade naval e o impacto potencial em rotas de energia, preços e cálculo de risco no Golfo.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-04T14:06:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1520975958225-5f52f4f1b7f1?auto=format&fit=crop&w=1600&q=60',
      urgent: true
    },
    {
      id: 2,
      category: 'ECON',
      subcategory: 'comercio-global',
      title: 'Europa reavalia cadeias de suprimento em meio a novos choques industriais',
      excerpt: 'Governos ampliam incentivos e discutem segurança econômica, com efeitos diretos em energia, indústria e exportações.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-04T12:22:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    },
    {
      id: 3,
      category: 'GEO',
      subcategory: 'diplomacia',
      title: 'Washington ajusta postura regional e pressiona aliados por novos compromissos',
      excerpt: 'O movimento abre espaço para reações de rivais e para uma nova rodada de disputas por influência no continente.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-04T10:05:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    }
    // Additional sample items to demonstrate pagination and highlights
    ,{
      id: 4,
      category: 'DEFESA',
      subcategory: 'movimentacoes-militares',
      title: 'Forças armadas realizam grandes exercícios no Pacífico',
      excerpt: 'Operação mobiliza centenas de aeronaves e navios em demonstração de poder militar.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-04T09:30:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1494412651409-8963f1304e80?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    },{
      id: 5,
      category: 'CIBER',
      subcategory: 'ciberataques',
      title: 'Novo ataque cibernético compromete dados de empresas europeias',
      excerpt: 'Especialistas alertam para aumento de incidentes e a necessidade de reforçar a segurança digital.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-04T08:15:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1556742043-f755b548aa35?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    },{
      id: 6,
      category: 'ECON',
      subcategory: 'impactos-guerra',
      title: 'Mercados globais recuam com tensões no Oriente Médio',
      excerpt: 'Preços do petróleo e do ouro sobem enquanto bolsas registram queda após novos confrontos.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-04T07:50:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    },{
      id: 7,
      category: 'BRASIL',
      subcategory: 'posicao-brasil',
      title: 'Brasil assume papel de mediador em nova crise internacional',
      excerpt: 'Diplomacia brasileira trabalha para acalmar tensões entre países rivais e busca consenso.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-03T18:40:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1486308510493-aa64833637dc?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    },{
      id: 8,
      category: 'REGIOES',
      subcategory: 'asia',
      title: 'Conferência regional debate cooperação econômica na Ásia',
      excerpt: 'Líderes discutem formas de integração e crescimento sustentável na região.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-03T16:10:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1498550744920-e9fc8f2a6457?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    },{
      id: 9,
      category: 'CONFLITOS',
      subcategory: 'china-taiwan',
      title: 'Tensão aumenta entre China e Taiwan após exercícios militares',
      excerpt: 'Analistas veem riscos de escalada e monitoram movimentações de forças chinesas e taiwanesas.',
      author: 'Geopolítica Estratégica',
      publishedAt: '2026-01-03T14:05:00-03:00',
      imageUrl: 'https://images.unsplash.com/photo-1508780709619-79562169bc64?auto=format&fit=crop&w=1600&q=60',
      urgent: false
    }
  ];

  // Constants to control the number of highlighted stories and the pagination size
  const EMPHASISED_COUNT = 4;
  const STANDARD_ITEMS_PER_PAGE = 6;
  let currentPage = 1;

  /**
   * Calcula uma string de tempo relativo em português (ex.: "há 2 horas", "há 3 dias").
   * @param {string} iso - data ISO no formato YYYY-MM-DDTHH:MM:SSZ
   * @returns {string}
   */
  function getRelativeTime(iso) {
    const now = new Date();
    const past = new Date(iso);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000); // em segundos
    const minute = 60;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) {
      return 'agora';
    } else if (diff < hour) {
      const m = Math.floor(diff / minute);
      return `há ${m} ${m === 1 ? 'minuto' : 'minutos'}`;
    } else if (diff < day) {
      const h = Math.floor(diff / hour);
      return `há ${h} ${h === 1 ? 'hora' : 'horas'}`;
    } else {
      const d = Math.floor(diff / day);
      return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
    }
  }

  /**
   * Cria um card destacado para as notícias em destaque. O primeiro card ocupa
   * a posição maior; os demais são menores. Todos os cards incluem imagem de
   * fundo, categoria, título e tempo relativo.
   * @param {Object} item - objeto da notícia
   * @param {number} index - índice dentro do conjunto de destaques
   * @returns {HTMLElement}
   */
  function createHighlightCard(item, index) {
    const card = document.createElement('div');
    card.className = 'highlight-card';
    // Define tamanho com base no índice: primeiro é grande
    if (index === 0) {
      card.classList.add('large');
    } else {
      card.classList.add('small');
    }
    card.style.backgroundImage = `url('${item.imageUrl}')`;
    // Sobreposição
    const overlay = document.createElement('div');
    overlay.className = 'highlight-overlay';
    // Meta: categoria e tempo
    const meta = document.createElement('div');
    meta.className = 'highlight-meta';
    const catSpan = document.createElement('span');
    catSpan.className = 'highlight-category';
    catSpan.textContent = item.category;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'highlight-time';
    timeSpan.textContent = getRelativeTime(item.publishedAt);
    meta.appendChild(catSpan);
    meta.appendChild(timeSpan);
    // Título
    const title = document.createElement('h3');
    title.className = 'highlight-title';
    title.textContent = item.title;
    overlay.appendChild(meta);
    overlay.appendChild(title);
    card.appendChild(overlay);
    // Tornar clicável: clicar rola até o artigo correspondente
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const articleEl = document.getElementById(`article-${item.id}`);
      if (articleEl) {
        articleEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
    return card;
  }

  // Estado de filtros aplicados para nova navegação
  const filters = {
    category: 'INICIO', // categoria principal; INICIO exibe todos
    subcategory: null, // subcategoria selecionada (opcional)
    search: '' // texto da busca livre
  };

  /**
   * Formata a data e hora de publicação para exibição (ex.: "04 DE JAN., 14:06").
   * @param {string} iso - data ISO no formato YYYY-MM-DDTHH:MM:SSZ
   */
  function formatDateTime(iso) {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
    const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  }

  /**
   * Renderiza a lista de notícias filtradas na página.
   * @param {Array} items - array de objetos de notícias
   */
  function renderFeed(items) {
    const feedList = document.getElementById('feedList');
    if (!feedList) return;
    feedList.innerHTML = '';

    // If no items, show empty state
    if (items.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.textContent = 'Nenhuma notícia encontrada para os filtros selecionados.';
      emptyDiv.style.padding = '1rem';
      emptyDiv.style.fontStyle = 'italic';
      feedList.appendChild(emptyDiv);
      return;
    }

    // Calculate pagination
    const totalRestItems = Math.max(0, items.length - EMPHASISED_COUNT);
    const totalPages = Math.max(1, Math.ceil(totalRestItems / STANDARD_ITEMS_PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    // Render highlighted items on the first page only
    const highlightsWrapper = document.getElementById('topHighlightsWrapper');
    if (highlightsWrapper) {
      highlightsWrapper.innerHTML = '';
    }
    if (currentPage === 1) {
      const highlightCount = Math.min(EMPHASISED_COUNT, items.length);
      if (highlightCount > 0 && highlightsWrapper) {
        const highlightsContainer = document.createElement('div');
        highlightsContainer.className = 'top-highlights';
        for (let i = 0; i < highlightCount; i++) {
          highlightsContainer.appendChild(createHighlightCard(items[i], i));
        }
        highlightsWrapper.appendChild(highlightsContainer);
      }
    }

    // Determine starting index for rest items based on current page
    const restStart = EMPHASISED_COUNT + (currentPage - 1) * STANDARD_ITEMS_PER_PAGE;
    const restEnd = restStart + STANDARD_ITEMS_PER_PAGE;
    const restItems = items.slice(restStart, restEnd);

    // Render standard cards
    restItems.forEach(item => {
      const article = document.createElement('article');
      article.className = 'feed-card';
      article.id = `article-${item.id}`;

      const imageDiv = document.createElement('div');
      imageDiv.className = 'card-image';
      imageDiv.style.backgroundImage = `url('${item.imageUrl}')`;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'card-content';

      const metaDiv = document.createElement('div');
      metaDiv.className = 'card-meta';
      const dateSpan = document.createElement('span');
      dateSpan.className = 'card-date';
      dateSpan.textContent = formatDateTime(item.publishedAt);
      metaDiv.appendChild(dateSpan);

      const titleEl = document.createElement('h2');
      titleEl.className = 'card-title';
      titleEl.textContent = item.title;

      const excerptEl = document.createElement('p');
      excerptEl.className = 'card-excerpt';
      excerptEl.textContent = item.excerpt;

      const authorEl = document.createElement('div');
      authorEl.className = 'card-author';
      authorEl.textContent = `Por ${item.author}`;

      contentDiv.appendChild(metaDiv);
      contentDiv.appendChild(titleEl);
      contentDiv.appendChild(excerptEl);
      contentDiv.appendChild(authorEl);

      const badgeDiv = document.createElement('div');
      badgeDiv.className = 'card-badge';
      badgeDiv.textContent = item.category;

      article.appendChild(imageDiv);
      article.appendChild(contentDiv);
      article.appendChild(badgeDiv);

      // Card clicável: abre a notícia detalhada (âncora na própria página)
      article.style.cursor = 'pointer';
      article.addEventListener('click', () => {
        const target = document.getElementById(`article-${item.id}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (item.link && item.link !== '#') {
          window.open(item.link, '_blank', 'noopener,noreferrer');
        }
      });

      feedList.appendChild(article);
    });

    // Render pagination controls if more than one page
    if (totalPages > 1) {
      const pagination = document.createElement('nav');
      pagination.className = 'pagination';
      for (let p = 1; p <= totalPages; p++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        btn.textContent = p;
        if (p === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => {
          currentPage = p;
          renderFeed(items);
          // scroll to top of feed list when changing page
          const feedTop = document.querySelector('.feed-title');
          if (feedTop) feedTop.scrollIntoView({ behavior: 'smooth' });
        });
        pagination.appendChild(btn);
      }
      feedList.appendChild(pagination);
    }
  }

  // Mobile ticker: mostra sempre as 3 notícias mais recentes (independente de filtro)
  function updateMobileTicker() {
    const el = document.getElementById('mobileTickerContent');
    if (!el) return;
    const latest = [...feedItems]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 3)
      .map(i => i.title)
      .filter(Boolean);
    const text = latest.length ? latest.join('   |   ') : 'Carregando notícias...';
    // Duplicar o conteúdo para uma rolagem contínua
    el.textContent = `${text}   |   ${text}`;
  }

  /**
   * Aplica todos os filtros definidos em `filters` e chama o renderizador.
   */
  function applyFilters() {
    let results = feedItems.filter(item => {
      // Filtra por categoria principal (exceto INICIO, que exibe tudo)
      if (filters.category && filters.category !== 'INICIO' && item.category !== filters.category) return false;
      // Filtra por subcategoria (se existir)
      if (filters.subcategory && item.subcategory !== filters.subcategory) return false;
      // Filtra por busca textual em título ou resumo
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!item.title.toLowerCase().includes(s) && !item.excerpt.toLowerCase().includes(s)) return false;
      }
      return true;
    });
    // Ordena resultados pelo mais recente
    results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    // Sempre reinicia para a primeira página ao aplicar novos filtros
    currentPage = 1;
    renderFeed(results);
    updateMobileTicker();
  }

  // Configura eventos para o menu de navegação de categorias
  const categoryItems = document.querySelectorAll('.categories .category');
  categoryItems.forEach(cat => {
    cat.addEventListener('click', (e) => {
      const isMobile = window.innerWidth <= 900;

      const selectedCategory = cat.dataset.category;

      // Remove seleção de todos
      categoryItems.forEach(c => c.classList.remove('active'));
      cat.classList.add('active');

      filters.category = selectedCategory;
      filters.subcategory = null;
      applyFilters();

      // Em mobile, sempre fecha o menu após selecionar (menu simples)
      if (isMobile) {
        try { geCloseNav(); } catch (err) {}
      }
    });
  });

  // Eventos para subcategorias
  const subItems = document.querySelectorAll('.submenu li');
  subItems.forEach(sub => {
    sub.addEventListener('click', (e) => {
      e.stopPropagation(); // evita acionar o clique do pai
      const subcat = sub.dataset.sub;
      const parent = sub.closest('.has-submenu');
      const parentCat = parent.dataset.category;
      // Ajusta filtros
      filters.category = parentCat;
      filters.subcategory = subcat;
      // Atualiza classes ativas
      categoryItems.forEach(c => c.classList.remove('active'));
      parent.classList.add('active');
      applyFilters();
      if (window.innerWidth <= 900) { try { geCloseNav(); } catch (err) {} }
    });
  });

  // Links do rodapé (atalhos para as mesmas categorias do menu superior)
  const footerCategoryLinks = document.querySelectorAll('.footer-category-link');
  footerCategoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetCategory = link.dataset.category;

      // Encontra o item correspondente no menu superior e simula o clique para reaproveitar a lógica existente
      const navItem = document.querySelector(`.categories .category[data-category="${targetCategory}"]`);
      if (navItem) {
        navItem.click();
        // Garante que o usuário seja levado ao topo do feed (comportamento natural de navegação)
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });


  // Busca na navegação
  const navSearchInput = document.getElementById('navSearchInput');
  const navSearchBtn = document.getElementById('navSearchBtn');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const mobileSearchBtn = document.getElementById('mobileSearchBtn');
  function handleSearch() {
    filters.search = navSearchInput.value.trim();
    applyFilters();
  }
  navSearchInput.addEventListener('input', handleSearch);
  navSearchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleSearch();
  });

  // Mobile search mirrors the desktop search logic (same filtering + button behavior)
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', () => {
      navSearchInput.value = mobileSearchInput.value;
      navSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Ensure the desktop input is the single source of truth
      if (mobileSearchInput) navSearchInput.value = mobileSearchInput.value;
      navSearchBtn.click();
    });
  }

  /**
   * -------- Autenticação --------
   * Implementação simples de login e cadastro usando localStorage.
   */
  const siteContent = document.getElementById('siteContent');
  const openLoginBtn = document.getElementById('openLogin');
  const authModal = document.getElementById('authModal');
  const closeModalBtn = document.getElementById('closeModal');
  const loginTabBtn = document.getElementById('loginTab');
  const registerTabBtn = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const userInfo = document.getElementById('userInfo');
  const userEmailSpan = userInfo ? userInfo.querySelector('.user-email') : null;
  const logoutBtn = document.getElementById('logoutBtn');

  function showModal() {
    authModal.classList.remove('hidden');
  }
  function hideModal() {
    authModal.classList.add('hidden');
  }
  function switchTab(isLogin) {
    if (isLogin) {
      loginTabBtn.classList.add('active');
      registerTabBtn.classList.remove('active');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      loginTabBtn.classList.remove('active');
      registerTabBtn.classList.add('active');
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    }
  }
  function updateUserInterface() {
    const currentUserJSON = localStorage.getItem('currentUser');
    if (currentUserJSON) {
      const user = JSON.parse(currentUserJSON);
      // hide login button, show user info
      if (openLoginBtn) openLoginBtn.classList.add('hidden');
      if (userInfo && userEmailSpan) {
        userEmailSpan.textContent = user.email;
        userInfo.classList.remove('hidden');
      }
    } else {
      // no user logged in: show login button and hide user info
      if (openLoginBtn) openLoginBtn.classList.remove('hidden');
      if (userInfo) userInfo.classList.add('hidden');
    }
  }
  // Event listeners for opening/closing modal and switching tabs
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => {
      showModal();
      switchTab(true);
    });
  }
  if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
  if (loginTabBtn) loginTabBtn.addEventListener('click', () => switchTab(true));
  if (registerTabBtn) registerTabBtn.addEventListener('click', () => switchTab(false));

  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      // Retrieve stored users from localStorage
      const usersJSON = localStorage.getItem('users');
      const users = usersJSON ? JSON.parse(usersJSON) : [];
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        alert('Credenciais inválidas.');
        return;
      }
      localStorage.setItem('currentUser', JSON.stringify({ email: user.email }));
      hideModal();
      updateUserInterface();
    });
  }
  // Registration form submission
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const confirm = document.getElementById('registerConfirm').value;
      const subscribe = document.getElementById('subscribeNews').checked;
      if (password !== confirm) {
        alert('As senhas não conferem.');
        return;
      }
      // Retrieve existing users array
      const usersJSON = localStorage.getItem('users');
      const users = usersJSON ? JSON.parse(usersJSON) : [];
      if (users.some(u => u.email === email)) {
        alert('Já existe uma conta com este email.');
        return;
      }
      const newUser = { email, password, subscribe };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify({ email }));
      hideModal();
      updateUserInterface();
    });
  }
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('currentUser');
      updateUserInterface();
      // Após logout, não exibimos automaticamente o modal; o site permanece acessível.
    });
  }
  // Initialize UI on page load
  updateUserInterface();
  // Render feed for the first time for all users
  applyFilters();

  /**
   * -------- Breaking News ticker --------
   * Mostra até 5 notícias marcadas como urgentes. Cicla automaticamente.
   */
  const breakingItems = feedItems
    .filter(item => item.urgent)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 5);
  let breakingIndex = 0;
  let currentBreakingId = null;
  const breakingTitleEl = document.querySelector('.breaking-title');
  const prevBtn = document.querySelector('.breaking-prev');
  const nextBtn = document.querySelector('.breaking-next');
  let breakingInterval;

  /**
   * Atualiza o título do breaking news com base no índice atual.
   */
  function updateBreaking() {
    if (!breakingItems.length) return;
    const item = breakingItems[breakingIndex];
    currentBreakingId = item.id;
    if (breakingTitleEl) breakingTitleEl.textContent = item.title;
  }

  /**
   * Avança para a próxima notícia urgente e atualiza o ticker.
   */
  function showNextBreaking() {
    if (!breakingItems.length) return;
    breakingIndex = (breakingIndex + 1) % breakingItems.length;
    updateBreaking();
  }

  /**
   * Volta para a notícia urgente anterior.
   */
  function showPrevBreaking() {
    if (!breakingItems.length) return;
    breakingIndex = (breakingIndex - 1 + breakingItems.length) % breakingItems.length;
    updateBreaking();
  }

  /**
   * Inicia ou reinicia o intervalo de rotação automática.
   */
  function startBreakingInterval() {
    clearInterval(breakingInterval);
    breakingInterval = setInterval(showNextBreaking, 5000);
  }

  // Inicializa o ticker
  updateBreaking();
  startBreakingInterval();

  // Clique no título leva ao artigo correspondente
  if (breakingTitleEl) {
    breakingTitleEl.style.cursor = 'pointer';
    breakingTitleEl.addEventListener('click', (e) => {
      if (currentBreakingId) {
        const article = document.getElementById(`article-${currentBreakingId}`);
        if (article) article.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Navegação manual via botões
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPrevBreaking();
      startBreakingInterval();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showNextBreaking();
      startBreakingInterval();
    });
  }

  /**
   * ----------------------- Mercados Estratégicos ------------------------
   *
   * Esta seção adiciona suporte a uma lista expandida de indicadores de mercado
   * com atualização simulada em tempo real. Os valores e direções são
   * atualizados de forma aleatória para fins de demonstração. Cada item
   * pode ser clicado para abrir um modal explicativo que descreve o
   * indicador e por que ele é relevante no contexto geopolítico.
   */

  // Definição dos indicadores e seus textos explicativos. Em um cenário real
  // estas descrições poderiam vir de uma API ou base de dados. Os textos
  // fornecem uma explicação breve e um contexto de importância prática.
  const marketIndicators = [
    {
      id: 'brent',
      name: 'Brent Crude',
      description: 'Benchmark global para o preço do petróleo do Mar do Norte.',
      importance: 'Afeta custos de energia, combustíveis e a inflação em diversos países.',
      format: 'dollar',
      threshold: 100,
      impacts: {
        up: 'Alta recente do Brent pressiona custos de energia e aumenta risco inflacionário.',
        down: 'Queda do Brent reduz custos de energia e alivia pressões inflacionárias.',
        flat: 'Estabilidade do Brent mantém expectativas constantes no mercado de energia.'
      }
    },
    {
      id: 'gold',
      name: 'Gold Spot',
      description: 'Preço à vista do ouro negociado no mercado internacional.',
      importance: 'O ouro é reserva de valor e seu preço indica percepção de risco global.',
      format: 'dollar',
      threshold: null,
      impacts: {
        up: 'Alta do ouro indica aversão ao risco e procura por ativos seguros.',
        down: 'Queda do ouro sugere maior apetite por risco e confiança nos mercados.',
        flat: 'Estabilidade do ouro sinaliza sentimento neutro dos investidores.'
      }
    },
    {
      id: 'usdbrl',
      name: 'USD/BRL',
      description: 'Cotação do dólar americano frente ao real brasileiro.',
      importance: 'Impacta importações, exportações, inflação e investimentos no Brasil.',
      format: 'real',
      threshold: 5.50,
      impacts: {
        up: 'Alta do dólar encarece importações e pressiona a inflação brasileira.',
        down: 'Queda do dólar alivia pressões inflacionárias e melhora poder de compra.',
        flat: 'Estabilidade do dólar mantém previsibilidade e facilita planejamento econômico.'
      }
    },
    {
      id: 'eurusd',
      name: 'EUR/USD',
      description: 'Relação entre o euro e o dólar americano.',
      importance: 'Serve como termômetro da força relativa das economias europeia e americana.',
      format: 'dollar',
      threshold: 1.20,
      impacts: {
        up: 'Alta do euro frente ao dólar indica fortalecimento da economia europeia.',
        down: 'Queda do euro sugere maior confiança na economia americana.',
        flat: 'Estabilidade do par EUR/USD indica equilíbrio entre as moedas.'
      }
    },
    {
      id: 'natgas',
      name: 'Natural Gas',
      description: 'Preço internacional do gás natural, principal insumo energético.',
      importance: 'Oscilações impactam custos de produção, aquecimento e cadeias logísticas.',
      format: 'dollar',
      threshold: 4,
      impacts: {
        up: 'Alta do gás natural aumenta custos de produção e aquecimento.',
        down: 'Queda do gás natural reduz custos e pode aliviar a inflação.',
        flat: 'Estabilidade do gás natural garante previsibilidade aos setores consumidores.'
      }
    },
    {
      id: 'sp500',
      name: 'S&P 500',
      description: 'Índice que reúne as 500 maiores empresas listadas nos EUA.',
      importance: 'Reflete o desempenho geral da economia americana e é referência para investimentos globais.',
      format: 'index',
      threshold: 5000,
      impacts: {
        up: 'Alta do S&P 500 indica confiança no desempenho das maiores empresas dos EUA.',
        down: 'Queda do S&P 500 reflete pessimismo no mercado acionário.',
        flat: 'Estabilidade do S&P 500 indica cautela dos investidores.'
      }
    },
    {
      id: 'nasdaq',
      name: 'Nasdaq',
      description: 'Índice de ações que concentra empresas de tecnologia e inovação.',
      importance: 'Indica o ritmo de crescimento e confiança no setor de tecnologia mundial.',
      format: 'index',
      threshold: 16000,
      impacts: {
        up: 'Alta do Nasdaq sinaliza crescimento no setor de tecnologia e inovação.',
        down: 'Queda do Nasdaq sugere desaceleração ou maior aversão a risco em tecnologia.',
        flat: 'Estabilidade do Nasdaq indica incerteza ou consolidação no setor.'
      }
    },
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      description: 'Principal criptomoeda, usada como reserva digital e ativo especulativo.',
      importance: 'Seu preço indica apetite por risco e confiança em criptoativos.',
      format: 'crypto',
      threshold: 60000,
      impacts: {
        up: 'Alta do Bitcoin sinaliza apetite por risco e interesse crescente em criptoativos.',
        down: 'Queda do Bitcoin reflete cautela ou aversão ao risco dos investidores.',
        flat: 'Estabilidade do Bitcoin sugere consolidação do mercado de criptomoedas.'
      }
    },
    {
      id: 'vix',
      name: 'VIX',
      description: 'Índice de volatilidade que mede a expectativa de variação do mercado financeiro.',
      importance: 'É chamado de “índice do medo” e indica a percepção de risco dos investidores.',
      format: 'index',
      threshold: 25,
      impacts: {
        up: 'Alta do VIX indica aumento da volatilidade e medo dos investidores.',
        down: 'Queda do VIX sugere maior estabilidade e confiança no mercado.',
        flat: 'Estabilidade do VIX indica ambiente controlado e previsível.'
      }
    }
  ];

  // Armazena dados numéricos simulados para cada indicador. Cada chave recebe
  // um valor inicial e a variação mais recente para determinar a direção.
  const marketData = {};
  marketIndicators.forEach(ind => {
    // Inicializar com valores plausíveis (estas cifras são meramente indicativas).
    let initial;
    switch (ind.id) {
      case 'brent': initial = 95.42; break;
      case 'gold': initial = 2140; break;
      case 'usdbrl': initial = 4.95; break;
      case 'eurusd': initial = 1.08; break;
      case 'natgas': initial = 3.25; break;
      case 'sp500': initial = 4800; break;
      case 'nasdaq': initial = 15000; break;
      case 'bitcoin': initial = 42000; break;case 'vix': initial = 20; break;
      default: initial = 0;
    }
    marketData[ind.id] = { value: initial, change: 0 };
  });

  /**
   * Mercado em tempo real (com fallback):
   * - USD/BRL: Banco Central do Brasil (BCB) via API SGS (série 3692 - dólar comercial venda)
   * - EUR/USD: ECB (retorna USD/EUR), aqui fazemos inversão
   * - Bitcoin: CoinGecko
   * - Índices (S&P 500, Nasdaq, VIX): Stooq (fallback se indisponível)
   * Demais itens permanecem com mock até plugar APIs específicas.
   */

  async function fetchJsonWithTimeout(url, timeoutMs = 9000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function safeNumber(v) {
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  async function fetchUSDBRL_BCB() {
    // BCB SGS: https://api.bcb.gov.br/dados/serie/bcdata.sgs.3692/dados/ultimos/1?formato=json
    const url = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.3692/dados/ultimos/1?formato=json';
    const data = await fetchJsonWithTimeout(url);
    const last = Array.isArray(data) && data.length ? data[data.length - 1] : null;
    const value = last ? safeNumber(last.valor) : null;
    return value;
  }

  async function fetchEURUSD_ECB() {
    // ECB Data API (USD/EUR). Nós invertemos para EUR/USD.
    // Exemplo: https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=jsondata
    const url = 'https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=jsondata';
    const data = await fetchJsonWithTimeout(url);
    // Navegação defensiva no JSON (estrutura pode variar)
    const obs = data?.dataSets?.[0]?.series;
    if (!obs) return null;
    const firstKey = Object.keys(obs)[0];
    const series = obs[firstKey];
    const obsValues = series?.observations;
    if (!obsValues) return null;
    const lastObsKey = Object.keys(obsValues).sort((a, b) => parseInt(a) - parseInt(b)).pop();
    const usdEur = safeNumber(obsValues?.[lastObsKey]?.[0]);
    if (!usdEur || usdEur <= 0) return null;
    const eurUsd = 1 / usdEur;
    return parseFloat(eurUsd.toFixed(4));
  }

  async function fetchBTC_CoinGecko() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
    const data = await fetchJsonWithTimeout(url);
    const v = safeNumber(data?.bitcoin?.usd);
    return v;
  }

  async function fetchStooqLast(symbol) {
    // Stooq retorna CSV; para manter simples, usamos um endpoint JSON? Não existe oficial.
    // Vamos buscar CSV e parsear rapidamente.
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      const lines = csv.trim().split(/\r?\n/);
      if (lines.length < 2) return null;
      const cols = lines[1].split(',');
      // colunas: Symbol,Date,Time,Open,High,Low,Close,Volume
      const close = safeNumber(cols[6]);
      return close;
    } finally {
      clearTimeout(t);
    }
  }

  function mockDrift(prev) {
    const maxPct = 0.01;
    const delta = (Math.random() * 2 - 1) * prev * maxPct;
    const newVal = prev + delta;
    return { value: parseFloat(newVal.toFixed(2)), change: delta };
  }

  async function updateMarketData() {
    // Snapshot anterior para calcular variação (quando houver valor anterior)
    const prevSnapshot = {};
    marketIndicators.forEach(ind => { prevSnapshot[ind.id] = marketData[ind.id]?.value ?? null; });

    // Busca dados atuais a cada acesso (sem cache) via endpoint interno
    let payload = null;
    try {
      const res = await fetch(`/api/markets?ts=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      payload = await res.json();
    } catch (e) {
      payload = null;
    }

    // Atualiza cada indicador. Se faltar dado, marca como indisponível (null) e não inventa valores.
    marketIndicators.forEach(ind => {
      const nextVal = payload && Object.prototype.hasOwnProperty.call(payload, ind.id) ? safeNumber(payload[ind.id]) : null;
      const prev = prevSnapshot[ind.id];

      if (nextVal == null) {
        marketData[ind.id].value = null;
        marketData[ind.id].change = 0;
        return;
      }

      marketData[ind.id].value = nextVal;
      if (prev == null) {
        marketData[ind.id].change = 0;
      } else {
        marketData[ind.id].change = nextVal - prev;
      }
    });
  }

  /**
   * Converte um valor numérico em uma string formatada adequada. Para pares
   * de moeda e índices diferenciamos exibição de casas decimais.
   * @param {string} id
   * @param {number} value
   */
  function formatValue(id, value) {
    // Buscar o indicador para determinar a formatação
    const ind = marketIndicators.find(i => i.id === id);
    if (!ind) return value.toFixed(2);
    switch (ind.format) {
      case 'index':
        // Índices geralmente são números inteiros
        return value.toFixed(0);
      case 'crypto':
      case 'dollar':
      case 'real':
        // Valores monetários ou commodities com duas casas decimais
        return value.toFixed(2);
      default:
        return value.toFixed(2);
    }
  }

  /**
   * Renderiza a lista de indicadores no DOM com base nos dados atuais. Cada
   * item recebe classes de cor e setas dependendo da variação. Também
   * adiciona ouvintes de clique para abrir o modal explicativo.
   */
  function renderMarkets() {
    const listEl = document.getElementById('marketsList');
    const tsEl = document.getElementById('marketsTimestamp');
    if (!listEl || !tsEl) return;
    // Atualizar timestamp para HH:MM usando hora local do usuário (momento do sucesso)
    const now = new Date();
    tsEl.textContent = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(now);
    // Limpar a lista
    listEl.innerHTML = '';
    marketIndicators.forEach(ind => {
      const li = document.createElement('li');
      li.dataset.indicator = ind.id;
      // Nome do indicador (mantemos maiúsculas para consistência visual)
      const labelSpan = document.createElement('span');
      labelSpan.className = 'market-label';
      labelSpan.textContent = ind.name.toUpperCase();

      // Valor numérico e seta: determina direção, prefixo e formatação
      const { value, change } = marketData[ind.id];
      if (value == null) {
        const valueSpan = document.createElement('span');
        valueSpan.className = 'market-value flat';
        valueSpan.textContent = 'Indisponível';
        li.appendChild(labelSpan);
        li.appendChild(valueSpan);
        li.addEventListener('click', () => { showIndicatorModal(ind.id); });
        listEl.appendChild(li);
        return;
      }
      let arrowChar;
      let directionClass;
      if (Math.abs(change) < 0.0001) {
        arrowChar = '•';
        directionClass = 'flat';
      } else if (change > 0) {
        arrowChar = '▲';
        directionClass = 'up';
      } else {
        arrowChar = '▼';
        directionClass = 'down';
      }
      // Define prefixo baseado no formato
      let prefix = '';
      switch (ind.format) {
        case 'dollar':
          prefix = '$ ';
          break;
        case 'real':
          prefix = 'R$ ';
          break;
        case 'crypto':
          prefix = '₿ $ ';
          break;
        case 'index':
        default:
          prefix = '';
      }
      // Cria o span com valor e seta
      const valueSpan = document.createElement('span');
      valueSpan.className = `market-value ${directionClass}`;
      // Monta HTML com símbolo pequeno
      const formattedNumber = formatValue(ind.id, value);
      const symbolHTML = prefix ? `<span class="currency-symbol">${prefix}</span>` : '';
      valueSpan.innerHTML = `${arrowChar} ${symbolHTML}${formattedNumber}`;

      // Aplica destaque se valor ultrapassar limite crítico
      if (ind.threshold && value >= ind.threshold) {
        li.classList.add('market-item-alert');
      }

      // Monta o item
      li.appendChild(labelSpan);
      li.appendChild(valueSpan);

      // Evento de clique para abrir modal
      li.addEventListener('click', () => {
        showIndicatorModal(ind.id);
      });
      listEl.appendChild(li);
    });
  }

  /**
   * Exibe o modal com informações sobre o indicador selecionado.
   * @param {string} id - identificador do indicador
   */
  function showIndicatorModal(id) {
    const modal = document.getElementById('indicatorModal');
    const titleEl = document.getElementById('indicatorTitle');
    const descEl = document.getElementById('indicatorDescription');
    const impEl = document.getElementById('indicatorImportance');
    const data = marketIndicators.find(item => item.id === id);
    if (!modal || !data) return;
    titleEl.textContent = data.name;
    // Preenche seções fixas
    descEl.textContent = data.description;
    impEl.textContent = data.importance;
    // Determina impacto com base na variação atual
    const valueInfo = marketData[id];
    let impactText;
    if (valueInfo) {
      const diff = valueInfo.change;
      if (Math.abs(diff) < 0.0001) {
        impactText = data.impacts.flat;
      } else if (diff > 0) {
        impactText = data.impacts.up;
      } else {
        impactText = data.impacts.down;
      }
    } else {
      impactText = '';
    }
    const impactEl = document.getElementById('indicatorImpact');
    if (impactEl) impactEl.textContent = impactText;
    modal.classList.remove('hidden');
  }

  /**
   * Oculta o modal de indicadores.
   */
  function hideIndicatorModal() {
    const modal = document.getElementById('indicatorModal');
    if (modal) modal.classList.add('hidden');
  }

  // Evento de fechar modal pelo botão
  const closeIndicatorBtn = document.getElementById('closeIndicatorModal');
  if (closeIndicatorBtn) {
    closeIndicatorBtn.addEventListener('click', hideIndicatorModal);
  }
  // Fechar modal ao clicar fora do conteúdo
  const indicatorModalEl = document.getElementById('indicatorModal');
  if (indicatorModalEl) {
    indicatorModalEl.addEventListener('click', (e) => {
      if (e.target === indicatorModalEl) {
        hideIndicatorModal();
      }
    });
  }

  // Função inicial para configurar mercados e iniciar intervalos
  async function initMarkets() {
    await updateMarketData();
    renderMarkets();
    // Atualiza a cada 60 segundos; manter leve e resiliente
    setInterval(async () => {
      await updateMarketData();
      renderMarkets();
    }, 60000);
  }

  
  /* ===== Institutional modals (Sobre nós / Missão Visão Valores / Parceria / Contato) ===== */
  function openGenericModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    // focus first actionable element
    const focusEl = modal.querySelector('button, a, input, textarea');
    if (focusEl) focusEl.focus();
  }

  function closeGenericModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  // Open from footer links
  document.querySelectorAll('.footer-modal-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('data-modal');
      if (id) {
        // No mobile, fecha o drawer antes de abrir o modal
        if (window.innerWidth <= 900) {
          try { geCloseNav(); } catch (err) {}
        }
        openGenericModal(id);
      }
    });
  });

  // Close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-close-modal');
      if (id) closeGenericModal(id);
    });
  });

  // Close when clicking outside the modal content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('mousedown', (e) => {
      if (e.target === modal) {
        // No modal de cookies, exigimos uma escolha para fechar (LGPD)
        if (modal.id === 'cookieModal' && !geGetCookieConsent()) return;
        closeGenericModal(modal.id);
      }
    });
  });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not(.hidden)').forEach(m => {
        if (m.id === 'cookieModal' && !geGetCookieConsent()) return;
        closeGenericModal(m.id);
      });
    }
  });

  // Partnership form validation + feedback
  const partnershipForm = document.getElementById('partnershipForm');
  if (partnershipForm) {
    const feedback = document.getElementById('partnerFormFeedback');
    partnershipForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const feedback = document.getElementById('partnerFormFeedback');
      const submitBtn = partnershipForm.querySelector('button[type="submit"]');

      // Use browser validation first
      const emailEl = document.getElementById('partnerEmail');
      const nameEl = document.getElementById('partnerName');
      const surnameEl = document.getElementById('partnerSurname');
      const msgEl = document.getElementById('partnerMessage');

      // Trigger native messages if invalid
      if (!nameEl.checkValidity() || !surnameEl.checkValidity() || !emailEl.checkValidity() || !msgEl.checkValidity()) {
        if (feedback) {
          feedback.className = 'form-feedback error';
          feedback.textContent = 'Por favor, preencha todos os campos com um e-mail válido.';
        }
        (nameEl.checkValidity() ? (surnameEl.checkValidity() ? (emailEl.checkValidity() ? msgEl : emailEl) : surnameEl) : nameEl).reportValidity();
        return;
      }

      if (feedback) {
        feedback.className = 'form-feedback';
        feedback.textContent = 'Enviando...';
      }
      if (submitBtn) submitBtn.disabled = true;

      try {
        const payload = {
          nome: nameEl.value.trim(),
          sobrenome: surnameEl.value.trim(),
          email: emailEl.value.trim(),
          mensagem: msgEl.value.trim()
        };

        const res = await fetch('/api/partnership-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store'
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data && data.ok) {
          if (feedback) {
            feedback.className = 'form-feedback success';
            feedback.textContent = 'Mensagem enviada com sucesso. Entraremos em contato em breve.';
          }
          partnershipForm.reset();
        } else {
          throw new Error('SEND_FAILED');
        }
      } catch (err) {
        if (feedback) {
          feedback.className = 'form-feedback error';
          feedback.textContent = 'Erro ao enviar mensagem. Tente novamente mais tarde.';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Cookies: consentimento (LGPD) + ativação opcional de Analytics/Ads
  const GE_COOKIE_CONSENT_KEY = 'ge_cookie_consent_v1';

  
  // Consentimento temporário (válido apenas nesta sessão/página). Serve para permitir 'Rejeitar' sem persistir.
  let geTempCookieConsent = null;
function geLoadScriptOnce(src, attrs = {}) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    document.head.appendChild(s);
  }

  function geEnableOptionalCookies() {
    // Ativa recursos opcionais apenas quando houver consentimento para não essenciais.
    // Configure futuramente estas variáveis no window (sem quebrar o site hoje):
    // window.GE_ANALYTICS_MEASUREMENT_ID = 'G-XXXXXXX';
    // window.GE_ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';
    const gaId = window.GE_ANALYTICS_MEASUREMENT_ID;
    const adsClient = window.GE_ADSENSE_CLIENT;

    if (gaId && typeof gaId === 'string' && gaId.trim()) {
      geLoadScriptOnce(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`);
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', gaId, { anonymize_ip: true });
    }

    if (adsClient && typeof adsClient === 'string' && adsClient.trim()) {
      geLoadScriptOnce('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        'data-ad-client': adsClient,
        crossorigin: 'anonymous'
      });
    }
  }

  function geSetCookieConsent(choice) {
    try {
      if (choice === 'all') {
        localStorage.setItem(GE_COOKIE_CONSENT_KEY, 'all');
      } else {
        localStorage.removeItem(GE_COOKIE_CONSENT_KEY);
      }
    } catch (e) {}
    if (choice === 'all') geEnableOptionalCookies();
    closeGenericModal('cookieModal');
  }

  function geGetCookieConsent() {
    try {
      if (geTempCookieConsent) return geTempCookieConsent;
      return localStorage.getItem(GE_COOKIE_CONSENT_KEY);
    } catch (e) {
      return geTempCookieConsent || null;
    }
  }

  // Cookie modal UI
  const cookieModal = document.getElementById('cookieModal');
  if (cookieModal) {
    const existing = geGetCookieConsent();
    // O banner só deixa de aparecer definitivamente quando o usuário aceita todos.
    if (existing !== 'all') {
      openGenericModal('cookieModal');
    } else {
      geEnableOptionalCookies();
    }

    // Toggle detalhes
    const toggleBtn = cookieModal.querySelector('.cookie-toggle');
    const details = cookieModal.querySelector('#cookieDetails');
    if (toggleBtn && details) {
      toggleBtn.addEventListener('click', () => {
        const isOpen = !details.classList.contains('hidden');
        if (isOpen) {
          details.classList.add('hidden');
          details.setAttribute('aria-hidden', 'true');
          toggleBtn.setAttribute('aria-expanded', 'false');
          const txt = toggleBtn.querySelector('.cookie-toggle-text');
          const ic = toggleBtn.querySelector('.cookie-toggle-icon');
          if (txt) txt.textContent = 'Mostrar detalhes';
          if (ic) ic.textContent = '▾';
        } else {
          details.classList.remove('hidden');
          details.setAttribute('aria-hidden', 'false');
          toggleBtn.setAttribute('aria-expanded', 'true');
          const txt = toggleBtn.querySelector('.cookie-toggle-text');
          const ic = toggleBtn.querySelector('.cookie-toggle-icon');
          if (txt) txt.textContent = 'Ocultar detalhes';
          if (ic) ic.textContent = '▴';
        }
      });
    }

    // Escolhas
    cookieModal.querySelectorAll('[data-cookie-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.getAttribute('data-cookie-choice');
        if (choice === 'all') {
          geTempCookieConsent = 'all';
          geSetCookieConsent('all');
          geEnableOptionalCookies();
          closeGenericModal('cookieModal');
        } else if (choice === 'essential') {
          // Não persistimos rejeição: ao entrar novamente, o banner volta.
          geTempCookieConsent = 'essential';
          try { localStorage.removeItem(GE_COOKIE_CONSENT_KEY); } catch (e) {}
          closeGenericModal('cookieModal');
        }
      });
    });

    // Link Política de Privacidade dentro do modal
    cookieModal.querySelectorAll('[data-open-privacy]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        closeGenericModal('cookieModal');
        openGenericModal('privacyModal');
      });
    });
  }

// Inicialização
  initMarkets();

  /* -------------------------------------------------------------- */
  /* -------------------------------------------------------------- */
/* Cookies (mobile): usamos o MESMO modal do desktop               */
/* -------------------------------------------------------------- */
/* O banner simplificado #cookieConsent foi desativado no CSS para evitar duplicidade.
   Mantemos apenas o fluxo do modal #cookieModal (com links e detalhes), que já funciona
   em todos os tamanhos de tela. */

});