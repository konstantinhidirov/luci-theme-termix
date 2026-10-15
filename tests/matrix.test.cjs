/* Run with: node --test tests/matrix.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '../htdocs/luci-static/termix/matrix.js'), 'utf8');

function fixture(options = {}) {
  const attrs = new Map(Object.entries({
    'data-mx-fx': 'on', 'data-darkmode': 'true',
    'data-mx-rain-area': 'all', 'data-mx-rain-size': '20',
    'data-mx-rain-interval': '100', 'data-mx-rain-opacity': '13',
    ...options.attrs
  }));
  const events = new Map();
  const windowEvents = new Map();
  const observers = [];
  const bodyClasses = new Set();
  const timers = new Map();
  const frames = new Map();
  let sequence = 0;
  const media = {
    '(prefers-reduced-motion: reduce)': { matches: !!options.reduced },
    '(max-width: 820px)': { matches: !!options.mobile }
  };
  for (const entry of Object.values(media)) entry.addEventListener = (name, cb) => { entry.change = cb; };
  const rectangles = [];
  let painted = 0;
  const context = {
    setTransform(...args) { this.transform = args; },
    fillRect() {}, save() {}, restore() {}, beginPath() { rectangles.length = 0; },
    rect(...args) { rectangles.push(args); }, clip() {}, fillText() { painted++; }
  };
  const viewport = { width: options.width || 1200, height: options.height || 800 };
  const canvas = {
    setAttribute() {}, getContext() { return options.noCanvas ? null : context; },
    getBoundingClientRect() { return { ...viewport }; }
  };
  const sidebar = { right: options.mobile ? 0 : 238, left: options.mobile ? -250 : 0, top: 0, bottom: viewport.height };
  const elements = {
    'body > header': { getBoundingClientRect: () => sidebar, addEventListener() {} },
    '.termix-topbar': { getBoundingClientRect: () => ({ left: options.mobile ? 0 : 238, top: 0, right: viewport.width, bottom: 54 }) }
  };
  if (options.login) elements['.termix-login-brand'] = {};
  const root = { getAttribute: name => attrs.get(name) ?? null, setAttribute: (name, value) => attrs.set(name, value) };
  const body = {
    classList: { contains: name => bodyClasses.has(name) },
    appendChild(node) { return node; }
  };
  const document = {
    documentElement: root, body, hidden: !!options.hidden,
    querySelector: selector => elements[selector] || null,
    createElement: tag => tag === 'canvas' ? canvas : { style: {}, remove() {} },
    addEventListener: (name, cb) => events.set(name, cb)
  };
  vm.runInNewContext(source, {
    document, devicePixelRatio: options.dpr || 1,
    matchMedia: query => media[query],
    getComputedStyle: () => ({ color: '#00ff41', getPropertyValue: () => 'monospace' }),
    MutationObserver: class {
      constructor(cb) { this.callback = cb; observers.push(this); }
      observe(target) { this.target = target; }
    },
    setTimeout: (cb, delay) => { timers.set(++sequence, { cb, delay }); return sequence; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: cb => { frames.set(++sequence, cb); return sequence; },
    cancelAnimationFrame: id => frames.delete(id),
    window: { addEventListener: (name, cb) => windowEvents.set(name, cb) }
  });
  return {
    attrs, document, root, body, media, observers, timers, frames, canvas, context,
    viewport, sidebar, rectangles, events, windowEvents,
    get painted() { return painted; },
    step() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id); timer.cb();
      const [frameId, cb] = frames.entries().next().value;
      frames.delete(frameId); cb();
    },
    changeBody(name, enabled) {
      const oldValue = [...bodyClasses].join(' ');
      if (enabled) bodyClasses.add(name); else bodyClasses.delete(name);
      observers.find(observer => observer.target === body)?.callback([{ oldValue }]);
    },
    changeMode(value) {
      attrs.set('data-darkmode', value);
      observers.find(observer => observer.target === root)?.callback([]);
    }
  };
}

test('disabled master never creates or schedules an effect, including Matrix palette', () => {
  const page = fixture({ attrs: { 'data-mx-fx': 'off', 'data-termix-accent': 'matrix' } });
  assert.equal(page.timers.size, 0);
  assert.equal(page.observers.length, 0);
});

test('draws once per configured interval, with a sharp DPR-scaled canvas', () => {
  const page = fixture({ dpr: 3, width: 412, height: 915 });
  assert.equal(page.canvas.width, 1236);
  assert.equal(page.canvas.height, 2745);
  assert.equal(page.timers.size, 1);
  assert.equal([...page.timers.values()][0].delay, 100);
  assert.equal(page.frames.size, 0);
  page.step();
  assert.ok(page.painted > 0);
  assert.equal(page.frames.size, 0);
  assert.equal(page.timers.size, 1);
});

test('backs off entirely when hidden, reduced motion is enabled, or a modal opens', () => {
  const page = fixture();
  page.changeBody('modal-overlay-active', true);
  assert.equal(page.timers.size, 0);
  assert.equal(page.attrs.get('data-termix-effects-active'), 'false');
  page.changeBody('modal-overlay-active', false);
  assert.equal(page.timers.size, 1);
  page.document.hidden = true;
  page.events.get('visibilitychange')();
  assert.equal(page.timers.size, 0);
  page.document.hidden = false;
  page.events.get('visibilitychange')();
  assert.equal(page.timers.size, 1);
  page.media['(prefers-reduced-motion: reduce)'].matches = true;
  page.media['(prefers-reduced-motion: reduce)'].change();
  assert.equal(page.timers.size, 0);
});

test('system mode can enter and leave dark mode without reloading or duplicate timers', () => {
  const page = fixture({ attrs: { 'data-darkmode': 'false' } });
  assert.equal(page.timers.size, 0);
  page.changeMode('true');
  assert.equal(page.timers.size, 1);
  page.changeMode('true');
  assert.equal(page.timers.size, 1);
  page.changeMode('false');
  assert.equal(page.timers.size, 0);
});

test('mobile chrome area includes the drawer when opened', () => {
  const page = fixture({ mobile: true, width: 412, height: 915, attrs: { 'data-mx-rain-area': 'chrome' } });
  page.step();
  assert.equal(page.rectangles.length, 1);
  assert.deepEqual(page.rectangles[0], [0, 0, 412, 54]);
  page.sidebar.left = 0; page.sidebar.right = 250;
  page.changeBody('termix-menu-open', true);
  page.step();
  assert.equal(page.rectangles.length, 2);
  assert.deepEqual(page.rectangles[0], [0, 0, 250, 915]);
});

test('content area excludes the sidebar and top bar', () => {
  const page = fixture({ attrs: { 'data-mx-rain-area': 'main' } });
  page.step();
  assert.deepEqual(page.rectangles[0], [238, 54, 962, 746]);
});

test('no rain, zero opacity, and unavailable Canvas never schedule frames', () => {
  for (const options of [
    { attrs: { 'data-mx-rain-area': 'none' } },
    { attrs: { 'data-mx-rain-opacity': '0' } }, { noCanvas: true }
  ]) {
    const page = fixture(options);
    assert.equal(page.timers.size, 0);
    assert.equal(page.attrs.get('data-termix-effects-active'), 'true');
  }
});

test('large retina canvas has a bounded backing store', () => {
  const page = fixture({ dpr: 3, width: 3840, height: 2160 });
  assert.ok(page.canvas.width * page.canvas.height < 8010000);
});

test('page lifecycle stops timers and resumes from browser back-forward cache', () => {
  const page = fixture();
  page.windowEvents.get('pagehide')();
  assert.equal(page.timers.size, 0);
  page.windowEvents.get('pageshow')();
  assert.equal(page.timers.size, 1);
});
