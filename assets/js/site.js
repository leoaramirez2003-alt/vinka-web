/* Alternar tema claro/oscuro. Sin dependencias ni rastreo; solo recuerda la preferencia en este navegador. */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('theme-btn');
  function sysDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function current() { return root.getAttribute('data-theme') || (sysDark() ? 'dark' : 'light'); }
  function label() { if (btn) { btn.querySelector('span').textContent = current() === 'dark' ? 'Tema claro' : 'Tema oscuro'; } }
  if (!btn) { return; }
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('vinka-tema', next); } catch (e) {}
    label();
  });
  label();
})();

/* Movimiento y navegación. Todo es mejora progresiva: sin JS el sitio se ve completo. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menú plegable en celular
  var nav = document.querySelector('.nav');
  var bar = document.querySelector('.bar');
  if (nav && bar) {
    var menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'menu-btn';
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Menú');
    menu.innerHTML = '<span class="bars" aria-hidden="true"></span><span>Menú</span>';
    nav.id = nav.id || 'menu-principal';
    menu.setAttribute('aria-controls', nav.id);
    bar.insertBefore(menu, nav);
    menu.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        menu.setAttribute('aria-expanded', 'false');
        menu.focus();
      }
    });
  }

  // Sombra del encabezado al desplazarse
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) { header.classList.toggle('scrolled', window.scrollY > 8); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Aparición única de los diagramas (una vez, 8 px, 320 ms)
  var diagrams = document.querySelectorAll('main .clock-pair, main .fix-demo');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
    diagrams.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }

  // Simulación del inicio: un solo reloj mueve la barra, el QR, el código y la lista.
  var art = document.getElementById('qr-art');
  var roll = document.getElementById('roll');
  var digits = document.getElementById('code-digits');
  var fillBar = document.getElementById('qr-bar');
  var pauseBtn = document.getElementById('sim-pause');
  if (!art || !roll || !digits || !fillBar) { return; }

  var NS = 'http://www.w3.org/2000/svg', N = 21;
  var ROWS = [
    ['Ana R.', 'QR', '08:00:41', 'ok', 'Presente', 'check-circle'],
    ['Bruno T.', 'Código', '08:01:07', 'ok', 'Presente', 'check-circle'],
    ['Carla S.', 'Enlace', '08:02:15', 'ok', 'Presente', 'check-circle'],
    ['Diego P.', 'QR', '08:07:52', 'warn', 'Retardo', 'schedule'],
    ['Elena V.', 'Código', '08:03:30', 'ok', 'Presente', 'check-circle'],
    ['Fabián L.', 'QR', '08:04:02', 'ok', 'Presente', 'check-circle']
  ];
  var PENDING = ['', '—', '—', 'pend', 'Por registrar', 'hourglass'];

  function rng(seed) { // mulberry32: determinista, solo para la ilustración
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function finder(x, y) {
    var out = [];
    for (var i = 0; i < 7; i++) for (var j = 0; j < 7; j++) {
      var edge = i === 0 || j === 0 || i === 6 || j === 6, core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      if (edge || core) { out.push([x + i, y + j]); }
    }
    return out;
  }
  function inFinder(i, j) { return (i < 8 && j < 8) || (i > N - 9 && j < 8) || (i < 8 && j > N - 9); }
  function drawQR(tick) {
    var r = rng(tick * 7919 + 13), cells = finder(0, 0).concat(finder(N - 7, 0), finder(0, N - 7));
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) { if (!inFinder(i, j) && r() < 0.48) { cells.push([i, j]); } }
    art.textContent = '';
    cells.forEach(function (c) {
      var el = document.createElementNS(NS, 'rect');
      el.setAttribute('x', c[0]); el.setAttribute('y', c[1]); el.setAttribute('width', 1); el.setAttribute('height', 1);
      art.appendChild(el);
    });
  }
  function drawCode(tick) {
    var r = rng(tick * 104729 + 7), out = '';
    for (var i = 0; i < 6; i++) { out += '<span>' + Math.floor(r() * 10) + '</span>'; }
    digits.innerHTML = out;
  }
  function chip(cls, icon, label) {
    return '<span class="chip ' + cls + '"><svg class="icon" aria-hidden="true" focusable="false"><use href="#' + icon + '"/></svg> ' + label + '</span>';
  }
  var body = roll.querySelector('tbody');
  function renderRow(i, isFilled, fresh) {
    var d = isFilled ? ROWS[i] : [ROWS[i][0]].concat(PENDING.slice(1));
    var tr = body.children[i];
    if (!tr) { tr = document.createElement('tr'); body.appendChild(tr); }
    tr.innerHTML = '<td>' + ROWS[i][0] + '</td><td>' + (isFilled ? d[1] : '—') + '</td><td>' + (isFilled ? d[2] : '—') + '</td><td>' + chip(d[3], d[5], d[4]) + '</td>';
    tr.className = fresh ? 'fresh' : '';
  }
  function resetRows() { for (var i = 0; i < ROWS.length; i++) { renderRow(i, false, false); } }
  function fillAll() { for (var i = 0; i < ROWS.length; i++) { renderRow(i, true, false); } }

  var qrTick = 0, codeTick = 0;
  drawQR(qrTick); drawCode(codeTick);

  if (reduce) { // Estado final estático; nada se mueve.
    fillAll();
    fillBar.style.transform = 'scaleX(1)';
    if (pauseBtn) { pauseBtn.hidden = true; }
    return;
  }

  resetRows();
  var vt = 0, last = performance.now(), filled = 0, fillClock = 0, hold = 0;
  var paused = false, onScreen = true;
  var STEP = 1200, HOLD = 4000;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }, { threshold: 0.1 })
      .observe(document.querySelector('.stage'));
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.textContent = paused ? 'Reanudar simulación' : 'Pausar simulación';
    });
  }
  function frame(now) {
    var dt = Math.min(now - last, 100); last = now;
    if (!paused && onScreen && !document.hidden) {
      vt += dt;
      fillBar.style.transform = 'scaleX(' + (1 - (vt % 15000) / 15000).toFixed(4) + ')';
      var qt = Math.floor(vt / 15000), ct = Math.floor(vt / 30000);
      if (qt !== qrTick) { qrTick = qt; drawQR(qrTick); }
      if (ct !== codeTick) { codeTick = ct; drawCode(codeTick); }
      if (filled < ROWS.length) {
        fillClock += dt;
        if (fillClock >= STEP) { fillClock = 0; renderRow(filled, true, true); filled++; }
      } else {
        hold += dt;
        if (hold >= HOLD) { hold = 0; filled = 0; fillClock = 0; resetRows(); }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
