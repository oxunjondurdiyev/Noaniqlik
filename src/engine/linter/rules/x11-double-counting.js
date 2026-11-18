/* X11 — top-down: asos (u(R_w) / s_R) allaqachon qamragan omil qo'shimcha hissa sifatida yana qo'shilgan
   (ikki marta hisoblash). P09 da src/engine/topdown/ ning warnings[] da edi — P05a da linterga ko'chirildi.
   Xatti-harakat va egasi qarori (2026-11-17, RISKS R-20) AYNAN saqlangan:
     • hissa hisobda QOLADI (qaror foydalanuvchida), dastur faqat ogohlantiradi;
     • byudjet qatorida flag: 'X11';
     • ogohlantirish bosma hisobotda ham chiqadi, uni yashiradigan parametr yo'q.
   Qaysi omil qamralgani — dvigatelda aniqlanadi (BASE_COVERS + covers[]; budget[].flag); qoida shu belgidan o'qiydi. */
import { finding } from '../util.js';

const rule = {
  id: 'X11',
  severity: 'warning',
  ref: 'Nordtest TR 537 ed. 4 §3.2, 2-qadam B (p. 10): faqat nazorat namunasi qamramagan bosqichlar; QUAM:2012 §7.6.2 d), §7.7.1 (p. 18)',
  modes: ['TOP_DOWN'],
  codes: { x11_double_counting: {} },
  check(spec, result) {
    return (result.budget || []).filter(b => b.flag === 'X11').map(b =>
      finding(rule, 'x11_double_counting', { key: b.id, value: `${b.name || b.id}: ${b.category}` }));
  },
};
export default rule;
