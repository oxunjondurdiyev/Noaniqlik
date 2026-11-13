/* ═══════════════════════════════════════════════════════════════
   TOAST.JS — qisqa bildirishnomalar (P02, RISKS R-S5)
   Xabar matni FAQAT textContent orqali qo'yiladi — HTML sifatida
   talqin qilinmaydi. Ikonka — statik SVG (foydalanuvchi ma'lumoti emas).
═══════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    success: { stroke: 'var(--success)', parts: [['polyline', { points: '20 6 9 17 4 12' }]] },
    error:   { stroke: 'var(--danger)',  parts: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M15 9l-6 6M9 9l6 6' }]] },
    info:    { stroke: 'var(--accent)',  parts: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 8v4M12 16h.01' }]] },
  };

  function makeIcon(doc, type) {
    const spec = ICONS[type] || ICONS.info;
    const svg = doc.createElementNS(SVG_NS, 'svg');
    const attrs = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: spec.stroke, 'stroke-width': 2 };
    Object.keys(attrs).forEach(k => svg.setAttribute(k, String(attrs[k])));
    spec.parts.forEach(([tag, a]) => {
      const el = doc.createElementNS(SVG_NS, tag);
      Object.keys(a).forEach(k => el.setAttribute(k, String(a[k])));
      svg.appendChild(el);
    });
    return svg;
  }

  function createToast(doc, msg, type, duration) {
    type = ICONS[type] ? type : 'info';
    duration = duration === undefined ? 3000 : duration;

    let container = doc.getElementById('toast-container');
    if (!container) {
      container = doc.createElement('div');
      container.id = 'toast-container';
      doc.body.appendChild(container);
    }
    const toast = doc.createElement('div');
    toast.className = 'toast ' + type;
    toast.appendChild(makeIcon(doc, type));
    const text = doc.createElement('span');
    text.textContent = msg === null || msg === undefined ? '' : String(msg);
    toast.appendChild(text);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'opacity .3s, transform .3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
    return toast;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createToast };
  if (root && root.document) {
    root.showToast = (msg, type, duration) => createToast(root.document, msg, type, duration);
  }
})(typeof window !== 'undefined' ? window : null);
