/* ============================================================================
 * navigation.js — هدر، منوها و رفتارهای پیمایش صفحه
 * ----------------------------------------------------------------------------
 *   - منوی اصلی و زیرمنوها از روی NAV_MENU
 *   - منوی کشویی موبایل با بخش‌های بازشونده
 *   - چرخش پیام‌های نوار اعلان
 *   - سایه هدر هنگام اسکرول
 *   - دکمه بازگشت به بالا
 *   - پیمایش نرم برای لینک‌های داخل صفحه
 * ==========================================================================*/

/** منوی افقی هدر. */
function renderMainNav() {
  const list = find('#nav-list');
  if (!list) return;

  fill(list, NAV_MENU.map((entry) => {
    const item = el('li', 'nav__item');

    const link = el('a', 'nav__link' + (entry.highlight ? ' nav__link--highlight' : ''));
    link.href = '#catalog';
    link.append(document.createTextNode(entry.label));
    if (entry.children.length) link.append(icon('expand_more'));

    link.addEventListener('click', () => {
      /* آیتم‌هایی که با یک دسته محصول متناظرند، فهرست را فیلتر می‌کنند. */
      if (CATEGORIES.some((c) => c.id === entry.id)) {
        catalogState.category = entry.id;
        catalogState.concern = null;
        renderCatalog();
        syncFilterButtons();
      }
    });

    item.append(link);

    if (entry.children.length) {
      const panel = el('div', 'nav__panel');
      for (const child of entry.children) {
        const childLink = el('a', null, child);
        childLink.href = '#catalog';
        panel.append(childLink);
      }
      item.append(panel);
    }

    return item;
  }));
}

/** منوی موبایل: همان داده، به شکل آکاردئون. */
function renderMobileNav() {
  const body = find('#mobile-nav-body');
  if (!body) return;

  const groups = NAV_MENU.map((entry) => {
    const group = el('div', 'mobile-nav__group');

    const toggle = el('button', 'mobile-nav__toggle');
    toggle.type = 'button';
    toggle.append(document.createTextNode(entry.label));

    if (entry.children.length) {
      toggle.append(icon('expand_more'));
      toggle.setAttribute('aria-expanded', 'false');

      const panel = el('div', 'mobile-nav__panel');
      for (const child of entry.children) {
        const link = el('a', null, child);
        link.href = '#catalog';
        link.addEventListener('click', () => closeLayer());
        panel.append(link);
      }

      toggle.addEventListener('click', () => {
        const open = group.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });

      group.append(toggle, panel);
    } else {
      toggle.addEventListener('click', () => {
        if (CATEGORIES.some((c) => c.id === entry.id)) {
          catalogState.category = entry.id;
          renderCatalog();
          syncFilterButtons();
        }
        closeLayer();
        const target = find('#catalog');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
      group.append(toggle);
    }

    return group;
  });

  fill(body, groups);
}

/** چرخش پیام‌های نوار اعلان بالای صفحه. */
function startAnnouncements() {
  const track = find('#announce-track');
  if (!track) return;

  const items = ANNOUNCEMENTS.map((text, index) => {
    const node = el('p', 'announce__item' + (index === 0 ? ' is-active' : ''), text);
    return node;
  });
  fill(track, items);

  if (items.length < 2) return;

  let current = 0;
  setInterval(() => {
    items[current].classList.remove('is-active');
    current = (current + 1) % items.length;
    items[current].classList.add('is-active');
  }, 4200);

  const close = find('#announce-close');
  const bar = find('#announce');
  if (close && bar) {
    close.addEventListener('click', () => bar.remove());
  }
}

/** سایه هدر پس از اسکرول. */
function setupStickyHeader() {
  const header = find('#header');
  if (!header) return;

  function update() {
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/** دکمه بازگشت به بالای صفحه. */
function setupBackToTop() {
  const button = find('#to-top');
  if (!button) return;

  function update() {
    button.classList.toggle('is-visible', window.scrollY > 700);
  }

  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/**
 * پیمایش نرم برای لینک‌های داخل صفحه.
 * یک شنونده روی کل سند به‌جای یکی برای هر لینک.
 */
function setupSmoothScroll() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute('href');
    if (!id || id === '#') return;

    const target = find(id);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** اتصال دکمه‌های هدر به کشوها و منوها. */
function setupHeaderActions() {
  const cartButton = find('#cart-button');
  const cartDrawer = find('#cart-drawer');
  if (cartButton && cartDrawer) {
    cartButton.addEventListener('click', () => openLayer(cartDrawer, false));
  }

  const menuButton = find('#menu-toggle');
  const mobileNav = find('#mobile-nav');
  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => openLayer(mobileNav, false));
  }

  const wishButton = find('#wishlist-button');
  if (wishButton) {
    wishButton.addEventListener('click', () => {
      if (wishlist.length === 0) {
        toast('هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید.', 'info');
        return;
      }
      /* فهرست علاقه‌مندی‌ها را در همان شبکه محصولات نشان می‌دهیم. */
      const grid = find('#catalog-grid');
      const items = wishlist.map(productById).filter(Boolean);
      renderProductList(grid, items);

      const count = find('#catalog-count');
      if (count) count.textContent = fa(items.length) + ' محصول در علاقه‌مندی‌ها';

      const target = find('#catalog');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      toast('علاقه‌مندی‌های شما نمایش داده شد.', 'info');
    });
  }

  /* دکمه حساب کاربری را auth.js مدیریت می‌کند (setupAuth)، چون به وضعیت
     ورود از سمت سرور وابسته است. اینجا عمدا چیزی به آن وصل نمی‌شود. */
}
