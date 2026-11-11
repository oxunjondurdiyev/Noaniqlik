/* ═══════════════════════════════════════════════════════════════
   INVOICE.JS — hisob-faktura HTML (index.html va admin.html uchun
   yagona nusxa). Barcha tashkilot maydonlari UCEscape.escHtml bilan.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const esc = s => window.UCEscape.escHtml(s);

  function orgDisplayName(org) {
    return [org.firstName, org.lastName].filter(Boolean).join(' ') || org.fullName || org.login || '';
  }

  const S = {
    wrap:'font-family:Inter,sans-serif;color:#1a1a2e;font-size:14px;line-height:1.6;background:#fff;padding:2rem;',
    header:'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.75rem;padding-bottom:1.25rem;border-bottom:3px solid #2563eb;',
    brandN:'font-size:1.4rem;font-weight:800;color:#2563eb;letter-spacing:-.02em;',
    brandS:'font-size:.8rem;color:#6b7280;margin-top:.2rem;',
    titleB:'text-align:right;',
    title:'font-size:1.2rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1a1a2e;',
    no:'font-size:.95rem;font-weight:600;color:#2563eb;margin-top:.2rem;',
    date:'font-size:.82rem;color:#6b7280;',
    parties:'display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.75rem;',
    party:'background:#f0f6ff;border:1px solid #dbeafe;border-radius:8px;padding:1rem 1.1rem;',
    ptitle:'font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:.45rem;',
    pname:'font-size:.95rem;font-weight:700;color:#1a1a2e;margin-bottom:.3rem;',
    prow:'font-size:.85rem;color:#4b5563;margin-bottom:.1rem;',
    table:'width:100%;border-collapse:collapse;margin-bottom:.85rem;',
    th:'background:#2563eb;color:#fff;padding:.6rem .9rem;text-align:left;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;',
    thR:'background:#2563eb;color:#fff;padding:.6rem .9rem;text-align:right;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;',
    td:'padding:.7rem .9rem;border-bottom:1px solid #e5e7eb;font-size:.88rem;vertical-align:top;',
    tdR:'padding:.7rem .9rem;border-bottom:1px solid #e5e7eb;font-size:.88rem;text-align:right;',
    tfootR:'padding:.75rem .9rem;border-top:2px solid #2563eb;text-align:right;font-weight:700;font-size:1rem;color:#2563eb;',
    tfootL:'padding:.75rem .9rem;border-top:2px solid #2563eb;text-align:right;font-weight:600;font-size:.9rem;color:#374151;',
    note:'font-size:.8rem;color:#6b7280;background:#f9fafb;border-radius:6px;padding:.65rem .9rem;margin-bottom:.85rem;',
    ref:'background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #2563eb;border-radius:8px;padding:.85rem 1rem;font-size:.875rem;color:#1e40af;margin-bottom:1.25rem;',
    refLbl:'font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;display:block;margin-bottom:.3rem;',
    footer:'display:flex;justify-content:space-between;padding-top:.85rem;border-top:1px solid #e5e7eb;font-size:.78rem;color:#9ca3af;',
  };

  function buildInvoiceHTML(org, emps) {
    const plan        = AuthManager.PLANS[org.plan] || AuthManager.PLANS.basic;
    const activeCount = (emps || []).filter(e => e.active).length;
    const now         = new Date();
    const yyyymm      = now.toISOString().slice(0, 7).replace('-', '');
    const invoiceNo   = `INV-${esc(org.inn)}-${yyyymm}`;
    const today       = now.toISOString().slice(0, 10);
    const maxLbl      = plan.maxUsers === -1 ? 'Cheksiz' : plan.maxUsers + ' ta';
    const priceStr    = plan.priceMonthly.toLocaleString('uz-UZ');

    return `<div style="${S.wrap}" id="inv-print-area">
      <div style="${S.header}">
        <div><div style="${S.brandN}">UncertaintyCalc</div><div style="${S.brandS}">ISO/IEC 17025 Noaniqlik kalkulyatori</div></div>
        <div style="${S.titleB}"><div style="${S.title}">Hisob-faktura</div><div style="${S.no}">№ ${invoiceNo}</div><div style="${S.date}">Sana: ${today}</div></div>
      </div>
      <div style="${S.parties}">
        <div style="${S.party}">
          <div style="${S.ptitle}">Sotuvchi</div>
          <div style="${S.pname}">UncertaintyCalc xizmati</div>
          <div style="${S.prow}">Bank: O'zbekiston Milliy Banki</div>
          <div style="${S.prow}">Hisob raqam: 20208000000000000000</div>
          <div style="${S.prow}">MFO: 00912 &nbsp;·&nbsp; STIR: 000000000</div>
        </div>
        <div style="${S.party}">
          <div style="${S.ptitle}">Xaridor</div>
          <div style="${S.pname}">${esc(orgDisplayName(org))}</div>
          <div style="${S.prow}">INN: ${esc(org.inn)}</div>
          <div style="${S.prow}">Tel: ${esc(org.phone)}</div>
        </div>
      </div>
      <table style="${S.table}">
        <thead><tr>
          <th style="${S.th}">#</th><th style="${S.th}">Xizmat nomi</th><th style="${S.th}">Birlik</th>
          <th style="${S.thR}">Miqdor</th><th style="${S.thR}">Narx (so'm)</th><th style="${S.thR}">Jami (so'm)</th>
        </tr></thead>
        <tbody><tr>
          <td style="${S.td}">1</td>
          <td style="${S.td}"><strong>Obuna tarifi — "${esc(plan.name)}"</strong><br>
            <span style="font-size:.8rem;color:#6b7280">Aktiv xodimlar: ${activeCount} ta &nbsp;·&nbsp; Tarif limiti: ${maxLbl}</span></td>
          <td style="${S.td}">oy</td>
          <td style="${S.tdR}">1</td>
          <td style="${S.tdR};font-weight:600">${priceStr}</td>
          <td style="${S.tdR};font-weight:700;color:#2563eb">${priceStr}</td>
        </tr></tbody>
        <tfoot><tr>
          <td colspan="5" style="${S.tfootL}">JAMI TO'LOV:</td>
          <td style="${S.tfootR}">${priceStr} so'm</td>
        </tr></tfoot>
      </table>
      <div style="${S.note}">* Ushbu hisob-faktura QQS kiritilmagan holda taqdim etilgan. To'lovdan keyin buxgalteriya bo'limiga to'lov tasdig'ini yuboring.</div>
      <div style="${S.ref}"><span style="${S.refLbl}">To'lov maqsadi (bank orderida ko'rsating):</span>"${invoiceNo} raqamli hisob-faktura bo'yicha UncertaintyCalc obuna to'lovi"</div>
      <div style="${S.footer}"><span>UncertaintyCalc — ISO/IEC 17025 Noaniqlik kalkulyatori</span><span>Yaratildi: ${today}</span></div>
    </div>`;
  }

  window.UCInvoice = { buildInvoiceHTML, orgDisplayName };
})();
