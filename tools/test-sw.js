// Regression checks for offline artwork and service worker cache handling.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function run() {
  const handlers = {};
  const entries = new Map();
  const makeCache = () => ({
    add: async (url) => entries.set(new URL(url, 'https://example.test/').href, new Response('saved')),
    put: async (req, response) => entries.set(req.url, response),
  });
  const cache = makeCache();
  let online = true;
  let failWrite = false;
  cache.put = async (req, response) => {
    if (failWrite) throw Error('quota');
    entries.set(req.url, response);
  };
  const caches = {
    open: async () => cache,
    match: async (req) => entries.get(req.url)?.clone(),
    keys: async () => ['unrelated-cache', 'qalam-v29'],
    delete: async (key) => { assert.equal(key, 'qalam-v29'); return true; },
  };
  const self = {
    registration: { scope: 'https://example.test/' },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {
    self, caches, URL, Response,
    fetch: async () => { if (!online) throw Error('offline'); return new Response('network'); },
  });
  async function request(path) {
    const promises = [];
    let response;
    const event = {
      request: new Request('https://example.test/' + path),
      waitUntil: (p) => promises.push(p),
      respondWith: (p) => { response = p; },
    };
    handlers.fetch(event);
    assert.ok(response, 'request intercepted');
    const result = await response;
    await Promise.all(promises);
    return result.text();
  }
  entries.set('https://example.test/assets/icons/star.png', new Response('saved image'));
  online = false;
  assert.equal(await request('assets/icons/star.png'), 'saved image');
  entries.delete('https://example.test/assets/icons/star.png');
  online = true;
  assert.equal(await request('assets/icons/star.png'), 'network');
  assert.equal(await (await caches.match(new Request('https://example.test/assets/icons/star.png'))).text(), 'network');
  failWrite = true;
  assert.equal(await request('assets/icons/heart.png'), 'network');
  online = false;
  assert.equal(await request('assets/icons/star.png'), 'network');
  console.log('Service worker image cache and offline checks passed');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
