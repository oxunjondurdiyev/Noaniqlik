/* ═══════════════════════════════════════════════════════════════
   APP.JS — Main application controller
   Initializes all modules, wires up events
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── TRIAL MANAGER ─────────────────────────────── */
  const FREE_LIMIT = 7;
  const TRIAL_KEY  = 'uc_trial_count';

  function getTrialCount() {
    return parseInt(localStorage.getItem(TRIAL_KEY) || '0', 10);
  }
  function incrementTrial() {
    localStorage.setItem(TRIAL_KEY, getTrialCount() + 1);
  }
  function isTrialActive() {
    const session = window.AuthManager && window.AuthManager.getSession();
    if (session) return true;
    return getTrialCount() < FREE_LIMIT;
  }

  function showPaywall() {
    const modal = document.getElementById('trial-paywall');
    if (!modal) return;
    // Progressni yangilash
    const used      = Math.min(getTrialCount(), FREE_LIMIT);
    const dotsEl    = modal.querySelector('.paywall-dots');
    if (dotsEl) {
      dotsEl.innerHTML = Array.from({ length: FREE_LIMIT }, (_, i) =>
        `<span class="pdot ${i < used ? 'filled' : ''}"></span>`
      ).join('');
    }
    modal.style.display = 'flex';
  }

  function hidePaywall() {
    const modal = document.getElementById('trial-paywall');
    if (modal) modal.style.display = 'none';
  }

  function updateTrialBanner() {
    const banner  = document.getElementById('trial-banner');
    if (!banner) return;
    const session = window.AuthManager && window.AuthManager.getSession();
    if (session) { banner.style.display = 'none'; return; }

    const used      = getTrialCount();
    const remaining = FREE_LIMIT - used;

    banner.style.display = '';
    if (remaining <= 0) {
      banner.className = 'trial-banner trial-danger';
      banner.textContent = i18n.t('trial_over');
    } else {
      banner.className = `trial-banner ${remaining <= 2 ? 'trial-warn' : 'trial-info'}`;
      // Tarjima escape qilinadi; <b> faqat sonlar atrofida (foydalanuvchi ma'lumoti emas)
      banner.innerHTML = escHtml(i18n.t('trial_left'))
        .replace('{used}', `<b>${used}/${FREE_LIMIT}</b>`).replace('{left}', `<b>${remaining}</b>`);
    }
  }

  /* ─── DOM CACHE ─────────────────────────────────── */
  const homeScreen    = document.getElementById('home-screen');
  const welcomeScreen = document.getElementById('welcome-screen');
  const appShell      = document.getElementById('app');
  const sidebar       = document.getElementById('sidebar');
  const paramList     = document.getElementById('param-list');
  const derivedList   = document.getElementById('derived-list');

  /* ─── SCREEN NAVIGATION ──────────────────────────── */
  function showScreen(name) {
    homeScreen   .classList.toggle('hidden', name !== 'home');
    welcomeScreen.classList.toggle('hidden', name !== 'welcome');
    appShell     .classList.toggle('hidden', name !== 'app');
    const tplScreen = document.getElementById('templates-screen');
    if (tplScreen) tplScreen.classList.toggle('hidden', name !== 'templates');
    const dash = document.getElementById('dash-screen');          // Bosh sahifa (src/ui/home/)
    if (dash) dash.classList.toggle('hidden', name !== 'dash');
    document.dispatchEvent(new CustomEvent('screenchange', { detail: { screen: name } }));
    if (name !== 'home') window.scrollTo(0, 0);
  }

  /* Trial tekshiruvi (yangi sessiya boshlanganda). false — paywall ko'rsatildi. */
  function beginSession() {
    const session = window.AuthManager && window.AuthManager.getSession();
    if (!session) {
      if (!isTrialActive()) {
        showPaywall();
        return false;
      }
      incrementTrial();
      updateTrialBanner();
    }
    return true;
  }

  /* ─── UTILITIES ─────────────────────────────────── */
  // showToast — src/ui/toast.js (xabar faqat textContent orqali, P02)

  window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
    // P16: qobiq (src/ui/shell/app.js) — chap menyu, stepper va joylashuv yo'li shu hodisadan yangilanadi
    document.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: tabName } }));
  };

  // Yagona escape: src/ui/escape.js (P02)
  const escHtml = window.escHtml;

  /* ─── THEME — event delegation (works for ALL screens) ── */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('uc_theme', next);
  }

  function initTheme() {
    const saved = localStorage.getItem('uc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    /* Single delegated listener — catches buttons on ALL screens */
    document.addEventListener('click', e => {
      if (e.target.closest('.theme-toggle')) toggleTheme();
    });
  }

  /* ─── LANGUAGE — event delegation ───────────────── */
  function initLang() {
    i18n.apply();
    document.addEventListener('langchange', updateTrialBanner);
    document.addEventListener('click', e => {
      const btn = e.target.closest('.lang-btn');
      if (!btn || !btn.dataset.lang) return;
      i18n.setLang(btn.dataset.lang);
      Table.render();
      TypeB.render();
      Results.render();
      renderSidebar();
    });
  }

  /* ─── HOME PAGE ─────────────────────────────────── */
  function initHome() {
    // "Kalkulyatorni ochish" — brauzer Bosh sahifani ko'rgani belgilanadi: keyingi ochilishda tanishtiruv sahifasi emas, Bosh sahifa
    const openDash = () => { markSeenDash(); showScreen('dash'); };
    document.getElementById('btn-home-start').addEventListener('click',  openDash);
    document.getElementById('btn-home-start2').addEventListener('click', openDash);
    /* Formula cycling animation */
    const items = document.querySelectorAll('.fc-item');
    const dots  = document.querySelectorAll('.fc-dot');
    let cur = 0;
    setInterval(() => {
      items[cur].classList.remove('active');
      dots[cur].classList.remove('active');
      cur = (cur + 1) % items.length;
      items[cur].classList.add('active');
      dots[cur].classList.add('active');
    }, 2800);
  }

  /* ─── WELCOME SCREEN ────────────────────────────── */
  function initWelcome() {
    document.getElementById('btn-back-home').addEventListener('click', () => showScreen('dash'));
    document.getElementById('btn-start').addEventListener('click', startSession);
    updateTrialBanner();

    // Stepper +/- buttons
    document.querySelectorAll('.wf-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp   = document.getElementById(btn.dataset.target);
        const delta = parseInt(btn.dataset.delta, 10);
        const min   = parseInt(inp.min, 10) || 1;
        const max   = parseInt(inp.max, 10) || 999;
        const cur   = parseInt(inp.value, 10) || (min);
        inp.value   = Math.min(max, Math.max(min, cur + delta));
      });
    });

    // Preset select on welcome
    document.getElementById('inp-preset').addEventListener('change', (e) => {
      if (e.target.value) {
        const preset = PRESETS[e.target.value];
        if (preset) {
          document.getElementById('inp-n').value = preset.n;
          document.getElementById('inp-p').value = preset.params.length;
        }
      }
    });
  }

  function startSession() {
    if (!beginSession()) return;

    const n       = Math.max(2, parseInt(document.getElementById('inp-n').value, 10) || 10);
    const p       = Math.max(1, parseInt(document.getElementById('inp-p').value, 10) || 1);
    const preset  = document.getElementById('inp-preset').value;

    // Build param names
    const defaultNames = ['x','y','z','a','b','c','d','e','f','g',
                          'x₁','x₂','x₃','x₄','x₅','x₆','x₇','x₈','x₉'];
    let params;

    if (preset && PRESETS[preset]) {
      const pd = PRESETS[preset];
      params = pd.params.slice(0, p);
      // Pad if p > preset params
      while (params.length < p) params.push(defaultNames[params.length] || `p${params.length+1}`);
    } else {
      params = Array.from({ length: p }, (_, i) => defaultNames[i] || `p${i+1}`);
    }

    appState.set({ n, params, measurements: {}, typeA: {}, typeB: [], combined: null,
                   model: { formula: '', unit: '' }, covB: {}, units: {}, template: null,
                   settings: { paired: true, P: 0.9545 }, directions: [], points: [], currentPoint: null });
    appState.resizeN(n);

    // Load preset data and type B components
    if (preset && PRESETS[preset]) {
      loadPreset(preset);
    }

    showScreen('app');
    renderSidebar();
    Table.render();
    TypeB.render();
  }

  function loadPreset(key) {
    const pd = PRESETS[key];
    if (!pd) return;

    // Measurement model of the preset (multi-parameter presets define y = f(…))
    appState.set({
      model: { formula: pd.formula || '', unit: pd.unit || '' },
      settings: { paired: true, P: 0.9545, ...(pd.settings ? JSON.parse(JSON.stringify(pd.settings)) : {}) },
      directions: pd.directions ? [...pd.directions] : [],
      points: [], currentPoint: null,
    });

    // Multi-point calibration presets: evaluate and save every point, then open the first
    if (pd.points && pd.points.length) {
      pd.points.forEach(pt => {
        const m = {};
        appState.get('params').forEach(p => {
          const arr = Array(appState.get('n')).fill('');
          (pt.data[p] || []).forEach((v, i) => { arr[i] = v; });
          m[p] = arr;
        });
        const tb = pd.typeBComponents.map((c, i) => ({
          ...c, ...((pt.patch || {})[c.name] || {}), name: PresetText.component(c.name),
          id: 'tb_' + i + '_' + Math.random().toString(36).slice(2, 6),
        }));
        appState.set({ measurements: m, typeB: tb, typeA: {}, combined: null, currentPoint: null });
        Points.save(pt.label);
      });
      const first = appState.get('points')[0];
      if (first) Points.load(first.id);
      if (pd.derived && pd.derived.length) renderDerived(pd.derived);
      return;
    }

    // Load sample measurement data
    if (pd.sampleData) {
      Object.entries(pd.sampleData).forEach(([param, vals]) => {
        appState.setMeasurements(param, vals);
      });
    }

    // Load TypeB components
    if (pd.typeBComponents) {
      TypeB.loadPresetComponents(PresetText.localized(pd.typeBComponents));
    }

    // Auto-compute TypeA if sample data provided
    if (pd.sampleData) {
      const state = appState.get();
      const typeA = {};
      state.params.forEach(p => {
        const vals = state.measurements[p];
        if (vals && vals.length >= 2) {
          const opt = ((state.settings || {}).typeA || {})[p] || {};
          const result = Calc.typeAx(vals, { ...opt, dirs: state.directions || [] });
          if (result) typeA[p] = result;
        }
      });
      if (Object.keys(typeA).length) appState.set({ typeA });
    }

    // Show derived quantities
    if (pd.derived && pd.derived.length) {
      renderDerived(pd.derived);
    }
  }

  /* ─── SIDEBAR ───────────────────────────────────── */
  function renderSidebar() {
    const state = appState.get();

    // Sidebar n input
    document.getElementById('sidebar-n').value = state.n;

    // Param list
    if (!paramList) return;
    paramList.innerHTML = state.params.map((p, i) => `
      <div class="param-item" data-idx="${i}">
        <input type="text" value="${escHtml(p)}" data-old="${escHtml(p)}"
          class="param-name-input" placeholder="${escHtml(i18n.t('ph_param_name'))}" />
        <button class="btn-icon-remove" data-param="${escHtml(p)}" title="${escHtml(i18n.t('c_remove'))}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Events
    paramList.querySelectorAll('.param-name-input').forEach(inp => {
      inp.addEventListener('blur', () => {
        const old = inp.dataset.old;
        const nw  = inp.value.trim();
        if (old !== nw && nw) {
          appState.renameParam(old, nw);
          inp.dataset.old = nw;
        }
      });
    });

    paramList.querySelectorAll('.btn-icon-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!appState.removeParam(btn.dataset.param)) {
          showToast(i18n.t('toast_need_param'), 'error');
        }
      });
    });
  }

  function initSidebar() {
    // Sidebar toggle
    document.getElementById('btn-sidebar-toggle').addEventListener('click', e => {
      const collapsed = sidebar.classList.toggle('collapsed');
      e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    });

    // Apply n button
    document.getElementById('btn-apply-n').addEventListener('click', () => {
      const n = Math.max(2, parseInt(document.getElementById('sidebar-n').value, 10) || 10);
      appState.resizeN(n);
    });

    // Add param
    document.getElementById('btn-add-param').addEventListener('click', () => {
      const state = appState.get();
      const names = ['a','b','c','d','e','f','g','h','p','q','r','s','t','u','v','w'];
      let newName = names.find(n => !state.params.includes(n)) || `x${state.params.length + 1}`;
      if (!appState.addParam(newName)) {
        showToast(i18n.t('toast_param_exists'), 'error');
      }
    });

    // Preset loader in sidebar
    document.getElementById('sidebar-preset').addEventListener('change', (e) => {
      if (e.target.value) {
        const preset = PRESETS[e.target.value];
        if (preset) {
          // Apply preset params and data
          const n = preset.n;
          appState.set({
            n,
            params: [...preset.params],
            measurements: {},
            typeA: {},
            typeB: [],
            combined: null,
            model: { formula: '', unit: '' }, covB: {}, units: {}, template: null,
            settings: { paired: true, P: 0.9545 }, directions: [], points: [], currentPoint: null,
          });
          appState.resizeN(n);
          loadPreset(e.target.value);
          renderSidebar();
          Table.render();
          TypeB.render();
          showToast(i18n.tf('toast_preset_loaded', { name: PresetText.title(e.target.value) }), 'success');
        }
        e.target.value = '';
      }
    });

    // Reset
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm(i18n.t('confirm_new_session'))) {
        appState.reset();
        showScreen('home');
      }
    });

    // Subscribe to state changes for sidebar updates
    appState.subscribe((changes) => {
      if (changes && (changes.params !== undefined || changes.n !== undefined)) {
        renderSidebar();
      }
    });
  }

  /* ─── TAB SWITCHING ─────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  /* ─── DERIVED QUANTITIES ─────────────────────────── */
  function renderDerived(derived) {
    if (!derivedList) return;
    if (!derived || !derived.length) {
      derivedList.innerHTML = `<p class="text-muted text-sm">${i18n.t('derived_hint')}</p>`;
      return;
    }
    derivedList.innerHTML = derived.map(d => `
      <div class="derived-item" data-formula="${escHtml(d.formula)}" title="${escHtml(i18n.t('derived_apply'))}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>${escHtml(d.formula)}</span>
      </div>
    `).join('');

    // Click → use as the measurement model
    derivedList.querySelectorAll('.derived-item').forEach(item => {
      item.addEventListener('click', () => {
        const cur = appState.get('model') || {};
        appState.set({ model: { ...cur, formula: item.dataset.formula }, combined: null });
        switchTab('data');
      });
    });
  }

  /* ─── AUTO-DETECT DERIVED QUANTITIES ────────────── */
  function detectDerived() {
    const state   = appState.get();
    const derived = [];
    // name(x) → the parameter as the user typed it, matched case-insensitively
    const nm  = x => state.params.find(p => p.toLowerCase() === x);
    const has = (...xs) => xs.every(nm);

    if (has('m', 'v'))      derived.push({ symbol: 'ρ', formula: `ρ = ${nm('m')} / ${nm('v')}` });
    if (has('u', 'i')) {
      derived.push({ symbol: 'P', formula: `P = ${nm('u')} × ${nm('i')}` });
      derived.push({ symbol: 'R', formula: `R = ${nm('u')} / ${nm('i')}` });
    }
    if (has('l', 'w'))      derived.push({ symbol: 'A', formula: `A = ${nm('l')} × ${nm('w')}` });
    if (has('l', 'w', 'h')) derived.push({ symbol: 'V', formula: `V = ${nm('l')} × ${nm('w')} × ${nm('h')}` });
    if (has('u', 'r'))      derived.push({ symbol: 'I', formula: `I = ${nm('u')} / ${nm('r')}` });

    renderDerived(derived);
  }

  /* ─── PAYWALL MODAL tugmalari ────────────────────── */
  function initPaywall() {
    const modal = document.getElementById('trial-paywall');
    if (!modal) return;

    modal.querySelector('#paywall-btn-register').addEventListener('click', () => {
      hidePaywall();
      showScreen('home');
      window.UCAuthScreen.show('register');
    });

    modal.querySelector('#paywall-btn-login').addEventListener('click', () => {
      hidePaywall();
      showScreen('home');
      window.UCAuthScreen.show('login');
    });
  }

  /* ─── BOOTSTRAP ─────────────────────────────────── */
  function bootstrap() {
    initTheme();
    initLang();
    initHome();
    initWelcome();
    initSidebar();
    initTabs();
    initPaywall();
    Table.init();
    TypeB.init();
    Results.init();

    // Subscribe to param changes to auto-detect derived
    appState.subscribe((changes) => {
      if (changes && changes.params !== undefined) detectDerived();
    });

    // Saqlangan holat bo'lsa — ish maydoni tayyorlanadi, lekin ekran to'g'ridan-to'g'ri ish maydoniga ALMASHTIRILMAYDI:
    // saqlangan hisob Bosh sahifada "Davom ettirish" kartasi bilan ko'rsatiladi (src/ui/home/app.js).
    const state = appState.get();
    const saved = state.params.length > 0 && Object.keys(state.measurements).length > 0;
    if (saved) { renderSidebar(); detectDerived(); }
    const hash = window.location.hash;
    const session = window.AuthManager && window.AuthManager.getSession ? window.AuthManager.getSession() : null;
    showScreen(startScreen(hash, { saved, seen: hasSeenDash(), loggedIn: isMember(session) }));
    // Sessiya (Firebase Auth) keyinroq aniqlanadi: kirgan foydalanuvchi (admin / xodim) — doim Bosh sahifa.
    // Faqat foydalanuvchi hali tanishtiruv sahifasidan chiqmagan va hash berilmagan bo'lsa almashtiriladi.
    if (window.AuthManager && window.AuthManager.ready) {
      window.AuthManager.ready().then(sess => {
        if (isMember(sess) && !homeScreen.classList.contains('hidden') && startScreen(hash, { loggedIn: true }) === 'dash') showScreen('dash');
      }).catch(() => { /* sessiya aniqlanmadi — tanlangan ekran qoladi */ });
    }
  }

  /* Bosh sahifa ko'rilgani belgisi (shaxsiy ma'lumot emas; faqat shu brauzerda) */
  const SEEN_DASH_KEY = 'uc_seen_dash';
  function hasSeenDash() { try { return localStorage.getItem(SEEN_DASH_KEY) === '1'; } catch (_) { return false; } }
  function markSeenDash() { try { localStorage.setItem(SEEN_DASH_KEY, '1'); } catch (_) { /* xotira o'chirilgan */ } }
  function isMember(session) { return !!session && (session.role === 'admin' || session.role === 'employee'); }

  /* Boshlang'ich ekran (egasi qarori 2026-11-23).
     1) URL hash bor bo'lsa — hash ustun: #home — tanishtiruv (kirish) sahifasi, #app — ish maydoni (saqlangan hisob
        bo'lsa; aks holda Bosh sahifa), #lab — Vizual laboratoriya (qobiq o'zi ochadi — src/ui/shell/app.js).
     2) Kirgan foydalanuvchi (admin / xodim) — doim Bosh sahifa.
     3) Kirmagan va bu brauzerda hech qachon hisob boshlamagan (saqlangan holat ham, uc_seen_dash belgisi ham yo'q) —
        tanishtiruv sahifasi (home).
     4) Qolgan hamma holatda — Bosh sahifa (dash); saqlangan hisob bo'lsa "Davom ettirish" kartasi bilan. */
  function startScreen(hash, o) {
    const s = o || {};
    const h = String(hash || '').replace(/^#/, '');
    if (h === 'home') return 'home';
    if (h === 'lab') return 'app';
    if (h === 'app') return s.saved ? 'app' : 'dash';
    if (s.loggedIn) return 'dash';
    if (!s.saved && !s.seen) return 'home';
    return 'dash';
  }

  // Shablonlar moduli (src/ui/tpl/app.js) uchun
  window.App = { showScreen, renderSidebar: () => renderSidebar(), beginSession, startScreen };

  document.addEventListener('DOMContentLoaded', bootstrap);

})();
