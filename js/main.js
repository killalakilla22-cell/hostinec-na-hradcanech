// ============================================================
// HOSTINEC NA HRADČANECH — main.js
// (offcanvas, modal a scrollspy řeší Bootstrap 5 bundle;
//  tady zbývá jen stín navbaru, reveal animace a drobnosti)
// ============================================================

(function () {
  'use strict';

  // ---------- Navbar shadow on scroll ----------
  const navbar = document.getElementById('siteNavbar');

  const onNavbarScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  };

  window.addEventListener('scroll', onNavbarScroll, { passive: true });
  onNavbarScroll();

  // ---------- Reveal on scroll (progressive enhancement) ----------
  // Strategy: content is visible by default (no .reveal-init class).
  // We add .reveal-init to opt elements into the hidden->animated state,
  // then add .visible when they enter the viewport. If anything fails
  // (observer misfires, JS error elsewhere) content stays visible — the
  // worst case is no animation, never blank sections.

  const revealEls = [...document.querySelectorAll('.reveal')];

  // Opt into the animation by switching elements to the "hidden" state.
  // The class is added BEFORE any reveal logic so elements that are
  // already in viewport at this point will animate in.
  revealEls.forEach((el) => el.classList.add('reveal-init'));

  const reveal = (el) => el.classList.add('visible');

  const checkVisible = () => {
    const vh = window.innerHeight;
    for (const el of revealEls) {
      if (el.classList.contains('visible')) continue;
      const r = el.getBoundingClientRect();
      if (r.top < vh - 40 && r.bottom > 0) reveal(el);
    }
  };

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => obs.observe(el));
  }

  window.addEventListener('scroll', checkVisible, { passive: true });
  requestAnimationFrame(checkVisible);

  // Safety net: even if the observer misfires, after a short delay force-reveal
  // anything within or above the viewport.
  const safetyNet = () => {
    const vh = window.innerHeight;
    revealEls.forEach((el) => {
      if (el.classList.contains('visible')) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 1.5) reveal(el);
    });
  };

  if (document.readyState === 'complete') {
    setTimeout(safetyNet, 800);
  } else {
    window.addEventListener('load', () => setTimeout(safetyNet, 800));
  }

  // Last-resort safety: after 2 seconds, reveal ANY remaining hidden elements
  // anywhere on the page. Animation gracefully falls back to "all visible".
  setTimeout(() => revealEls.forEach(reveal), 2000);

  // ---------- Image modal: set src from trigger (Bootstrap pattern) ----------
  const imageModal = document.getElementById('imageModal');
  const imageModalImg = document.getElementById('imageModalImg');

  imageModal.addEventListener('show.bs.modal', (event) => {
    const trigger = event.relatedTarget;
    if (!trigger) return;
    imageModalImg.src = trigger.getAttribute('data-img') || '';
    imageModalImg.alt = trigger.getAttribute('data-alt') || trigger.getAttribute('alt') || 'Náhled';
  });

  imageModal.addEventListener('hidden.bs.modal', () => {
    imageModalImg.src = '';
  });

  // ---------- Close offcanvas after clicking a nav link ----------
  const offcanvasEl = document.getElementById('siteNav');

  offcanvasEl.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (offcanvas) offcanvas.hide();
    });
  });

  // ---------- Footer year ----------
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
