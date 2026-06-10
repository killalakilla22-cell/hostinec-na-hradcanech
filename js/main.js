// ============================================================
// HOSTINEC NA HRADČANECH — main.js
// (offcanvas, modal a scrollspy řeší Bootstrap 5 bundle;
//  tady zbývá jen stín navbaru, reveal animace a drobnosti)
// ============================================================

(function () {
  'use strict';

  // ---------- Navbar shadow on scroll ----------
  const navbar = document.getElementById('siteNavbar');

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

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
