const root = document.documentElement;

// Thème : suit par défaut le mode clair/sombre de l'appareil (et ses changements en direct).
// Un choix manuel ne vaut que pour la session en cours.
const systemDark = matchMedia('(prefers-color-scheme: dark)');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const applyTheme = theme => {
  root.dataset.theme = theme;
  if (themeMeta) themeMeta.content = theme === 'dark' ? '#11161d' : '#dcd8cd';
};
let manual = null;
try { manual = sessionStorage.getItem('theme'); localStorage.removeItem('theme'); } catch (_) {}
applyTheme(manual || (systemDark.matches ? 'dark' : 'light'));
systemDark.addEventListener('change', e => { if (!manual) applyTheme(e.matches ? 'dark' : 'light'); });

document.getElementById('theme').addEventListener('click', () => {
  manual = root.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(manual);
  try { sessionStorage.setItem('theme', manual); } catch (_) {}
});

// Changement de langue : on reste à la même position. Les textes FR/EN n'ont pas la même
// longueur, donc on s'ancre sur le même élément (même structure DOM) avec son décalage en px.
(() => {
  const blocks = () => [...document.querySelectorAll('main section, main h1, main h2, main h3, main p, main li, main article, main .btn')];
  const link = document.querySelector('.lang-switch a');
  const KEY = 'langScroll';
  if (link) link.addEventListener('click', () => {
    const list = blocks();
    const i = list.findIndex(el => el.getBoundingClientRect().bottom > 1);
    if (i < 0) return;
    const offset = -list[i].getBoundingClientRect().top;
    try { sessionStorage.setItem(KEY, JSON.stringify({ i, offset, t: Date.now() })); } catch (_) {}
  });
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
  } catch (_) {}
  const list = blocks();
  if (!saved || Date.now() - saved.t > 10000 || !list[saved.i]) return;
  const restore = () => {
    scrollTo({ top: list[saved.i].getBoundingClientRect().top + scrollY + saved.offset, behavior: 'instant' });
  };
  history.scrollRestoration = 'manual';
  restore();
  addEventListener('load', restore);
})();

// Apparition au scroll
const items = document.querySelectorAll('section h2, .card, .project, .job, .edu article, .skills > div, .interests > div, .stats');
items.forEach(el => el.classList.add('reveal'));
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
items.forEach(el => io.observe(el));

// Sections : marque de début, lien actif dans la navigation, progression
const navLinks = [...document.querySelectorAll('.nav nav a')];
const sections = [...document.querySelectorAll('main > section')];
const sectionIO = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); sectionIO.unobserve(e.target); } });
}, { threshold: 0.05 });
sections.forEach(s => sectionIO.observe(s));

// Section courante : la dernière dont le haut a passé 40 % de la fenêtre (la dernière en bas de page)
let currentId = null;
const updateActive = () => {
  const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  let current = atBottom ? sections[sections.length - 1] : sections[0];
  if (!atBottom) sections.forEach(s => { if (s.getBoundingClientRect().top <= innerHeight * 0.4) current = s; });
  if (current.id === currentId) return;
  currentId = current.id;
  const link = navLinks.find(a => a.getAttribute('href') === '#' + current.id);
  // Sections sans lien (formation, centres d'intérêt) : on garde le lien précédent
  if (link || current.classList.contains('hero')) navLinks.forEach(a => a.classList.toggle('active', a === link));
};

const bar = document.createElement('div');
bar.className = 'progress';
bar.setAttribute('aria-hidden', 'true');
document.body.appendChild(bar);
const updateBar = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
};
addEventListener('scroll', () => { updateBar(); updateActive(); }, { passive: true });
addEventListener('resize', updateActive);
updateBar();
updateActive();

// Cartes de projets dépliables
document.querySelectorAll('.project .toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.project');
    const open = card.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? btn.dataset.less : btn.dataset.more;
  });
});

// Filtres de projets
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.project[data-tags]');
filters.forEach(btn => {
  btn.addEventListener('click', () => {
    const tag = btn.dataset.filter;
    filters.forEach(b => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
    cards.forEach(card => {
      const show = tag === 'all' || card.dataset.tags.split(' ').includes(tag);
      card.hidden = !show;
      if (show) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); }
    });
  });
});

// Frise du parcours
const tlItems = document.querySelectorAll('.tl-item');
tlItems.forEach(item => {
  const btn = item.querySelector('.tl-card');
  btn.addEventListener('click', () => {
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
});
const tlFilters = document.querySelectorAll('.tl-filter');
tlFilters.forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.tl;
    tlFilters.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', b === btn);
    });
    tlItems.forEach(item => {
      // l'objectif (stage visé) reste toujours affiché
      item.hidden = !(t === 'all' || item.dataset.type === t || item.dataset.type === 'objectif');
    });
  });
});
// Filtre par défaut : projets
const defaultTl = document.querySelector('.tl-filter[data-tl="projet"]');
if (defaultTl) defaultTl.click();

// Copie de l'adresse e-mail au clic
document.querySelectorAll('.copy-mail').forEach(btn => {
  let timer;
  btn.addEventListener('click', async () => {
    const email = btn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignoré */ }
      ta.remove();
    }
    clearTimeout(timer);
    btn.dataset.tip = btn.dataset.copied;
    btn.classList.remove('done');
    btn.classList.add('copied');
    // après le délai, la bulle s'efface et reste masquée tant que la souris est sur le bouton
    timer = setTimeout(() => { btn.classList.remove('copied'); btn.classList.add('done'); }, 500);
  });
  const reset = () => {
    if (!btn.classList.contains('done') && !btn.classList.contains('copied')) return;
    clearTimeout(timer);
    // on attend la fin du fondu avant de remettre l'invite
    timer = setTimeout(() => {
      btn.classList.remove('copied', 'done');
      btn.dataset.tip = btn.dataset.hint;
    }, 250);
  };
  btn.addEventListener('mouseleave', reset);
  btn.addEventListener('blur', reset);
});

// Fond : constellation de particules avec parallaxe (défilement + souris)
(() => {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clickable = 'a, button, summary, input, select, textarea, label, [role="button"], .tl-card';
  const LAYERS = [0.35, 0.65, 1]; // profondeur : 1 = premier plan
  let W = 0, H = 0, dpr = 1, pts = [], colors = { a: [47, 93, 138], b: [201, 112, 43] };
  const mouse = { x: 0, y: 0, nx: 0, ny: 0, active: false, hover: false };
  let smoothNx = 0, smoothNy = 0, lastScroll = 0, raf = 0;

  // Les variables @property <color> sont renvoyées en rgb(...) ; on accepte aussi l'hexadécimal
  const hex = v => {
    v = v.trim();
    if (v.startsWith('rgb')) return v.match(/[\d.]+/g).slice(0, 3).map(Number);
    v = v.replace('#', '');
    if (v.length === 3) v = v.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
  };
  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    colors = { a: hex(s.getPropertyValue('--accent')), b: hex(s.getPropertyValue('--accent-2')) };
  };

  const build = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, Math.max(28, (W * H) / 16000)));
    pts = Array.from({ length: count }, (_, i) => {
      const d = LAYERS[i % LAYERS.length];
      const ang = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * W, y: Math.random() * H, d,
        vx: Math.cos(ang) * 0.12 * d, vy: Math.sin(ang) * 0.12 * d,
        r: 1 + 1.6 * d, c: Math.random() < 0.72 ? 'a' : 'b'
      };
    });
  };

  const wrap = (v, max) => ((v % max) + max) % max;

  let themeUntil = 0;
  const frame = () => {
    if (performance.now() < themeUntil) readColors();
    const sy = window.scrollY;
    smoothNx += (mouse.nx - smoothNx) * 0.06;
    smoothNy += (mouse.ny - smoothNy) * 0.06;
    ctx.clearRect(0, 0, W, H);

    const pos = pts.map(p => {
      if (!reduce) {
        p.x = wrap(p.x + p.vx, W); p.y = wrap(p.y + p.vy, H);
        if (mouse.active) { // répulsion autour du curseur, attraction sur un élément cliquable
          const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.hypot(dx, dy);
          if (dist < 130 && dist > 1) {
            const f = (1 - dist / 130) * 1.6 * p.d * (mouse.hover ? -0.6 : 1);
            p.x += (dx / dist) * f; p.y += (dy / dist) * f;
          }
        }
      }
      return {
        p,
        x: wrap(p.x - smoothNx * 28 * p.d, W),
        y: wrap(p.y - sy * 0.22 * p.d - smoothNy * 28 * p.d, H)
      };
    });

    // liens entre points proches, plus marqués au premier plan
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i], b = pos[j];
        if (a.p.d !== b.p.d) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y), max = 120 * a.p.d + 30;
        if (dist < max) {
          const c = colors[a.p.c];
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(1 - dist / max) * 0.22 * a.p.d})`;
          ctx.lineWidth = 0.6 + 0.5 * a.p.d;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      // liens vers le curseur pour les points du premier plan
      if (mouse.active && pos[i].p.d > 0.6) {
        const dist = Math.hypot(pos[i].x - mouse.x, pos[i].y - mouse.y);
        if (dist < 150) {
          const c = colors.b;
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(1 - dist / 150) * 0.35})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }
    for (const q of pos) {
      const c = colors[q.p.c];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 + 0.4 * q.p.d})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.p.r, 0, Math.PI * 2); ctx.fill();
    }
    raf = 0;
    if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };

  readColors(); build(); start();
  window.addEventListener('resize', () => { build(); if (reduce) start(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  new MutationObserver(() => { themeUntil = performance.now() + 1000; readColors(); start(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (reduce) window.addEventListener('scroll', start, { passive: true });

  if (fine && !reduce) {
    document.addEventListener('mousemove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      mouse.nx = e.clientX / W - 0.5; mouse.ny = e.clientY / H - 0.5;
      mouse.hover = !!e.target.closest(clickable);
    });
    document.documentElement.addEventListener('mouseleave', () => { mouse.active = false; mouse.nx = mouse.ny = 0; });
  }
})();
