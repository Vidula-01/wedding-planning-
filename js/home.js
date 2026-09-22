/* ==========================================================
   WEDORA - Home page behaviour
   - Hero background slideshow (5 images, crossfade)
   - "Learn More" popup dialog
   - FAQ accordion, mobile nav, scroll-spy
   - Live stats + newsletter, both backed by the database
   ========================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------ 1. Hero slideshow */
  (function heroSlideshow() {
    const slides = Array.from(document.querySelectorAll('.hero-slide'));
    const dots = Array.from(document.querySelectorAll('#slideDots button'));
    if (slides.length < 2) return;

    const INTERVAL = 3500;   // how long each photo stays on screen
    let index = 0;
    let timer = null;

    // Preload so the first change is not a flash of empty colour
    slides.forEach(function (slide) {
      const url = (slide.style.backgroundImage || '').slice(5, -2);
      if (url) { const img = new Image(); img.src = url; }
    });

    function show(next) {
      if (next === index) return;
      slides[index].classList.remove('is-active');
      dots[index].classList.remove('is-active');
      dots[index].setAttribute('aria-selected', 'false');

      index = (next + slides.length) % slides.length;

      slides[index].classList.add('is-active');
      dots[index].classList.add('is-active');
      dots[index].setAttribute('aria-selected', 'true');
    }

    function start() {
      if (reduceMotion) return;
      stop();
      timer = setInterval(function () { show(index + 1); }, INTERVAL);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    /* Any manual change restarts the clock, so the photo you picked
       gets a full turn before the slideshow moves on. */
    function goTo(next) { show(next); start(); }

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    const prev = document.getElementById('slidePrev');
    const next = document.getElementById('slideNext');
    if (prev) prev.addEventListener('click', function () { goTo(index - 1); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); });

    const hero = document.getElementById('hero');

    /* Drag or swipe across the hero to move between photos */
    let downX = null;
    hero.addEventListener('pointerdown', function (e) { downX = e.clientX; });
    hero.addEventListener('pointerup', function (e) {
      if (downX === null) return;
      const dx = e.clientX - downX;
      downX = null;
      if (Math.abs(dx) > 60) goTo(index + (dx < 0 ? 1 : -1));
    });
    hero.addEventListener('pointercancel', function () { downX = null; });

    /* Arrow keys work once a control has focus */
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
    });

    // Stop burning frames while the tab is in the background
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    start();
  })();

  /* ------------------------------------------------ 2. Learn More dialog */
  (function learnMoreModal() {
    const backdrop = document.getElementById('learnModal');
    const openBtn = document.getElementById('learnMoreBtn');
    const closeBtn = document.getElementById('modalClose');
    const dismissBtn = document.getElementById('modalDismiss');
    if (!backdrop || !openBtn) return;

    const panel = backdrop.querySelector('.modal');
    let lastFocused = null;

    function focusable() {
      return Array.from(panel.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      ));
    }

    function open() {
      lastFocused = document.activeElement;
      backdrop.hidden = false;
      document.body.classList.add('modal-open');
      requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
      const items = focusable();
      if (items.length) items[0].focus();
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      backdrop.classList.remove('is-open');
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeydown);
      window.setTimeout(function () { backdrop.hidden = true; }, reduceMotion ? 0 : 240);
      if (lastFocused) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;

      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    if (dismissBtn) dismissBtn.addEventListener('click', close);
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop) close();
    });
  })();

  /* ------------------------------------------------ 3. FAQ accordion */
  (function faqAccordion() {
    const list = document.getElementById('faqList');
    if (!list) return;

    list.addEventListener('click', function (e) {
      const btn = e.target.closest('.faq-q');
      if (!btn) return;

      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('is-open');

      list.querySelectorAll('.faq-item.is-open').forEach(function (other) {
        other.classList.remove('is-open');
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  })();

  /* ------------------------------------------------ 4. Header + mobile nav */
  (function headerBehaviour() {
    const header = document.getElementById('siteHeader');
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');

    window.addEventListener('scroll', function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    }, { passive: true });

    if (toggle) {
      toggle.addEventListener('click', function () {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });

      nav.addEventListener('click', function (e) {
        if (e.target.matches('a')) {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* Scroll-spy for the nav underline */
    const links = Array.from(document.querySelectorAll('[data-nav]'));
    const sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      const spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s); });
    }
  })();

  /* ------------------------------------------------ 5. Section reveal */
  (function revealOnScroll() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const targets = document.querySelectorAll(
      '.feature-card, .steps li, .about-copy, .about-figure, .faq-item, .section-head'
    );
    targets.forEach(function (el) { el.classList.add('reveal'); });

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = (i * 60) + 'ms';
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------ 6. Live data from the DB */
  (function liveData() {
    const statsBox = document.getElementById('liveStats');
    const note = document.getElementById('statsNote');
    const actions = document.getElementById('headerActions');
    if (!statsBox) return;

    fetch('php/home_data.php', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) throw new Error('bad payload');

        const el = statsBox.querySelector('[data-stat="couples"]');
        if (el) el.textContent = Number(data.stats.couples).toLocaleString('en-LK');

        if (note) {
          note.textContent = data.source === 'database'
            ? 'Live from the WEDORA database.'
            : 'Live count, read from the local backup file.';
        }

        /* Signed in? Swap the header buttons for the account ones. */
        if (data.user && actions) {
          actions.innerHTML =
            '<span class="login-link">Hi, ' + escapeHtml(data.user.first_name) + '</span>' +
            '<a class="btn-small" href="php/logout.php">Log out</a>';
        }
      })
      .catch(function () {
        const el = statsBox.querySelector('[data-stat="couples"]');
        if (el) el.textContent = '500+';
        if (note) note.textContent = 'Start the server to see the live count.';
      });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  })();

  /* ------------------------------------------------ 7. Newsletter -> database */
  (function subscribe() {
    const form = document.getElementById('subscribeForm');
    if (!form) return;

    const input = document.getElementById('subEmail');
    const btn = document.getElementById('subBtn');
    const msg = document.getElementById('subMsg');
    const emailRe = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    function say(text, isError) {
      msg.textContent = text;
      msg.classList.toggle('is-error', Boolean(isError));
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = input.value.trim();

      if (!emailRe.test(email)) {
        say('Enter a valid email address, like you@example.com.', true);
        input.focus();
        return;
      }

      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Sending…';
      say('');

      const body = new FormData();
      body.append('email', email);

      fetch('php/subscribe.php', { method: 'POST', body: body })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.d && res.d.success) {
            say(res.d.message || 'Thanks. Check your inbox soon.');
            form.reset();
          } else {
            say((res.d && res.d.message) || 'That did not go through. Try again.', true);
          }
        })
        .catch(function () {
          say('Could not reach the server. Make sure the site is running on XAMPP.', true);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = original;
        });
    });
  })();

  /* ------------------------------------------------ 8. Footer year */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

})();
