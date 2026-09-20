(() => {
  'use strict';

  const doc = document;
  const body = doc.body;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = matchMedia('(hover: hover) and (pointer: fine)');
  let reduced = motionQuery.matches;
  let finePointer = pointerQuery.matches;

  // This class keeps all motion progressive: content remains readable before JS runs.
  body.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-ready')));

  const pageNames = {
    home: 'Orivane', about: 'About', services: 'Services', industries: 'Industries',
    projects: 'Projects', careers: 'Careers', contact: 'Contact'
  };
  doc.querySelectorAll('.page-hero').forEach(hero => {
    hero.dataset.pageLabel = pageNames[body.dataset.page] || 'Orivane';
  });

  const header = doc.querySelector('.site-header');
  const progress = doc.querySelector('.scroll-progress');
  const heroImage = doc.querySelector('.hero-media img');
  let ticking = false;
  const updateScroll = () => {
    const y = window.scrollY || 0;
    header?.classList.toggle('is-scrolled', y > 18);
    if (progress) {
      const max = doc.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    }
    if (heroImage && !reduced) heroImage.style.setProperty('--hero-y', `${Math.min(y * .035, 28).toFixed(1)}px`);
    ticking = false;
  };
  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(updateScroll); ticking = true; }
  };
  updateScroll();
  addEventListener('scroll', onScroll, { passive: true });

  // Accessible mobile navigation, including a compact keyboard focus trap.
  const toggle = doc.querySelector('.menu-toggle');
  const menu = doc.querySelector('.mobile-menu');
  const closeMenu = () => {
    body.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-hidden', 'true');
  };
  const openMenu = () => {
    body.classList.add('menu-open');
    toggle?.setAttribute('aria-expanded', 'true');
    menu?.setAttribute('aria-hidden', 'false');
    menu?.querySelector('a')?.focus({ preventScroll: true });
  };
  toggle?.addEventListener('click', () => body.classList.contains('menu-open') ? closeMenu() : openMenu());
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && body.classList.contains('menu-open')) {
      closeMenu(); toggle?.focus(); return;
    }
    if (event.key !== 'Tab' || !body.classList.contains('menu-open') || !menu) return;
    const focusables = [...menu.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])')];
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  addEventListener('resize', () => { if (innerWidth >= 980) closeMenu(); });

  const current = body.dataset.page;
  doc.querySelectorAll(`[data-nav="${current}"]`).forEach(link => link.setAttribute('aria-current', 'page'));
  if (location.protocol === 'file:') {
    doc.querySelectorAll('a[href="/"]').forEach(link => link.setAttribute('href', './'));
  }

  // Reveals are intentionally section-aware: headers lead, then their content follows.
  const revealTargets = [...doc.querySelectorAll('.reveal')];
  const reveal = element => element.classList.add('in-view');
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -9% 0px', threshold: .13 });
    revealTargets.forEach(observer.observe.bind(observer));
  } else revealTargets.forEach(reveal);

  // Count-up values remain semantic text and only animate once in view.
  const counters = [...doc.querySelectorAll('[data-count]')];
  const animateCounter = element => {
    const target = Number(element.dataset.count || 0);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';
    if (reduced) { element.textContent = `${prefix}${target}${suffix}`; return; }
    const start = performance.now();
    const duration = 1350;
    const tick = now => {
      const progressValue = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progressValue, 4);
      element.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
      if (progressValue < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }), { threshold: .55 });
      counters.forEach(counterObserver.observe.bind(counterObserver));
    } else counters.forEach(animateCounter);
  }

  // Pointer interactions use CSS custom properties so hover styles never fight JS transforms.
  const clearTilt = element => {
    element.style.removeProperty('--tilt-x');
    element.style.removeProperty('--tilt-y');
    element.style.removeProperty('--lift-y');
    element.style.removeProperty('--glow-x');
    element.style.removeProperty('--glow-y');
  };
  const addDepth = element => {
    element.addEventListener('pointermove', event => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      element.style.setProperty('--tilt-x', `${((.5 - y) * 3.2).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${((x - .5) * 4.1).toFixed(2)}deg`);
      element.style.setProperty('--lift-y', '-6px');
      element.style.setProperty('--glow-x', `${(x * 100).toFixed(1)}%`);
      element.style.setProperty('--glow-y', `${(y * 100).toFixed(1)}%`);
      const spotlight = element.querySelector('.spotlight');
      if (spotlight) {
        spotlight.style.left = `${event.clientX - rect.left}px`;
        spotlight.style.top = `${event.clientY - rect.top}px`;
      }
    });
    element.addEventListener('pointerleave', () => clearTilt(element));
  };
  const addMagnet = element => {
    element.addEventListener('pointermove', event => {
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--mag-x', `${((event.clientX - rect.left - rect.width / 2) * .075).toFixed(2)}px`);
      element.style.setProperty('--mag-y', `${((event.clientY - rect.top - rect.height / 2) * .075).toFixed(2)}px`);
    });
    element.addEventListener('pointerleave', () => {
      element.style.removeProperty('--mag-x');
      element.style.removeProperty('--mag-y');
    });
  };
  const bindPointerEffects = () => {
    if (reduced || !finePointer) return;
    doc.querySelectorAll('.tilt, .project-card').forEach(addDepth);
    doc.querySelectorAll('.magnetic').forEach(addMagnet);
    heroImage?.addEventListener('pointermove', event => {
      const x = (event.clientX / innerWidth - .5) * -10;
      heroImage.style.setProperty('--hero-x', `${x.toFixed(1)}px`);
    });
    doc.querySelector('.hero')?.addEventListener('pointerleave', () => heroImage?.style.removeProperty('--hero-x'));
  };
  bindPointerEffects();

  const form = doc.querySelector('[data-enquiry-form]');
  if (form) {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const fields = [...form.querySelectorAll('input, select, textarea')];
    const patterns = { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, phone: /^[+\d][\d\s()-]{7,18}$/ };
    const setError = (field, message = '') => {
      const error = form.querySelector(`#${field.id}-error`);
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (error) error.textContent = message;
    };
    const validate = field => {
      const value = field.value.trim();
      if (field.required && !value) { setError(field, 'This field is required.'); return false; }
      if (field.type === 'email' && value && !patterns.email.test(value)) { setError(field, 'Enter a valid email address.'); return false; }
      if (field.type === 'tel' && value && !patterns.phone.test(value)) { setError(field, 'Enter a valid phone number.'); return false; }
      if (field.name === 'message' && value && value.length < 20) { setError(field, 'Please add a little more detail (at least 20 characters).'); return false; }
      setError(field); return true;
    };
    fields.forEach(field => {
      field.addEventListener('blur', () => validate(field));
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      status?.classList.remove('show', 'success');
      if (!fields.map(validate).every(Boolean)) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
      const original = submit.textContent;
      submit.disabled = true;
      submit.textContent = 'Preparing enquiry…';
      setTimeout(() => {
        form.reset(); fields.forEach(field => setError(field));
        submit.disabled = false; submit.textContent = original;
        if (status) {
          status.textContent = 'Enquiry captured for this portfolio demonstration. In a live deployment, this step would hand off to your CRM or email workflow.';
          status.classList.add('show', 'success'); status.focus();
        }
      }, reduced ? 0 : 650);
    });
  }

  // Preserve useful deep links when the static site is opened directly from the file system.
  try {
    const service = new URLSearchParams(location.search).get('service');
    const select = doc.querySelector('#service');
    if (service && select) [...select.options].forEach(option => {
      if (option.value.toLowerCase() === service.toLowerCase()) select.value = option.value;
    });
  } catch (_) { /* File URLs without a query remain fully usable. */ }

  doc.querySelectorAll('[data-year]').forEach(element => element.textContent = new Date().getFullYear());
  motionQuery.addEventListener?.('change', event => { reduced = event.matches; });
  pointerQuery.addEventListener?.('change', event => { finePointer = event.matches; });
})();
