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
      banner.innerHTML = `⛔ Bepul hisoblash tugadi — davom etish uchun ro'yxatdan o'ting.`;
    } else {
      banner.className = `trial-banner ${remaining <= 2 ? 'trial-warn' : 'trial-info'}`;
      banner.innerHTML =
        `🆓 Bepul sinash: <b>${used}/${FREE_LIMIT}</b> — <b>${remaining} ta</b> qoldi`;
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
    if (name !== 'home') window.scrollTo(0, 0);
  }

  /* ─── UTILITIES ─────────────────────────────────── */
  window.showToast = function (msg, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
      info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`,
    };
    toast.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'opacity .3s, transform .3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  window.switchTab = function (tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
  };

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

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
    document.getElementById('btn-home-start').addEventListener('click',  () => showScreen('welcome'));
    document.getElementById('btn-home-start2').addEventListener('click', () => showScreen('welcome'));
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
    document.getElementById('btn-back-home').addEventListener('click', () => showScreen('home'));
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
    // ─ Trial tekshiruvi ─────────────────────────────
    const session = window.AuthManager && window.AuthManager.getSession();
    if (!session) {
      if (!isTrialActive()) {
        showPaywall();
        return;
      }
      incrementTrial();
      updateTrialBanner();
    }
    // ────────────────────────────────────────────────

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

    appState.set({ n, params, measurements: {}, typeA: {}, typeB: [], combined: null });
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

    // Load sample measurement data
    if (pd.sampleData) {
      Object.entries(pd.sampleData).forEach(([param, vals]) => {
        appState.setMeasurements(param, vals);
      });
    }

    // Load TypeB components
    if (pd.typeBComponents) {
      TypeB.loadPresetComponents(pd.typeBComponents);
    }

    // Auto-compute TypeA if sample data provided
    if (pd.sampleData) {
      const state = appState.get();
      const typeA = {};
      state.params.forEach(p => {
        const vals = state.measurements[p];
        if (vals && vals.length >= 2) {
          const result = Calc.typeA(vals);
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
          class="param-name-input" placeholder="name" />
        <button class="btn-icon-remove" data-param="${escHtml(p)}" title="Remove">
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
          showToast('Need at least 1 parameter', 'error');
        }
      });
    });
  }

  function initSidebar() {
    // Sidebar toggle
    document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
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
        showToast('Parameter already exists', 'error');
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
          });
          appState.resizeN(n);
          loadPreset(e.target.value);
          renderSidebar();
          Table.render();
          TypeB.render();
          showToast(`Preset loaded: ${preset.name}`, 'success');
        }
        e.target.value = '';
      }
    });

    // Reset
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('Start a new session? All data will be cleared.')) {
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
      <div class="derived-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span><strong>${escHtml(d.symbol)}</strong> = ${escHtml(d.formula)}</span>
      </div>
    `).join('');
  }

  /* ─── AUTO-DETECT DERIVED QUANTITIES ────────────── */
  function detectDerived() {
    const state   = appState.get();
    const params  = state.params.map(p => p.toLowerCase());
    const derived = [];

    if (params.includes('m') && params.includes('v')) {
      derived.push({ symbol: 'ρ', formula: 'ρ = m / V' });
    }
    if (params.includes('u') && params.includes('i')) {
      derived.push({ symbol: 'P', formula: 'P = U × I' });
      derived.push({ symbol: 'R', formula: 'R = U / I' });
    }
    if (params.includes('l') && params.includes('w')) {
      derived.push({ symbol: 'A', formula: 'A = L × W' });
    }
    if (params.includes('l') && params.includes('w') && params.includes('h')) {
      derived.push({ symbol: 'V', formula: 'V = L × W × H' });
    }
    if (params.includes('u') && params.includes('r')) {
      derived.push({ symbol: 'I', formula: 'I = U / R' });
    }

    renderDerived(derived);
  }

  /* ─── PAYWALL MODAL tugmalari ────────────────────── */
  function initPaywall() {
    const modal = document.getElementById('trial-paywall');
    if (!modal) return;

    modal.querySelector('#paywall-btn-register').addEventListener('click', () => {
      hidePaywall();
      showScreen('home');
      document.getElementById('auth-screen').style.display = 'flex';
      document.querySelector('[data-auth-tab="register"]').click();
    });

    modal.querySelector('#paywall-btn-login').addEventListener('click', () => {
      hidePaywall();
      showScreen('home');
      document.getElementById('auth-screen').style.display = 'flex';
      document.querySelector('[data-auth-tab="login"]').click();
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

    // If there's existing state, resume session
    const state = appState.get();
    if (state.params.length && Object.keys(state.measurements).length) {
      showScreen('app');
      renderSidebar();
      detectDerived();
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);

})();
