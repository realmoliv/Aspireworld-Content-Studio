/**
 * Reproducible Typing Latency, Re-render & Request Count Harness (P0)
 *
 * - Spins up an isolated mock Supabase HTTP server on 127.0.0.1 (never touches .env or production)
 * - Starts Vite dev server with an empty envDir pointing at the local mock server
 * - Drives real headless Chromium via Chrome DevTools Protocol (Node 22 built-in WebSocket)
 * - Measures per-component React commit/render counts via __REACT_DEVTOOLS_GLOBAL_HOOK__,
 *   Supabase HTTP request counts during typing, keystroke-to-frame latency, and data durability.
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createViteServer } from 'vite';

const ROOT_DIR = process.cwd();
const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const MOCK_ITEM_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MOCK_LEAD_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function findBrowserExecutable() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chromium-based browser (Edge/Chrome) found for CDP measurement.');
}

function makeSeedData() {
  const items = Array.from({ length: 15 }, (_, idx) => {
    const id = idx === 0 ? MOCK_ITEM_ID : `aaaaaaaa-aaaa-aaaa-aaaa-${String(idx + 1).padStart(12, '0')}`;
    const day = String((idx % 25) + 1).padStart(2, '0');
    return {
      id,
      title: idx === 0 ? 'Hero Launch Reel' : `Campaign Asset #${idx + 1}`,
      content_type: idx % 3 === 0 ? 'Carousel' : 'Reel',
      pillar: ['Proof', 'Value', 'Offer'][idx % 3],
      goal: 'Build Trust',
      post_date: `2026-11-${day}`,
      post_time: '18:30:00',
      status: 'Briefed',
      priority: 'Normal',
      brief: `Initial brief copy for item ${idx + 1}`,
      copy_on_screen: idx % 3 === 0 ? 'Slide 1:\nHook\n\nSlide 2:\nProof' : 'Opening hook line',
      copy_caption: 'Initial caption body',
      copy_hashtags: '#aspireworld #studio',
      copy_cta: 'DM us START',
      copy_script: 'Voiceover intro text',
      verify_date: false,
      assignee_id: MOCK_USER_ID,
      assignee: { full_name: 'Akshay Kumar' },
      item_references: idx === 0
        ? [
            { id: 'ref-1', item_id: id, url: 'https://example.com/ref-1', label: 'Hook Reference', instruction: 'Match pacing', ref_type: 'Inspiration', sort_order: 0 },
            { id: 'ref-2', item_id: id, url: 'https://example.com/ref-2', label: 'Visual Style', instruction: 'High contrast', ref_type: 'Design / UI', sort_order: 1 },
          ]
        : [],
      item_shots: idx === 0
        ? [
            { id: 'shot-1', item_id: id, shot_order: '01', visual: 'Wide studio shot', text_on_screen: 'Hook text', sort_order: 0 },
            { id: 'shot-2', item_id: id, shot_order: '02', visual: 'Product close-up', text_on_screen: 'Proof stat', sort_order: 1 },
            { id: 'shot-3', item_id: id, shot_order: '03', visual: 'Founder direct to camera', text_on_screen: 'CTA overlay', sort_order: 2 },
          ]
        : [{ id: `shot-${idx}-1`, item_id: id, shot_order: '01', visual: '', text_on_screen: '', sort_order: 0 }],
      item_assets: [],
      item_checklist: [{ id: `chk-${idx}-1`, item_id: id, label: 'Hook in first 2 seconds', done: false, sort_order: 0 }],
      item_comments: [{ id: `cmt-${idx}-1`, item_id: id, body: 'Initial review comment', created_at: '2026-11-28T10:00:00.000Z', author: { full_name: 'Akshay Kumar' } }],
    };
  });

  const leads = Array.from({ length: 12 }, (_, idx) => {
    const id = idx === 0 ? MOCK_LEAD_ID : `bbbbbbbb-bbbb-bbbb-bbbb-${String(idx + 1).padStart(12, '0')}`;
    return {
      id,
      lead_date: '2026-11-20',
      source: 'Organic',
      name: idx === 0 ? 'Acme Brand Studio' : `Prospect Lead #${idx + 1}`,
      contact: `+91 98000000${String(idx).padStart(2, '0')}`,
      service: 'Monthly Content Retainer',
      budget: '50k/mo',
      status: 'New',
      follow_up: '2026-12-02',
      owner_name: 'Akshay Kumar',
      owner_id: MOCK_USER_ID,
      hold_reason: null,
      hold_notes: null,
      previous_status: null,
      resume_date: null,
      activity_log: [{ id: `act-${idx}`, timestamp: '2026-11-28T10:00:00.000Z', author: 'Akshay Kumar', action: 'Lead created', type: 'note' }],
    };
  });

  const profiles = [
    { id: MOCK_USER_ID, full_name: 'Akshay Kumar', role: 'admin', avatar_initials: 'AK', is_active: true },
  ];

  return { items, leads, profiles };
}

function startMockSupabaseServer() {
  const db = makeSeedData();
  const requests = [];
  let simulatedLatencyMs = 45;
  let forceNextWriteError = false;

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const bodyText = Buffer.concat(chunks).toString('utf8');
    let bodyJson = null;
    if (bodyText) {
      try { bodyJson = JSON.parse(bodyText); } catch { bodyJson = bodyText; }
    }

    const urlObj = new URL(req.url, 'http://127.0.0.1');
    const rec = {
      ts: performance.now(),
      method: req.method,
      path: urlObj.pathname,
      search: urlObj.search,
      body: bodyJson,
    };
    requests.push(rec);

    if (simulatedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, simulatedLatencyMs));
    }

    if (forceNextWriteError && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Simulated write failure', code: '50000' }));
      return;
    }

    const sendJson = (code, data) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    if (urlObj.pathname === '/auth/v1/user') {
      return sendJson(200, { id: MOCK_USER_ID, email: 'owner@test.local', role: 'authenticated' });
    }

    if (urlObj.pathname === '/rest/v1/profiles') {
      const accept = req.headers.accept || '';
      if (accept.includes('vnd.pgrst.object+json') || urlObj.searchParams.get('id')) {
        return sendJson(200, db.profiles[0]);
      }
      return sendJson(200, db.profiles);
    }

    if (urlObj.pathname === '/rest/v1/items') {
      if (req.method === 'GET') return sendJson(200, db.items);
      if (req.method === 'PATCH') {
        const idMatch = (urlObj.searchParams.get('id') || '').replace(/^eq\./, '');
        const item = db.items.find((i) => i.id === idMatch);
        if (item && bodyJson && typeof bodyJson === 'object') Object.assign(item, bodyJson);
        return sendJson(200, item ? [item] : []);
      }
      if (req.method === 'POST') return sendJson(201, bodyJson);
    }

    if (urlObj.pathname === '/rest/v1/leads') {
      if (req.method === 'GET') return sendJson(200, db.leads);
      if (req.method === 'PATCH') {
        const idMatch = (urlObj.searchParams.get('id') || '').replace(/^eq\./, '');
        const lead = db.leads.find((l) => l.id === idMatch);
        if (lead && bodyJson && typeof bodyJson === 'object') Object.assign(lead, bodyJson);
        return sendJson(200, lead ? [lead] : []);
      }
      if (req.method === 'POST') return sendJson(201, { id: `bbbbbbbb-bbbb-bbbb-bbbb-999999999999` });
    }

    if (urlObj.pathname === '/rest/v1/item_shots') {
      if (req.method === 'DELETE') return sendJson(200, []);
      if (req.method === 'PATCH') return sendJson(200, [bodyJson]);
      if (req.method === 'POST') return sendJson(201, { id: `shot-new-${Date.now()}` });
    }

    if (urlObj.pathname === '/rest/v1/item_references') {
      if (req.method === 'DELETE') return sendJson(200, []);
      if (req.method === 'PATCH') return sendJson(200, [bodyJson]);
      if (req.method === 'POST') return sendJson(201, { id: `ref-new-${Date.now()}` });
    }

    if (urlObj.pathname === '/rest/v1/item_comments') {
      if (req.method === 'POST') {
        const item = db.items.find((i) => i.id === bodyJson?.item_id);
        if (item) {
          item.item_comments.push({
            id: `cmt-${Date.now()}`,
            item_id: bodyJson.item_id,
            body: bodyJson.body,
            created_at: new Date().toISOString(),
            author: { full_name: 'Akshay Kumar' },
          });
        }
        return sendJson(201, [bodyJson]);
      }
    }

    return sendJson(200, []);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        db,
        requests,
        clearRequests: () => { requests.length = 0; },
        setLatency: (ms) => { simulatedLatencyMs = ms; },
        setForceError: (flag) => { forceNextWriteError = flag; },
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Browser eval failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function waitFor(fn, timeoutMs = 15000, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const val = await fn();
    if (val) return val;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout after ${timeoutMs}ms waiting for condition`);
}

const HOOK_SCRIPT = `
(() => {
  window.__PERF_STATS__ = {
    commits: 0,
    rendersByComponent: {},
    renderDurationsByComponent: {},
    reset() {
      this.commits = 0;
      this.rendersByComponent = {};
      this.renderDurationsByComponent = {};
    }
  };

  function getComponentName(type) {
    if (!type) return null;
    if (typeof type === 'function') return type.displayName || type.name || null;
    if (typeof type === 'object') {
      if (type.displayName) return type.displayName;
      if (type.type) return getComponentName(type.type);
      if (type.render) return getComponentName(type.render);
    }
    return null;
  }

  const lastFiberStartTime = new WeakMap();

  function recordRenderedComponents(fiber) {
    if (!fiber) return;
    const name = getComponentName(fiber.type);
    const flags = fiber.flags || 0;
    const startTime = fiber.actualStartTime;
    const prevStartTime = lastFiberStartTime.get(fiber);
    const ranThisCommit =
      fiber.alternate === null ||
      (typeof startTime === 'number' && startTime > 0 && startTime !== prevStartTime && (flags & 1) !== 0);
    if (typeof startTime === 'number' && startTime > 0) {
      lastFiberStartTime.set(fiber, startTime);
    }
    if (name && ranThisCommit && (fiber.tag === 0 || fiber.tag === 1 || fiber.tag === 11 || fiber.tag === 14 || fiber.tag === 15)) {
      const stats = window.__PERF_STATS__;
      stats.rendersByComponent[name] = (stats.rendersByComponent[name] || 0) + 1;
      stats.renderDurationsByComponent[name] = (stats.renderDurationsByComponent[name] || 0) + (fiber.selfBaseDuration || 0);
    }
    if (fiber.child) recordRenderedComponents(fiber.child);
    if (fiber.sibling) recordRenderedComponents(fiber.sibling);
  }

  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject(renderer) {
      const id = this.renderers.size + 1;
      this.renderers.set(id, renderer);
      return id;
    },
    onCommitFiberRoot(_id, root) {
      window.__PERF_STATS__.commits += 1;
      if (root && root.current) {
        recordRenderedComponents(root.current);
      }
    },
    onCommitFiberUnmount() {}
  };
})();
`;

async function main() {
  const mode = process.argv[2] || 'measure';
  const emptyEnvDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aspire-perf-env-'));
  const browserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aspire-perf-cdp-'));
  const mock = await startMockSupabaseServer();

  let viteServer = null;
  let chromeProc = null;
  let cdp = null;

  try {
    // Isolate env completely from workspace .env by using emptyEnvDir + explicit process.env
    process.env.VITE_SUPABASE_URL = mock.url;
    process.env.VITE_SUPABASE_ANON_KEY = 'local-mock-anon-key';

    viteServer = await createViteServer({
      root: ROOT_DIR,
      envDir: emptyEnvDir,
      server: { host: '127.0.0.1', port: 0, strictPort: false },
      logLevel: 'silent',
    });
    await viteServer.listen();
    const port = viteServer.httpServer.address().port;
    const appUrl = `http://127.0.0.1:${port}`;

    const browserExe = findBrowserExecutable();
    chromeProc = spawn(browserExe, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${browserDataDir}`,
      '--remote-debugging-port=0',
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const wsUrl = await new Promise((resolve, reject) => {
      let errBuf = '';
      const timer = setTimeout(() => reject(new Error('CDP startup timeout: ' + errBuf)), 15000);
      chromeProc.stderr.on('data', (d) => {
        errBuf += d.toString();
        const m = errBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (m) {
          clearTimeout(timer);
          resolve(m[1]);
        }
      });
    });

    // Wait for page target
    const cdpHostPort = new URL(wsUrl).host;
    const targetsRes = await fetch(`http://${cdpHostPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false });

    const futureExp = Math.floor(Date.now() / 1000) + 36000;
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const mockJwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: MOCK_USER_ID, role: 'authenticated', exp: futureExp })}.mocksig`;
    const sessionInitScript = `
      ${HOOK_SCRIPT}
      try {
        localStorage.setItem('sb-127-auth-token', JSON.stringify({
          access_token: '${mockJwt}',
          token_type: 'bearer',
          expires_in: 36000,
          expires_at: ${futureExp},
          refresh_token: 'mock-refresh-token',
          user: { id: '${MOCK_USER_ID}', email: 'owner@test.local', aud: 'authenticated', role: 'authenticated' }
        }));
      } catch {}
    `;
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: sessionInitScript });
    await cdp.send('Page.navigate', { url: `${appUrl}/calendar` });

    // Wait until calendar item renders
    await waitFor(async () => {
      return cdp.eval(`Boolean(document.querySelector('.calendar-item'))`);
    });
    await new Promise((r) => setTimeout(r, 200));

    async function typeIntoElement(selector, text) {
      await cdp.eval(`
        (() => {
          const el = document.querySelector(${JSON.stringify(selector)});
          if (!el) throw new Error('Missing element: ' + ${JSON.stringify(selector)});
          el.focus();
          el.setSelectionRange && el.setSelectionRange(el.value.length, el.value.length);
        })()
      `);
      mock.clearRequests();
      await cdp.eval(`window.__PERF_STATS__.reset()`);

      const keystrokeLatencies = [];
      for (const ch of text) {
        const t0 = performance.now();
        await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
        // Wait for browser animation frame commit after keystroke
        await cdp.eval(`new Promise(r => requestAnimationFrame(() => r(true)))`);
        keystrokeLatencies.push(performance.now() - t0);
      }

      const valueAfterTyping = await cdp.eval(`document.querySelector(${JSON.stringify(selector)})?.value ?? ''`);
      const perf = await cdp.eval(`({
        commits: window.__PERF_STATS__.commits,
        renders: window.__PERF_STATS__.rendersByComponent
      })`);
      const reqsDuringTyping = mock.requests.filter((r) => r.method !== 'OPTIONS');
      const writesDuringTyping = reqsDuringTyping.filter((r) => r.method !== 'GET');
      const readsDuringTyping = reqsDuringTyping.filter((r) => r.method === 'GET');

      // Wait 750ms to capture post-typing debounced requests if any
      await new Promise((r) => setTimeout(r, 750));
      const reqsAfterDebounce = mock.requests.filter((r) => r.method !== 'OPTIONS');
      const writesAfterDebounce = reqsAfterDebounce.filter((r) => r.method !== 'GET');
      const readsAfterDebounce = reqsAfterDebounce.filter((r) => r.method === 'GET');

      const sorted = [...keystrokeLatencies].sort((a, b) => a - b);
      const meanMs = +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2);
      const p95Ms = +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(2);

      return {
        keystrokes: text.length,
        meanKeystrokeFrameMs: meanMs,
        p95KeystrokeFrameMs: p95Ms,
        writeRequestsDuringTyping: writesDuringTyping.length,
        readRequestsDuringTyping: readsDuringTyping.length,
        writeRequestsAfterDebounce: writesAfterDebounce.length,
        readRequestsAfterDebounce: readsAfterDebounce.length,
        totalHttpRequestsAfterDebounce: reqsAfterDebounce.length,
        writePathsAfterDebounce: writesAfterDebounce.map((r) => `${r.method} ${r.path}`),
        totalCommits: perf.commits,
        renders: {
          ContentStudioApp: perf.renders.ContentStudioApp || 0,
          AppLayout: perf.renders.AppLayout || 0,
          CalendarView: perf.renders.CalendarView || 0,
          DetailDrawer: perf.renders.DetailDrawer || 0,
          LeadsView: perf.renders.LeadsView || 0,
          LeadQuickEditDesktop: perf.renders.LeadQuickEditDesktop || 0,
          ReferenceView: perf.renders.ReferenceView || 0,
        },
        valueTail: valueAfterTyping.slice(-30),
        valueEndsWithExpected: valueAfterTyping.endsWith(text),
      };
    }

    const results = {};

    // Open Hero Launch Reel DetailDrawer (on /calendar, note idx 0 is Carousel!)
    await cdp.eval(`document.querySelector('.calendar-item').click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer'))`));

    // 1. DetailDrawer -> Title
    results.detailTitle = await typeIntoElement('aside.drawer .form-grid input.input', ' 2026 Q4 Launch Cut');

    // 2. DetailDrawer -> Brief
    results.detailBrief = await typeIntoElement('aside.drawer .form-grid textarea.textarea', ' Tighten hook framing.');

    // Switch to COPY tab
    await cdp.eval(`Array.from(document.querySelectorAll('aside.drawer nav.tabs button')).find(b => b.textContent.includes('COPY')).click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer .copy-fields'))`));

    // 3. DetailDrawer -> Copy Caption (2nd field area textarea)
    results.detailCaption = await typeIntoElement('aside.drawer .copy-fields label.field textarea.textarea', ' Link in bio for full guide.');

    // Switch to SHOTS tab (item 0 has 3 shots)
    await cdp.eval(`Array.from(document.querySelectorAll('aside.drawer nav.tabs button')).find(b => b.textContent.includes('SHOTS')).click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer .shot-row textarea'))`));

    // 4. DetailDrawer -> Shot 1 Visual
    results.detailShotVisual = await typeIntoElement('aside.drawer .shot-row textarea.textarea', ' with warm rim light.');

    // Switch back to BRIEF tab for Reference input
    await cdp.eval(`Array.from(document.querySelectorAll('aside.drawer nav.tabs button')).find(b => b.textContent.includes('BRIEF')).click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer .reference-card-editor input'))`));

    // 5. DetailDrawer -> Reference Label (item 0 has 2 references)
    results.detailRefLabel = await typeIntoElement('aside.drawer .reference-card-editor input.input', ' - Ref Updated');

    // Switch to REVIEW tab for Comment input
    await cdp.eval(`Array.from(document.querySelectorAll('aside.drawer nav.tabs button')).find(b => b.textContent.includes('REVIEW')).click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer .comments textarea.textarea'))`));

    // 6. DetailDrawer -> Comment input
    results.detailComment = await typeIntoElement('aside.drawer .comments textarea.textarea', 'Looks sharp! Ship it.');

    // Close drawer
    await cdp.eval(`document.querySelector('aside.drawer button.close').click()`);
    await new Promise((r) => setTimeout(r, 100));

    // Navigate to /leads and expand first lead row
    await cdp.eval(`Array.from(document.querySelectorAll('aside.sidebar nav button')).find(b => b.textContent.toLowerCase().includes('lead')).click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('.leads-table-refactored tbody tr'))`));
    await cdp.eval(`document.querySelector('.leads-table-refactored .action-btn-expand').click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('.expanded-details-container input.input'))`));

    // 7. LeadsView -> Expanded Lead Name
    results.leadsRowName = await typeIntoElement('.expanded-details-container input.input', ' Enterprise');

    // Navigate to /references
    await cdp.eval(`Array.from(document.querySelectorAll('aside.sidebar nav button')).find(b => b.textContent.toLowerCase().includes('reference')).click()`);
    await waitFor(() => cdp.eval(`Boolean(document.querySelector('.library-tools input.input'))`));

    // 8. ReferenceView -> Search
    results.referenceSearch = await typeIntoElement('.library-tools input.input', 'kinetic type pacing');

    // Behavioral checks when mode === 'verify-fix'
    const behavioral = {};
    if (mode === 'verify-fix') {
      // A. Quick close flush + navigation flush + failed save keeps text and shows error
      await cdp.eval(`Array.from(document.querySelectorAll('aside.sidebar nav button')).find(b => b.textContent.toLowerCase().includes('month')).click()`);
      await waitFor(() => cdp.eval(`Boolean(document.querySelector('.calendar-item'))`));
      await cdp.eval(`document.querySelector('.calendar-item').click()`);
      await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer'))`));

      // Test quick close flush: type into title, close immediately (< 100ms, before 600ms debounce)
      mock.clearRequests();
      await cdp.eval(`
        (() => {
          const el = document.querySelector('aside.drawer .form-grid input.input');
          el.focus();
          el.setSelectionRange && el.setSelectionRange(el.value.length, el.value.length);
        })()
      `);
      for (const ch of ' QUICKCLOSE') {
        await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
      }
      const reqsBeforeClose = mock.requests.filter((r) => r.method === 'PATCH').length;
      await cdp.eval(`document.querySelector('aside.drawer button.close').click()`);
      await new Promise((r) => setTimeout(r, 250));
      const reqsAfterClose = mock.requests.filter((r) => r.method === 'PATCH').length;
      const savedTitleInMockDb = mock.db.items[0].title;
      behavioral.quickCloseFlush = {
        reqsBeforeClose,
        reqsAfterClose,
        savedTitleEndsWithQuickClose: savedTitleInMockDb.endsWith('QUICKCLOSE'),
      };

      // B. Failed save retains local text & surfaces error indicator
      await cdp.eval(`document.querySelector('.calendar-item').click()`);
      await waitFor(() => cdp.eval(`Boolean(document.querySelector('aside.drawer'))`));
      mock.setForceError(true);
      mock.clearRequests();
      await cdp.eval(`
        (() => {
          const el = document.querySelector('aside.drawer .form-grid textarea.textarea');
          el.focus();
          el.setSelectionRange && el.setSelectionRange(el.value.length, el.value.length);
        })()
      `);
      for (const ch of ' FAILTEST') {
        await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
      }
      await new Promise((r) => setTimeout(r, 850));
      const errorStatusVisible = await cdp.eval(`document.querySelector('aside.drawer')?.textContent?.includes('Save failed') || document.querySelector('aside.drawer')?.textContent?.includes('Retry') || false`);
      const textPreservedOnError = await cdp.eval(`document.querySelector('aside.drawer .form-grid textarea.textarea')?.value?.endsWith('FAILTEST') || false`);
      mock.setForceError(false);
      // Recover by clicking Retry or blurring after network recovers
      await cdp.eval(`
        (() => {
          const btn = Array.from(document.querySelectorAll('aside.drawer button')).find(b => b.textContent.includes('Retry'));
          if (btn) btn.click();
        })()
      `);
      await new Promise((r) => setTimeout(r, 250));
      behavioral.failedSaveDurability = {
        errorStatusVisible,
        textPreservedOnError,
        recoveredBriefSaved: mock.db.items[0].brief.endsWith('FAILTEST'),
      };

      // C. Navigation flush: type into Title while drawer is open and navigate straight to /leads without clicking Close
      mock.clearRequests();
      await cdp.eval(`
        (() => {
          const el = document.querySelector('aside.drawer .form-grid input.input');
          el.focus();
          el.setSelectionRange && el.setSelectionRange(el.value.length, el.value.length);
        })()
      `);
      for (const ch of ' NAVFLUSH') {
        await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: ch });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
      }
      const reqsBeforeNav = mock.requests.filter((r) => r.method === 'PATCH').length;
      await cdp.eval(`Array.from(document.querySelectorAll('aside.sidebar nav button')).find(b => b.textContent.toLowerCase().includes('lead')).click()`);
      await new Promise((r) => setTimeout(r, 250));
      const reqsAfterNav = mock.requests.filter((r) => r.method === 'PATCH').length;
      behavioral.navigationFlush = {
        reqsBeforeNav,
        reqsAfterNav,
        savedTitleEndsWithNavFlush: mock.db.items[0].title.endsWith('NAVFLUSH'),
      };
    }

    console.log(JSON.stringify({ mode, results, behavioral }, null, 2));
  } finally {
    try { cdp?.close(); } catch {}
    try { chromeProc?.kill(); } catch {}
    try { await viteServer?.close(); } catch {}
    try { await mock.close(); } catch {}
    try { fs.rmSync(emptyEnvDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(browserDataDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
