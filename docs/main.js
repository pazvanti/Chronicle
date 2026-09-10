/**
 * Chronicle Presentation Website — Interactive Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Tabbed Showcase Feature Switcher
  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.showcase-content-panel');

  function switchTab(targetId) {
    tabButtons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === targetId);
    });

    panels.forEach(p => {
      p.classList.toggle('active', p.id === targetId);
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
    });
  });

  // 2. Interactive 3D Perspective Tilt & Dynamic Glare Tracking
  const screenWraps = document.querySelectorAll('.screenshot-screen-wrap');

  screenWraps.forEach(wrap => {
    const glare = wrap.querySelector('.screenshot-glare');

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;

      // Subtle physical tilt: max +/- 3.5 deg
      const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 3.5;
      const rotX = -((y - rect.height / 2) / (rect.height / 2)) * 3.5;

      wrap.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;

      if (glare) {
        glare.style.background = `radial-gradient(circle at ${percentX.toFixed(1)}% ${percentY.toFixed(1)}%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)`;
      }
    });

    wrap.addEventListener('mouseleave', () => {
      wrap.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  });

  // 3. Feature Hotspot Pin Interactions
  const hotspots = document.querySelectorAll('.hotspot');
  hotspots.forEach(hotspot => {
    const pin = hotspot.querySelector('.hotspot-pin');
    if (!pin) return;

    pin.addEventListener('click', (e) => {
      e.stopPropagation(); // Do not trigger screenshot lightbox zoom
      const isActive = hotspot.classList.contains('active');
      hotspots.forEach(h => h.classList.remove('active'));
      if (!isActive) {
        hotspot.classList.add('active');
      }
    });
  });

  // Click outside to close active hotspot
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hotspot')) {
      hotspots.forEach(h => h.classList.remove('active'));
    }
  });

  // 4. Interactive Fullscreen Screenshot Lightbox
  const lightbox = document.getElementById('screenshot-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxTag = document.getElementById('lightbox-tab-tag');
  const lightboxTryBtn = document.getElementById('lightbox-try-btn');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxBackdrop = document.querySelector('.lightbox-backdrop');

  const studioScreens = [
    {
      tabId: 'tab-writer',
      tag: 'Workspace Studio',
      title: 'Writer Studio — Clean Distraction-Free Composition',
      src: 'assets/screenshot-editor.png',
      tryUrl: 'app/index.html?view=editor&welcome=false'
    },
    {
      tabId: 'tab-timeline',
      tag: 'Chronology Studio',
      title: 'Timeline Studio — Visual Story Arcs & Chronologies',
      src: 'assets/screenshot-timeline.png',
      tryUrl: 'app/index.html?view=timeline&welcome=false'
    },
    {
      tabId: 'tab-reader',
      tag: 'Immersion Studio',
      title: 'Reading Mode — Paper Tones & Neural Audio Narrator',
      src: 'assets/screenshot-reader.png',
      tryUrl: 'app/index.html?view=reader&welcome=false'
    },
    {
      tabId: 'tab-codex',
      tag: 'Worldbuilding Studio',
      title: 'World Codex — Characters, Lore & Location Dossiers',
      src: 'assets/screenshot-codex.png',
      tryUrl: 'app/index.html'
    },
    {
      tabId: 'tab-publishing',
      tag: 'Typesetting & Export',
      title: 'Publishing Hub — Multi-Format Vector PDF, EPUB & Shunn DOCX',
      src: 'assets/screenshot-styles.png',
      tryUrl: 'app/index.html'
    }
  ];

  let currentScreenIndex = 0;

  function renderLightbox(index) {
    if (index < 0) index = studioScreens.length - 1;
    if (index >= studioScreens.length) index = 0;
    currentScreenIndex = index;

    const screen = studioScreens[currentScreenIndex];
    if (!screen || !lightboxImg) return;

    lightboxImg.src = screen.src;
    lightboxImg.alt = screen.title;
    if (lightboxTitle) lightboxTitle.textContent = screen.title;
    if (lightboxTag) lightboxTag.textContent = screen.tag;
    if (lightboxTryBtn) lightboxTryBtn.href = screen.tryUrl;
    if (lightboxCounter) lightboxCounter.textContent = `${currentScreenIndex + 1} / ${studioScreens.length}`;

    // Synchronize active tab in background
    switchTab(screen.tabId);
  }

  function openLightbox(index) {
    if (!lightbox) return;
    renderLightbox(index);
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Open on clicking screenshot container or zoom button
  const screenshotContainers = document.querySelectorAll('.interactive-screenshot-container');
  screenshotContainers.forEach(container => {
    container.addEventListener('click', (e) => {
      // Ignore clicks on hotspots
      if (e.target.closest('.hotspot')) return;
      const index = parseInt(container.getAttribute('data-tab-index') || '0', 10);
      openLightbox(index);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', () => {
      renderLightbox(currentScreenIndex - 1);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', () => {
      renderLightbox(currentScreenIndex + 1);
    });
  }

  // Keyboard navigation: Escape, ArrowLeft, ArrowRight
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') renderLightbox(currentScreenIndex - 1);
    if (e.key === 'ArrowRight') renderLightbox(currentScreenIndex + 1);
  });

  // 5. FAQ Accordion Interactions
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close other open items for clean single-expand accordion UX
      faqItems.forEach(i => {
        i.classList.remove('active');
        const q = i.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // 6. Navbar scroll styling
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.12)';
        navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
      } else {
        navbar.style.borderBottomColor = 'rgba(255, 255, 255, 0.07)';
        navbar.style.boxShadow = 'none';
      }
    });
  }

  // 7. Dynamic Copyright Year
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // 8. Auto-detect platform and highlight recommended download button
  const isMac = /Macintosh|Mac OS X|MacIntel/i.test(navigator.userAgent);
  const winBtn = document.getElementById('btn-download-windows');
  const macBtn = document.getElementById('btn-download-mac');
  const winBadge = document.getElementById('badge-windows');
  const macBadge = document.getElementById('badge-mac');

  if (isMac) {
    macBtn?.classList.add('recommended-platform');
    if (macBadge) macBadge.textContent = '★ Recommended for macOS';
  } else {
    winBtn?.classList.add('recommended-platform');
    if (winBadge) winBadge.textContent = '★ Recommended for Windows';
  }

  // Load manifest.json to display actual file sizes if available
  fetch('downloads/manifest.json')
    .then(r => r.ok ? r.json() : null)
    .then(manifest => {
      if (manifest && Array.isArray(manifest.distributables)) {
        const winItem = manifest.distributables.find(d => d.name === 'Chronicle.exe');
        const macItem = manifest.distributables.find(d => d.name === 'Chronicle.dmg');
        if (winItem) {
          const sub = document.querySelector('#btn-download-windows .platform-btn-sub');
          if (sub) sub.textContent = `Chronicle.exe • ${winItem.sizeMB} MB (Direct Run, No Install)`;
        }
        if (macItem) {
          const sub = document.querySelector('#btn-download-mac .platform-btn-sub');
          if (sub) sub.textContent = `Chronicle.dmg • ${macItem.sizeMB} MB (Standalone Image)`;
        }
      }
    })
    .catch(() => {});
});
