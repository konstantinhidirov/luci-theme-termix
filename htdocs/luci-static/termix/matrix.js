/* Matrix code rain adapted from jbakker81's contribution to issue #1.
 * SPDX-License-Identifier: Apache-2.0
 */
(function () {
  'use strict';

  const root = document.documentElement;
  if (root.getAttribute('data-mx-fx') !== 'on') return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 820px)');
  const onLogin = !!document.querySelector('.termix-login-brand');
  const number = function (name, fallback, min, max) {
    const raw = root.getAttribute(name);
    const value = raw === null || raw === '' ? NaN : Number(raw);
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  };
  const size = number('data-mx-rain-size', 20, 12, 32);
  const interval = number('data-mx-rain-interval', 100, 40, 250);
  const opacity = number('data-mx-rain-opacity', 13, 0, 35);
  const area = root.getAttribute('data-mx-rain-area') || 'all';
  const rainEnabled = area !== 'none' && opacity > 0;
  // Half-width katakana and punctuation, rendered with installed fonts.
  const glyphs = Array.from('ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ:.=*+-<>');
  const canvas = document.createElement('canvas');
  canvas.id = 'termix-matrix-rain';
  canvas.setAttribute('aria-hidden', 'true');
  const context = rainEnabled ? canvas.getContext('2d', { alpha: true }) : null;
  if (context) document.body.appendChild(canvas);

  let timer = null;
  let frame = null;
  let active = false;
  let suspended = false;
  let width = 0;
  let height = 0;
  let scale = 1;
  let columns = [];
  let regions = [];
  let color = '#00ff41';
  let headColor = '#caffd6';

  function visibleRect(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(width, rect.right);
    const bottom = Math.min(height, rect.bottom);
    return right > left && bottom > top ? [left, top, right - left, bottom - top] : null;
  }

  function resize() {
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    // Preserve sharp glyphs on phones while bounding memory on large displays.
    scale = Math.min(devicePixelRatio || 1, 3, Math.sqrt(8000000 / Math.max(1, width * height)));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = size + 'px ' + getComputedStyle(root).getPropertyValue('--font-mono');
    context.textBaseline = 'top';
    columns = Array.from({ length: Math.ceil(width / size) }, function () {
      return Math.random() * height / size;
    });

    const sidebar = visibleRect(document.querySelector('body > header'));
    const topbar = visibleRect(document.querySelector('.termix-topbar'));
    if (onLogin || area === 'all') {
      regions = [[0, 0, width, height]];
    } else if (area === 'chrome') {
      regions = [sidebar, topbar].filter(Boolean);
    } else {
      const left = sidebar ? sidebar[0] + sidebar[2] : 0;
      const top = topbar ? topbar[1] + topbar[3] : 0;
      regions = [[left, top, Math.max(0, width - left), Math.max(0, height - top)]];
    }

    // Resolve CSS variables and color-mix before passing colors to Canvas.
    const probe = document.createElement('span');
    probe.hidden = true;
    probe.style.color = 'var(--primary-color-high)';
    document.body.appendChild(probe);
    color = getComputedStyle(probe).color;
    probe.style.color = 'color-mix(in srgb, var(--primary-color-high) 40%, white)';
    headColor = getComputedStyle(probe).color;
    probe.remove();
  }

  function stop() {
    clearTimeout(timer);
    if (frame !== null) cancelAnimationFrame(frame);
    timer = frame = null;
  }

  function schedule() {
    if (active && context && regions.length) {
      timer = setTimeout(function () {
        timer = null;
        frame = requestAnimationFrame(draw);
      }, interval);
    }
  }

  function draw() {
    frame = null;
    if (!active || !context) return;
    // Fade to transparency, keeping the original page colors intact.
    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = 'rgba(0,0,0,.10)';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
    context.save();
    context.beginPath();
    regions.forEach(function (rect) { context.rect(...rect); });
    context.clip();
    columns.forEach(function (drop, index) {
      context.fillStyle = Math.random() > .97 ? headColor : color;
      context.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], index * size, drop * size);
      columns[index] = drop * size > height && Math.random() > .975 ? -1 : drop + 1;
    });
    context.restore();
    schedule();
  }

  function sync() {
    stop();
    active = !suspended && !document.hidden && !reducedMotion.matches &&
      root.getAttribute('data-darkmode') === 'true' &&
      (onLogin || !document.body.classList.contains('modal-overlay-active'));
    root.setAttribute('data-termix-effects-active', String(active));
    if (active && context) {
      resize();
      schedule();
    }
  }

  const rootObserver = new MutationObserver(sync);
  rootObserver.observe(root, { attributes: true, attributeFilter: ['data-darkmode'] });
  const bodyObserver = new MutationObserver(function (records) {
    // Other LuCI body classes must not restart the animation unnecessarily.
    const relevant = ['modal-overlay-active', 'termix-menu-open'];
    if (records.some(function (record) {
      const previous = (record.oldValue || '').split(/\s+/);
      return relevant.some(function (name) {
        return previous.includes(name) !== document.body.classList.contains(name);
      });
    })) sync();
  });
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  mobile.addEventListener('change', sync);
  window.addEventListener('resize', sync);
  // Recalculate drawer geometry after its slide transition finishes.
  document.querySelector('body > header')?.addEventListener('transitionend', function (event) {
    if (event.propertyName === 'transform') sync();
  });
  window.addEventListener('pagehide', function () { suspended = true; sync(); });
  window.addEventListener('pageshow', function () { suspended = false; sync(); });
  sync();
})();
