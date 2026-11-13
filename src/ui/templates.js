/* ═══════════════════════════════════════════════════════════════
   TEMPLATES.JS — admin / super-admin / ro'yxatdan o'tish sahifalari
   uchun HTML shablonlar (P02, RISKS R-S5)
   ─────────────────────────────────────────────────────────────
   • Bazadan kelgan HAR BIR qiymat escHtml() dan o'tadi.
   • Inline onclick yo'q: tugmalarda data-action / data-id atributlari,
     hodisalar sahifa skriptida addEventListener (delegatsiya) bilan.
   • Sof funksiyalar: (ma'lumot) → HTML satr. Node'da test qilinadi
     (tests/security/xss.test.js).
═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const esc  = (typeof module !== 'undefined' && module.exports) ? require('./escape.js').escHtml : root.escHtml;
  const Core = (typeof module !== 'undefined' && module.exports) ? require('../js/auth-core.js') : root.AuthCore;

  const COPY_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  function planOf(org, plans) {
    plans = plans || Core.PLANS;
    return plans[org && org.plan] || plans.basic;
  }

  /* ─── RO'YXATDAN O'TGANDAN KEYINGI MA'LUMOT ─────────── */
  function pendingOrgInfoHTML(org, plans) {
    const plan = planOf(org, plans);
    return `
      <div style="display:flex;flex-direction:column;gap:.4rem">
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Ism</span>
          <span style="font-weight:500">${esc(Core.orgDisplayName(org))}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Login</span>
          <span style="font-family:monospace">${esc(org.login)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">Tarif</span>
          <span>${esc(plan.name)} — ${esc((plan.priceMonthly / 1000).toFixed(0))}K UZS/oy</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--text-muted)">To'lov holati</span>
          <span style="color:#eab308">⏳ Kutilmoqda</span>
        </div>
      </div>`;
  }

  /* ─── HISOB-FAKTURA ─────────────────────────────────── */
  function invoiceHTML(org, emps, plans, now) {
    const plan        = planOf(org, plans);
    const activeCount = (emps || []).filter(e => e.active).length;
    const price       = plan.priceMonthly;
    now               = now || new Date();
    const yyyymm      = now.toISOString().slice(0, 7).replace('-', '');
    const invoiceNo   = `INV-${String(org.inn || '').replace(/[^0-9]/g, '')}-${yyyymm}`;
    const today       = now.toISOString().slice(0, 10);
    const maxLbl      = plan.maxUsers === -1 ? 'Cheksiz' : plan.maxUsers + ' ta';
    const priceStr    = price.toLocaleString('uz-UZ');

    const S = {
      wrap:    'font-family:Inter,sans-serif;color:#1a1a2e;font-size:14px;line-height:1.6;background:#fff;padding:2rem;',
      header:  'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.75rem;padding-bottom:1.25rem;border-bottom:3px solid #2563eb;',
      brandN:  'font-size:1.4rem;font-weight:800;color:#2563eb;letter-spacing:-.02em;',
      brandS:  'font-size:.8rem;color:#6b7280;margin-top:.2rem;',
      titleB:  'text-align:right;',
      title:   'font-size:1.2rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1a1a2e;',
      no:      'font-size:.95rem;font-weight:600;color:#2563eb;margin-top:.2rem;',
      date:    'font-size:.82rem;color:#6b7280;',
      parties: 'display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.75rem;',
      party:   'background:#f0f6ff;border:1px solid #dbeafe;border-radius:8px;padding:1rem 1.1rem;',
      ptitle:  'font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:.45rem;',
      pname:   'font-size:.95rem;font-weight:700;color:#1a1a2e;margin-bottom:.3rem;',
      prow:    'font-size:.85rem;color:#4b5563;margin-bottom:.1rem;',
      table:   'width:100%;border-collapse:collapse;margin-bottom:.85rem;',
      th:      'background:#2563eb;color:#fff;padding:.6rem .9rem;text-align:left;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;',
      thR:     'background:#2563eb;color:#fff;padding:.6rem .9rem;text-align:right;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;',
      td:      'padding:.7rem .9rem;border-bottom:1px solid #e5e7eb;font-size:.88rem;vertical-align:top;',
      tdR:     'padding:.7rem .9rem;border-bottom:1px solid #e5e7eb;font-size:.88rem;text-align:right;',
      tfootR:  'padding:.75rem .9rem;border-top:2px solid #2563eb;text-align:right;font-weight:700;font-size:1rem;color:#2563eb;',
      tfootL:  'padding:.75rem .9rem;border-top:2px solid #2563eb;text-align:right;font-weight:600;font-size:.9rem;color:#374151;',
      note:    'font-size:.8rem;color:#6b7280;background:#f9fafb;border-radius:6px;padding:.65rem .9rem;margin-bottom:.85rem;',
      ref:     'background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:8px;padding:.85rem 1rem;font-size:.875rem;color:#1e40af;margin-bottom:1.25rem;',
      refLbl:  'font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:block;margin-bottom:.3rem;',
      footer:  'display:flex;justify-content:space-between;padding-top:.85rem;border-top:1px solid #e5e7eb;font-size:.78rem;color:#9ca3af;',
    };

    return `
  <div style="${S.wrap}" id="inv-print-area">
    <div style="${S.header}">
      <div>
        <div style="${S.brandN}">UncertaintyCalc</div>
        <div style="${S.brandS}">ISO/IEC 17025 Noaniqlik kalkulyatori</div>
      </div>
      <div style="${S.titleB}">
        <div style="${S.title}">Hisob-faktura</div>
        <div style="${S.no}">№ ${esc(invoiceNo)}</div>
        <div style="${S.date}">Sana: ${esc(today)}</div>
      </div>
    </div>

    <div style="${S.parties}">
      <div style="${S.party}">
        <div style="${S.ptitle}">Sotuvchi</div>
        <div style="${S.pname}">UncertaintyCalc xizmati</div>
        <div style="${S.prow}">Bank: O'zbekiston Milliy Banki</div>
        <div style="${S.prow}">Hisob raqam: 20208000000000000000</div>
        <div style="${S.prow}">MFO: 00912</div>
        <div style="${S.prow}">STIR: 000000000</div>
      </div>
      <div style="${S.party}">
        <div style="${S.ptitle}">Xaridor</div>
        <div style="${S.pname}">${esc(Core.orgDisplayName(org))}</div>
        <div style="${S.prow}">INN: ${esc(org.inn)}</div>
        <div style="${S.prow}">Tel: ${esc(org.phone)}</div>
      </div>
    </div>

    <table style="${S.table}">
      <thead><tr>
        <th style="${S.th}">#</th>
        <th style="${S.th}">Xizmat nomi</th>
        <th style="${S.th}">Birlik</th>
        <th style="${S.thR}">Miqdor</th>
        <th style="${S.thR}">Narx (so'm)</th>
        <th style="${S.thR}">Jami (so'm)</th>
      </tr></thead>
      <tbody>
        <tr>
          <td style="${S.td}">1</td>
          <td style="${S.td}">
            <strong>Obuna tarifi — "${esc(plan.name)}"</strong><br>
            <span style="font-size:.8rem;color:#6b7280">
              Aktiv xodimlar: ${esc(activeCount)} ta &nbsp;·&nbsp; Tarif limiti: ${esc(maxLbl)}
            </span>
          </td>
          <td style="${S.td}">oy</td>
          <td style="${S.tdR}">1</td>
          <td style="${S.tdR};font-weight:600">${esc(priceStr)}</td>
          <td style="${S.tdR};font-weight:700;color:#2563eb">${esc(priceStr)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="${S.tfootL}">JAMI TO'LOV:</td>
          <td style="${S.tfootR}">${esc(priceStr)} so'm</td>
        </tr>
      </tfoot>
    </table>

    <div style="${S.note}">
      * Ushbu hisob-faktura QQS kiritilmagan holda taqdim etilgan.
      To'lovdan keyin buxgalteriya bo'limiga to'lov tasdig'ini yuboring.
    </div>

    <div style="${S.ref}">
      <span style="${S.refLbl}">To'lov maqsadi (bank orderida ko'rsating):</span>
      "${esc(invoiceNo)} raqamli hisob-faktura bo'yicha UncertaintyCalc obuna to'lovi"
    </div>

    <div style="${S.footer}">
      <span>UncertaintyCalc — ISO/IEC 17025 Noaniqlik kalkulyatori</span>
      <span>Yaratildi: ${esc(today)}</span>
    </div>
  </div>`;
  }

  /* ─── ADMIN: TASHKILOT MA'LUMOTI ────────────────────── */
  function orgInfoHTML(org) {
    return `
    <div class="org-info-item"><label>To'liq ism</label><span>${esc(Core.orgDisplayName(org))}</span></div>
    <div class="org-info-item"><label>Login</label><span style="font-family:monospace">${esc(org.login)}</span></div>
    <div class="org-info-item"><label>INN</label><span>${esc(org.inn)}</span></div>
    <div class="org-info-item"><label>Telefon</label><span>${esc(org.phone)}</span></div>`;
  }

  /* ─── ADMIN: XODIMLAR JADVALI ───────────────────────── */
  // Parol ustuni yo'q: parol hech qayerda saqlanmaydi va ko'rsatilmaydi.
  function employeesTableHTML(emps) {
    if (!emps || emps.length === 0) {
      return `<div class="admin-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <p>Hali xodim qo'shilmagan. Yuqoridagi forma orqali qo'shing.</p></div>`;
    }
    return `
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
              <button class="copy-btn" data-action="copy" data-value="${esc(e.login)}" title="Nusxa">${COPY_ICON}</button>
            </div>
          </td>
          <td class="text-muted text-sm">${esc(e.createdAt || '—')}</td>
          <td>
            <span class="status-dot ${e.active ? 'active' : 'inactive'}"></span>
            ${e.active ? 'Faol' : 'Nofaol'}
          </td>
          <td>
            <div style="display:flex;gap:.35rem;flex-wrap:wrap">
              <button class="btn btn-sm btn-ghost" data-action="reset-password" data-id="${esc(e.id)}" title="Yangi login va parol berish">Parolni tiklash</button>
              <button class="btn btn-sm btn-danger" data-action="delete" data-id="${esc(e.id)}">O'chirish</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  /* ─── SUPER-ADMIN: TASHKILOTLAR JADVALI ─────────────── */
  function superadminRowsHTML(list, plans) {
    plans = plans || Core.PLANS;
    if (!list || list.length === 0) {
      return `<tr><td colspan="9">
        <div class="sa-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          Tashkilot topilmadi
        </div></td></tr>`;
    }
    const planName = k => (plans[k] && plans[k].name) || k || '—';
    return list.map((org, i) => {
      const isActive    = org.active === true;
      const isPaid      = org.paymentStatus === 'paid';
      const statusClass = isActive ? 'active' : (isPaid ? 'inactive' : 'pending');
      const statusLabel = isActive ? 'Faol' : (isPaid ? 'Nofaol' : 'Kutilmoqda');
      const req = org.requestedPlan && org.requestedPlan !== org.plan && plans[org.requestedPlan] ? org.requestedPlan : null;
      return `
        <tr data-row-id="${esc(org.id)}">
          <td class="org-meta">${i + 1}</td>
          <td>
            <div class="org-name">${esc(Core.orgDisplayName(org))}</div>
            <div class="org-meta" style="font-family:'JetBrains Mono',monospace">${esc(org.login)}</div>
          </td>
          <td class="org-meta" style="font-family:'JetBrains Mono',monospace">${esc(org.inn)}</td>
          <td class="org-meta">${esc(org.phone)}</td>
          <td class="org-meta">
            ${esc(planName(org.plan))}
            ${org.planExpiry ? `<div class="org-meta">→ ${esc(org.planExpiry)}</div>` : ''}
            ${req ? `<div class="org-meta" style="color:#eab308">So'rov: ${esc(planName(req))}</div>` : ''}
          </td>
          <td>
            <span class="pay-badge ${isPaid ? 'paid' : 'pending'}">
              ${isPaid ? '✓ To\'langan' : '⏳ Kutilmoqda'}
            </span>
          </td>
          <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
          <td class="org-meta">${esc(org.registeredAt || '—')}</td>
          <td>
            <div class="action-row">
              ${!isPaid ? `<button class="btn btn-xs btn-pay-confirm" data-action="confirm-payment" data-id="${esc(org.id)}">To'lov tasdiqlash</button>` : ''}
              ${!isActive
                ? `<button class="btn btn-xs btn-activate" data-action="activate" data-id="${esc(org.id)}">Aktivlashtirish</button>`
                : `<button class="btn btn-xs btn-deactivate" data-action="deactivate" data-id="${esc(org.id)}">Bloklash</button>`}
              ${req ? `<button class="btn btn-xs btn-pay-confirm" data-action="apply-plan" data-id="${esc(org.id)}" data-plan="${esc(req)}">Tarifni qo'llash</button>` : ''}
              <button class="btn btn-xs btn-ghost" data-action="extend" data-id="${esc(org.id)}" title="Obuna muddatini 30 kunga uzaytirish">+30 kun</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  /* ─── SUPER-ADMIN: AUTH'DAN O'CHIRILISHI KERAK HISOBLAR ── */
  function cleanupRowsHTML(list) {
    if (!list || list.length === 0) {
      return '<tr><td colspan="5" class="sa-empty">Navbat bo\'sh</td></tr>';
    }
    return list.map(c => `
      <tr>
        <td class="org-meta" style="font-family:'JetBrains Mono',monospace">${esc(c.id)}</td>
        <td class="org-meta" style="font-family:'JetBrains Mono',monospace">${esc(c.login)}</td>
        <td class="org-meta">${c.reason === 'password-reset' ? 'Parol tiklandi' : 'O\'chirildi'}</td>
        <td class="org-meta">${esc(c.at)}</td>
        <td><button class="btn btn-xs btn-ghost" data-action="cleanup-done" data-id="${esc(c.id)}" title="Auth konsolida o'chirganingizdan keyin bosing">Bajarildi</button></td>
      </tr>`).join('');
  }

  const api = {
    pendingOrgInfoHTML, invoiceHTML, orgInfoHTML, employeesTableHTML,
    superadminRowsHTML, cleanupRowsHTML,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) root.UiTemplates = api;
})(typeof window !== 'undefined' ? window : globalThis);
