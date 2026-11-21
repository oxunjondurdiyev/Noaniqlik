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
    if (session) { banner.hidden = true; return; }

    const used      = getTrialCount();
    const remaining = FREE_LIMIT - used;

    banner.hidden = false;
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
  const appShell      = document.getElementById('app');

  /* ─── SCREEN NAVIGATION ──────────────────────────── */
  function showScreen(name) {
    homeScreen   .classList.toggle('hidden', name !== 'home');
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
    });
  }

  /* ─── HOME PAGE ─────────────────────────────────── */
  function initHome() {
    document.getElementById('btn-home-start').addEventListener('click',  () => showScreen('dash'));
    document.getElementById('btn-home-start2').addEventListener('click', () => showScreen('dash'));
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

  /* ─── YANGI HISOB (P22-1: UX-01) ─────────────────────
     "Hisoblashni sozlash" oynasi (N, P, "Sozlamani yuklash") olib tashlandi: Bosh sahifadagi "Yangi hisob" to'g'ridan-to'g'ri
     Model qadamini ochadi. P — formuladan, N — jadvaldan (src/ui/flow/model.js). Namunalar — shablonlar katalogida. */
  function newCalculation() {
    if (!beginSession()) return false;
    appState.set(window.UCFlow.blankCalc());
    showScreen('app');
    Table.render();
    TypeB.render();
    Results.render();
    if (window.UCShell) window.UCShell.goStep('model'); else switchTab('model');
    const f = document.getElementById('model-formula');
    if (f) f.focus();
    return true;
  }

  function initReset() {
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm(i18n.t('confirm_new_session'))) newCalculation();
    });
  }

  /* ─── TAB SWITCHING ─────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
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
    initReset();
    updateTrialBanner();
    initTabs();
    initPaywall();
    Table.init();
    TypeB.init();
    Results.init();

    // Boshlangan hisob bo'lsa — davom ettiriladi (eski saqlangan holatlar ham: src/ui/flow/model.js::hasSession)
    if (window.UCFlow.hasSession(appState.get())) showScreen('app');
  }

  // Shablonlar moduli (src/ui/tpl/app.js) uchun
  /* renderSidebar — moslik uchun (sessiya paneli P22-1 da olib tashlandi; chaqiruvchilar: tpl, io, home) */
  window.App = { showScreen, renderSidebar: () => {}, beginSession, newCalculation };

  document.addEventListener('DOMContentLoaded', bootstrap);

})();
