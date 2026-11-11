/* ═══════════════════════════════════════════════════════════════
   ADMIN-PAGE.JS — tashkilot admini paneli (admin.html)
   (avval inline <script> edi — CSP uchun ko'chirildi, P02)
   • Kirish: Firebase Auth holati; ma'lumotni Firestore qoidalari
     himoya qiladi — bu sahifadagi tekshiruv faqat UX uchun.
   • Parollar ko'rsatilmaydi va saqlanmaydi; yangi xodimning
     vaqtinchalik paroli faqat bir marta ko'rsatiladi.
   • Tarifni mijoz o'zgartira olmaydi — faqat so'rov (requestedPlan).
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $   = id => document.getElementById(id);
  const esc = s => window.UCEscape.escHtml(s);
  const t   = (k, v) => AuthManager.tr(k, v);

  /* ─── MAVZU ─────────────────────────────────────────── */
  try {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('uc_theme') || 'dark');
  } catch (_) {}
  $('btn-theme').addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('uc_theme', next); } catch (_) {}
  });
  if (window.i18n) i18n.apply();

  const COPY_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const OK_ICON   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;

  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = OK_ICON;
      setTimeout(() => { btn.innerHTML = COPY_ICON; }, 1500);
    });
  }

  /* ─── AUTH TEKSHIRUVI (Firebase Auth) ───────────────── */
  let session = null;
  let started = false;

  AuthManager.onChange(s => {
    if (!s || s.role !== 'admin') { location.replace('index.html'); return; }
    session = s;
    $('topbar-name').textContent = s.name || s.login;
    if (!started) { started = true; render(); }
  });

  $('btn-logout').addEventListener('click', async () => {
    await AuthManager.logout();
    location.replace('index.html');
  });

  /* ─── ASOSIY RENDER ──────────────────────────────────── */
  let lastOrg = null;
  let lastEmps = [];

  async function render() {
    let org, emps;
    try {
      org = await DB.get('organizations', session.orgId);
      if (!org) { location.replace('index.html'); return; }
      emps = await AuthManager.getOrgEmployees(session.orgId);
    } catch (e) {
      alert(t('auth_err_permission') + ': ' + e.message);
      return;
    }
    lastOrg = org; lastEmps = emps;
    renderStats(org, emps);
    renderOrgInfo(org);
    renderSubscription(org);
    renderEmployees(org, emps);
  }

  function planOf(org) { return AuthManager.PLANS[org.plan] || AuthManager.PLANS.basic; }

  function renderStats(org, emps) {
    const active = emps.filter(e => e.active).length;
    const plan   = planOf(org);
    const maxLbl = plan.maxUsers === -1 ? '∞' : plan.maxUsers;
    $('stats-row').innerHTML = `
      <div class="admin-stat"><span class="admin-stat-value">${active}</span><span class="admin-stat-label">Faol xodimlar</span></div>
      <div class="admin-stat"><span class="admin-stat-value">${maxLbl}</span><span class="admin-stat-label">Tarif limiti</span></div>
      <div class="admin-stat"><span class="admin-stat-value">${(plan.priceMonthly / 1000).toFixed(0)}K UZS</span><span class="admin-stat-label">Oylik to'lov</span></div>
      <div class="admin-stat"><span class="admin-stat-value">${esc(org.registeredAt || '—')}</span><span class="admin-stat-label">Ro'yxat sanasi</span></div>`;
  }

  function renderOrgInfo(org) {
    $('org-inn-badge').textContent = 'INN: ' + (org.inn || '');
    $('org-info-grid').innerHTML = `
      <div class="org-info-item"><label>To'liq ism</label><span>${esc(UCInvoice.orgDisplayName(org))}</span></div>
      <div class="org-info-item"><label>Login</label><span style="font-family:monospace">${esc(org.login)}</span></div>
      <div class="org-info-item"><label>INN</label><span>${esc(org.inn)}</span></div>
      <div class="org-info-item"><label>Telefon</label><span>${esc(org.phone)}</span></div>`;
  }

  function renderSubscription(org) {
    const plan = planOf(org);
    $('current-plan-badge').textContent = plan.name;

    const expiryEl = $('plan-expiry-text');
    if (org.planExpiry) {
      const daysLeft = Math.ceil((new Date(org.planExpiry) - Date.now()) / 86400000);
      expiryEl.textContent = `Obuna tugash sanasi: ${org.planExpiry} · ${daysLeft > 0 ? daysLeft + ' kun qoldi' : "MUDDATI O'TDI"}`;
      expiryEl.className   = 'plan-expiry' + (daysLeft <= 0 ? ' expired' : daysLeft <= 7 ? ' soon' : '');
    } else {
      expiryEl.textContent = 'Obuna tugash sanasi: ' + t('auth_no_expiry');
      expiryEl.className   = 'plan-expiry';
    }

    const reqEl = $('plan-requested-text');
    if (org.requestedPlan && org.requestedPlan !== org.plan && AuthManager.PLANS[org.requestedPlan]) {
      reqEl.textContent = t('auth_plan_requested', { plan: AuthManager.PLANS[org.requestedPlan].name });
      reqEl.style.display = '';
    } else {
      reqEl.style.display = 'none';
    }

    // Tarif kartalari — faqat SO'ROV (R-15). PLANS kalitlari ichki konstantalar.
    $('plan-upgrade-grid').innerHTML = Object.entries(AuthManager.PLANS).map(([key, p]) => `
      <div class="plan-upgrade-card ${org.plan === key ? 'current' : ''}" data-plan="${esc(key)}">
        <div class="plan-name">${esc(p.name)}</div>
        <div class="plan-price">${(p.priceMonthly / 1000).toFixed(0)}K <span style="font-size:.7rem;font-weight:400;color:var(--text-muted)">UZS/oy</span></div>
        <div class="plan-limit">${p.maxUsers === -1 ? 'Cheksiz xodim' : p.maxUsers + ' xodigacha'}</div>
        ${org.plan === key ? '<div style="font-size:.7rem;color:var(--accent);margin-top:.3rem">✓ Joriy tarif</div>' : ''}
      </div>`).join('');

    // To'lov tugmalari
    const txId = 'ORG_' + org.id + '_' + Date.now();
    $('btn-pay-click').onclick = () => window.open(AuthManager.getClickUrl(plan.priceMonthly, txId), '_blank', 'noopener');
    $('btn-pay-payme').onclick = () => window.open(AuthManager.getPaymeUrl(plan.priceMonthly, txId), '_blank', 'noopener');
    $('btn-pay-bank').onclick  = () => openInvoice(org, lastEmps);
  }

  $('plan-upgrade-grid').addEventListener('click', async e => {
    const card = e.target.closest('.plan-upgrade-card');
    if (!card || card.classList.contains('current')) return;
    const planKey = card.dataset.plan;
    const p = AuthManager.PLANS[planKey];
    if (!p) return;
    if (!confirm(t('auth_plan_request_confirm', { plan: p.name }))) return;
    try {
      await AuthManager.requestPlan(planKey);
      render();
    } catch (err) {
      alert('Xato: ' + err.message);
    }
  });

  /* ─── INVOICE ────────────────────────────────────────── */
  function openInvoice(org, emps) {
    $('invoice-content').innerHTML = UCInvoice.buildInvoiceHTML(org, emps || []);
    $('invoice-modal').style.display = 'flex';
  }
  function closeInvoice() { $('invoice-modal').style.display = 'none'; }
  $('invoice-modal').addEventListener('click', e => { if (e.target === $('invoice-modal')) closeInvoice(); });
  $('btn-invoice-print').addEventListener('click', () => window.print());
  $('btn-invoice-close').addEventListener('click', closeInvoice);

  /* ─── XODIMLAR JADVALI ───────────────────────────────── */
  function renderEmployees(org, emps) {
    const plan     = planOf(org);
    const active   = emps.filter(e => e.active).length;
    const maxLabel = plan.maxUsers === -1 ? '∞' : plan.maxUsers;
    $('emp-count-label').textContent = `${active} / ${maxLabel} xodim`;

    const wrap = $('emp-table-wrap');
    if (emps.length === 0) {
      wrap.innerHTML = `<div class="admin-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <p>Hali xodim qo'shilmagan. Yuqoridagi forma orqali qo'shing.</p></div>`;
      return;
    }

    // Parol ustuni olib tashlandi (RISKS R-S2). Qiymatlar data-* da, handler — delegatsiya.
    wrap.innerHTML = `
      <table class="emp-table">
        <thead><tr>
          <th>#</th><th>Ism</th><th>Telefon</th><th>Lavozim</th>
          <th>Login</th><th>Sana</th><th>Holat</th><th></th>
        </tr></thead>
        <tbody>
        ${emps.map((e, i) => `
          <tr>
            <td class="text-muted text-sm">${i + 1}</td>
            <td><strong>${esc(e.name)}</strong></td>
            <td class="text-muted text-sm">${esc(e.phone || '—')}</td>
            <td class="text-muted text-sm">${esc(e.role || '—')}</td>
            <td>
              <div class="cred-box">
                <span>${esc(e.login)}</span>
                <button type="button" class="copy-btn" data-action="copy" data-value="${esc(e.login)}" title="Nusxa">${COPY_ICON}</button>
              </div>
            </td>
            <td class="text-muted text-sm">${esc(e.createdAt || '')}</td>
            <td>
              <span class="status-dot ${e.active ? 'active' : 'inactive'}"></span>
              ${e.active ? 'Faol' : 'Nofaol'}
            </td>
            <td>
              ${e.active ? `<button type="button" class="btn btn-sm btn-danger" data-action="remove" data-id="${esc(e.id)}">O'chirish</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  $('emp-table-wrap').addEventListener('click', async e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'copy') { copyText(btn.dataset.value, btn); return; }
    if (btn.dataset.action === 'remove') {
      if (!confirm("Ushbu xodimni bazadan butunlay o'chirishni tasdiqlaysizmi?\nBu amalni qaytarib bo'lmaydi.")) return;
      try {
        await AuthManager.deleteEmployee(btn.dataset.id);
        render();
      } catch (err) {
        alert('Xato: ' + err.message);
      }
    }
  });

  /* ─── TELEFON VALIDATSIYA ─────────────────────────────── */
  function validatePhone(raw) {
    const digits = raw.replace(/[\s\-()]/g, '');
    if (/^\+998\d{9}$/.test(digits)) return digits;
    if (/^998\d{9}$/.test(digits))   return '+' + digits;
    if (/^0\d{9}$/.test(digits))     return '+998' + digits.slice(1);
    return null;
  }

  /* ─── XODIM QO'SHISH ─────────────────────────────────── */
  const ADD_LABEL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

  $('btn-add-emp').addEventListener('click', async () => {
    const name  = $('inp-emp-name').value.trim();
    const phone = $('inp-emp-phone').value.trim();
    const role  = $('inp-emp-role').value.trim();
    const errEl = $('emp-add-error');
    const fail  = msg => { errEl.textContent = '❌ ' + msg; errEl.style.display = 'block'; };
    errEl.style.display = 'none';
    $('emp-created-box').style.display = 'none';

    if (!name) return fail('Ism familyani kiriting');
    if (name.split(/\s+/).length < 2) return fail("Ism va familyani to'liq kiriting (masalan: Ahmad Karimov)");
    if (!phone) return fail('Telefon raqamini kiriting');
    const normalizedPhone = validatePhone(phone);
    if (!normalizedPhone) return fail("Telefon formati noto'g'ri. Masalan: +998901234567 yoki 0901234567");
    if (!role) return fail('Lavozimni kiriting');

    const btn = $('btn-add-emp');
    btn.disabled = true;
    btn.innerHTML = ADD_LABEL + " Qo'shilmoqda…";
    try {
      const { employee, tempPassword } = await AuthManager.addEmployee({ name, phone: normalizedPhone, role });
      $('inp-emp-name').value = ''; $('inp-emp-phone').value = ''; $('inp-emp-role').value = '';
      $('emp-created-text').textContent = t('auth_emp_created', { login: employee.login, pwd: tempPassword });
      $('emp-created-box').style.display = 'block';
      render();
    } catch (err) {
      fail(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = ADD_LABEL + " + Qo'shish";
    }
  });
})();
