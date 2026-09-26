/**
 * Chronicle Presentation Website — Interactive Literary Sanctuary Logic
 * Starlight Celestial Canvas, Showcase Tour, Hotspots & Lightbox
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Celestial Starlight Background Canvas
  // --------------------------------------------------------------------------
  const canvas = document.getElementById('celestial-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    });

    const themeStarPalettes = {
      default: [
        'rgba(255, 255, 255, ',
        'rgba(245, 225, 175, ', // Starlight Gold
        'rgba(195, 185, 245, ', // Lavender
        'rgba(180, 220, 250, '  // Pale Cyan Starlight
      ],
      scifi: [
        'rgba(255, 255, 255, ',
        'rgba(0, 240, 255, ',   // Cyber Cyan
        'rgba(168, 85, 247, ',  // Neon Purple
        'rgba(56, 189, 248, '   // Bright Sky
      ],
      romance: [
        'rgba(255, 255, 255, ',
        'rgba(253, 164, 175, ', // Rose Gold
        'rgba(244, 63, 94, ',   // Velvet Ruby
        'rgba(232, 121, 249, '  // Soft Orchid
      ]
    };

    let currentStarColors = themeStarPalettes.default;

    window.updateCelestialTheme = function(themeName) {
      currentStarColors = themeStarPalettes[themeName] || themeStarPalettes.default;
      stars.forEach(s => {
        s.colorPrefix = currentStarColors[Math.floor(Math.random() * currentStarColors.length)];
      });
    };

    let stars = [];
    const numStars = Math.min(Math.floor((width * height) / 4500), 280);

    function initStars() {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.35 + 0.35,
          colorPrefix: currentStarColors[Math.floor(Math.random() * currentStarColors.length)],
          baseAlpha: Math.random() * 0.55 + 0.25,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    // Occasional gentle shooting star
    let shootingStar = null;
    function maybeSpawnShootingStar() {
      if (!shootingStar && Math.random() < 0.008) {
        shootingStar = {
          x: Math.random() * width * 0.7,
          y: Math.random() * (height * 0.4),
          length: Math.random() * 80 + 50,
          speed: Math.random() * 7 + 6,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
          life: 0,
          maxLife: 45
        };
      }
    }

    initStars();

    let animationFrameId;
    function renderCelestialSky() {
      ctx.clearRect(0, 0, width, height);

      // Draw Twinkling Stars
      const time = Date.now() * 0.001;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed * 60 + s.phase) * 0.28;
        const clampedAlpha = Math.max(0.1, Math.min(1, alpha));

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${s.colorPrefix}${clampedAlpha})`;
        ctx.fill();

        // Subtle glow around larger stars
        if (s.radius > 1.2) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${s.colorPrefix}${clampedAlpha * 0.15})`;
          ctx.fill();
        }
      }

      // Draw Shooting Star if active
      maybeSpawnShootingStar();
      if (shootingStar) {
        shootingStar.life++;
        const progress = shootingStar.life / shootingStar.maxLife;
        const tailX = shootingStar.x - Math.cos(shootingStar.angle) * shootingStar.length * (1 - progress * 0.4);
        const tailY = shootingStar.y - Math.sin(shootingStar.angle) * shootingStar.length * (1 - progress * 0.4);

        const grad = ctx.createLinearGradient(tailX, tailY, shootingStar.x, shootingStar.y);
        grad.addColorStop(0, 'rgba(230, 190, 117, 0)');
        grad.addColorStop(1, `rgba(255, 245, 215, ${1 - progress})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(shootingStar.x, shootingStar.y);
        ctx.stroke();

        shootingStar.x += Math.cos(shootingStar.angle) * shootingStar.speed;
        shootingStar.y += Math.sin(shootingStar.angle) * shootingStar.speed;

        if (shootingStar.life >= shootingStar.maxLife) {
          shootingStar = null;
        }
      }

      animationFrameId = requestAnimationFrame(renderCelestialSky);
    }

    renderCelestialSky();
  }

  // --------------------------------------------------------------------------
  // 2. Showcase Tour Tab Navigation
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 3. Tactile 3D Perspective Tilt on Screenshots
  // --------------------------------------------------------------------------
  const screenWraps = document.querySelectorAll('.screenshot-screen-wrap');
  screenWraps.forEach(wrap => {
    const glare = wrap.querySelector('.screenshot-glare');

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const percentX = (x / rect.width) * 100;
      const percentY = (y / rect.height) * 100;

      const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 3;
      const rotX = -((y - rect.height / 2) / (rect.height / 2)) * 3;

      wrap.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;

      if (glare) {
        glare.style.background = `radial-gradient(circle at ${percentX.toFixed(1)}% ${percentY.toFixed(1)}%, rgba(230, 190, 117, 0.18) 0%, transparent 60%)`;
      }
    });

    wrap.addEventListener('mouseleave', () => {
      wrap.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  });

  // --------------------------------------------------------------------------
  // 4. Feature Hotspot Pins
  // --------------------------------------------------------------------------
  const hotspots = document.querySelectorAll('.hotspot');
  hotspots.forEach(hotspot => {
    const pin = hotspot.querySelector('.hotspot-pin');
    if (!pin) return;

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = hotspot.classList.contains('active');
      hotspots.forEach(h => h.classList.remove('active'));
      if (!isActive) {
        hotspot.classList.add('active');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hotspot')) {
      hotspots.forEach(h => h.classList.remove('active'));
    }
  });

  // --------------------------------------------------------------------------
  // 5. Fullscreen Screenshot Lightbox Modal
  // --------------------------------------------------------------------------
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
      tag: 'Chapter Authoring',
      title: "Writer's Sanctuary — Clean Distraction-Free Composition & Annotations",
      src: 'assets/screenshot-editor.png',
      tryUrl: 'app/index.html?view=editor&welcome=false'
    },
    {
      tabId: 'tab-timeline',
      tag: 'Narrative Chronology',
      title: 'Timeline Studio — Visual Story Arcs & Collision-Free Plot Beats',
      src: 'assets/screenshot-timeline.png',
      tryUrl: 'app/index.html?view=timeline&welcome=false'
    },
    {
      tabId: 'tab-reader',
      tag: 'Sensory Immersion',
      title: 'Reading & Acoustic Studio — Paper Tones & On-Device Voice Audio',
      src: 'assets/screenshot-reader.png',
      tryUrl: 'app/index.html?view=reader&welcome=false'
    },
    {
      tabId: 'tab-codex',
      tag: 'Living Codex',
      title: 'World Codex — Living Characters, Sensory Places & Archetypes',
      src: 'assets/screenshot-codex.png',
      tryUrl: 'app/index.html'
    },
    {
      tabId: 'tab-publishing',
      tag: 'Fine Typesetting',
      title: 'Publishing Hub — Print-Ready PDF with Drop Caps, EPUB 3 & Shunn DOCX',
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

  const screenshotContainers = document.querySelectorAll('.interactive-screenshot-container');
  screenshotContainers.forEach(container => {
    container.addEventListener('click', (e) => {
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

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') renderLightbox(currentScreenIndex - 1);
    if (e.key === 'ArrowRight') renderLightbox(currentScreenIndex + 1);
  });

  // --------------------------------------------------------------------------
  // 6. FAQ Accordion Mechanics
  // --------------------------------------------------------------------------
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

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

  // --------------------------------------------------------------------------
  // 7. Navbar Scroll Blur & Starlight Border Effect
  // --------------------------------------------------------------------------
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.style.borderBottomColor = 'rgba(230, 190, 117, 0.28)';
        navbar.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(230, 190, 117, 0.05)';
      } else {
        navbar.style.borderBottomColor = 'var(--border-starlight)';
        navbar.style.boxShadow = 'none';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. Dynamic Copyright Year
  // --------------------------------------------------------------------------
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // --------------------------------------------------------------------------
  // 9. Floating Theme Selector Drawer Logic
  // --------------------------------------------------------------------------
  const themeDrawer = document.getElementById('theme-drawer');
  const themeDrawerTab = document.getElementById('theme-drawer-tab');
  const themeOptionButtons = document.querySelectorAll('.theme-option-btn');
  const themeStylesheet = document.getElementById('theme-stylesheet');

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);

    if (themeStylesheet) {
      themeStylesheet.href = `themes/theme-${themeName}.css`;
    }

    try {
      localStorage.setItem('chronicle_landing_theme', themeName);
    } catch (e) {
      // localStorage might be unavailable in private browsing
    }

    themeOptionButtons.forEach(btn => {
      const match = btn.getAttribute('data-theme-value') === themeName;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-checked', match ? 'true' : 'false');
    });

    if (typeof window.updateCelestialTheme === 'function') {
      window.updateCelestialTheme(themeName);
    }
  }

  themeOptionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chosenTheme = btn.getAttribute('data-theme-value');
      applyTheme(chosenTheme);
    });
  });

  if (themeDrawer && themeDrawerTab) {
    themeDrawerTab.addEventListener('click', (e) => {
      e.stopPropagation();
      themeDrawer.classList.toggle('open');
    });

    // Close when clicking outside drawer
    document.addEventListener('click', (e) => {
      if (!themeDrawer.contains(e.target)) {
        themeDrawer.classList.remove('open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && themeDrawer.classList.contains('open')) {
        themeDrawer.classList.remove('open');
      }
    });
  }

  // Restore theme from URL query param, saved theme, or default on initial load
  const initialTheme = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = (params.get('theme') || '').toLowerCase().trim();
      if (urlTheme === 'romance') return 'romance';
      if (urlTheme === 'scifi' || urlTheme === 'sci-fi') return 'scifi';
      if (urlTheme === 'classic' || urlTheme === 'default' || urlTheme === 'gold') return 'default';

      return localStorage.getItem('chronicle_landing_theme') || 'default';
    } catch (e) {
      return 'default';
    }
  })();
  applyTheme(initialTheme);

  // --------------------------------------------------------------------------
  // 10. Visitor OS Detection & Platform Card Highlighting
  // --------------------------------------------------------------------------
  (() => {
    const userAgent = navigator.userAgent || '';
    let visitorOS = 'web';
    if (/Windows/i.test(userAgent)) visitorOS = 'windows';
    else if (/Macintosh|Mac OS X/i.test(userAgent)) visitorOS = 'macos';
    else if (/Linux/i.test(userAgent) && !/Android/i.test(userAgent)) visitorOS = 'linux';

    const platformCards = document.querySelectorAll('.platform-pill-card');
    platformCards.forEach(card => {
      if (card.getAttribute('data-platform') === visitorOS) {
        card.classList.add('detected-os');
      }
    });
  })();
});

