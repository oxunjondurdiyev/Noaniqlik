/* ═══════════════════════════════════════════════════════════════
   PARSER.JS — o'lchash modeli formulasi: tokenizer → AST → kompilyatsiya,
   simvolik hosila (c_i = ∂f/∂x_i), soddalashtirish. eval ishlatilmaydi.
   Ref: JCGM 100:2008 §4.1.1 (o'lchash modeli Y = f(X1…XN)), §5.1.3 (c_i).
═══════════════════════════════════════════════════════════════ */

// Ref: JCGM 100:2008 §4.1.1 — modeldagi funksiyalar
export const FUNCS = {
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
  ln: Math.log, log: Math.log10, lg: Math.log10, log10: Math.log10,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
};
// Ichki funksiya (faqat hosilada paydo bo'ladi, foydalanuvchi yoza olmaydi): |x| ning hosilasi
const INTERNAL_FUNCS = { sign: Math.sign };
const CONSTS = { pi: Math.PI, 'π': Math.PI };

/** "y = expr" → { symbol: 'y', expr: 'expr' } */
export function splitFormula(text) {
  const src = String(text || '').trim();
  const i = src.indexOf('=');
  if (i === -1) return { symbol: '', expr: src };
  return { symbol: src.slice(0, i).trim(), expr: src.slice(i + 1).trim() };
}

/** Matn → tokenlar. Unicode × · ÷ − ² ³ √ va o'nlik vergul normallashtiriladi. */
export function tokenize(src, params) {
  const s = String(src)
    .replace(/[×·∙⋅]/g, '*').replace(/[÷:]/g, '/').replace(/[−–—]/g, '-')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/(\d),(\d)/g, '$1.$2');
  const byLen = [...params].sort((a, b) => b.length - a.length);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if ('+-*/^()'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    if (ch === '√') { tokens.push({ t: 'func', v: 'sqrt' }); i++; continue; }
    const rest = s.slice(i);
    const num = rest.match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
    if (num) { tokens.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const run = rest.match(/^[^\s+\-*\/^()=.,√0-9][^\s+\-*\/^()=,√]*/);
    const word = run ? run[0] : '';
    if (word && params.includes(word)) { tokens.push({ t: 'var', v: word }); i += word.length; continue; }
    const lw = word.toLowerCase();
    if (word && FUNCS[lw]) { tokens.push({ t: 'func', v: lw }); i += word.length; continue; }
    if (word && CONSTS[lw] !== undefined) { tokens.push({ t: 'num', v: CONSTS[lw] }); i += word.length; continue; }
    const pref = byLen.find(p => rest.startsWith(p));
    if (pref) { tokens.push({ t: 'var', v: pref }); i += pref.length; continue; }
    if (lw === 'e') { tokens.push({ t: 'num', v: Math.E }); i += 1; continue; }
    throw new Error('unknown:' + (word || ch));
  }
  return tokens;
}

/* ─── AST tugunlari ─────────────────────────────────
   {k:'num', v} {k:'var', n} {k:'neg', a}
   {k:'add'|'sub'|'mul'|'div'|'pow', a, b}  {k:'fn', f, a}           */

/** Tokenlar → AST (rekursiv tushish; `^` o'ngdan assotsiativ, funksiya argumenti — birlamchi ifoda). */
export function parse(expr, params) {
  const tokens = tokenize(expr, params);
  if (!tokens.length) throw new Error('empty');
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = v => peek() && peek().t === 'op' && peek().v === v;

  function parseExpr() {
    let left = parseTerm();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].v;
      left = { k: op === '+' ? 'add' : 'sub', a: left, b: parseTerm() };
    }
    return left;
  }
  function parseTerm() {
    let left = parseUnary();
    while (isOp('*') || isOp('/')) {
      const op = tokens[pos++].v;
      left = { k: op === '*' ? 'mul' : 'div', a: left, b: parseUnary() };
    }
    return left;
  }
  function parseUnary() {
    if (isOp('-')) { pos++; return { k: 'neg', a: parseUnary() }; }
    if (isOp('+')) { pos++; return parseUnary(); }
    return parsePower();
  }
  function parsePower() {
    const base = parsePrimary();
    if (isOp('^')) { pos++; return { k: 'pow', a: base, b: parseUnary() }; }
    return base;
  }
  function parsePrimary() {
    const tk = tokens[pos++];
    if (!tk) throw new Error('syntax');
    if (tk.t === 'num') return { k: 'num', v: tk.v };
    if (tk.t === 'var') return { k: 'var', n: tk.v };
    if (tk.t === 'func') return { k: 'fn', f: tk.v, a: parsePrimary() };
    if (tk.t === 'op' && tk.v === '(') {
      const inner = parseExpr();
      if (!isOp(')')) throw new Error('syntax');
      pos++;
      return inner;
    }
    throw new Error('syntax');
  }

  const ast = parseExpr();
  if (pos < tokens.length) throw new Error('syntax');
  return ast;
}

/** AST → f(env) → number. Arifmetik amallar tartibi P00 parseri bilan aynan bir xil. */
export function compileAst(node) {
  switch (node.k) {
    case 'num': { const v = node.v; return () => v; }
    case 'var': { const n = node.n; return e => e[n]; }
    case 'neg': { const u = compileAst(node.a); return e => -u(e); }
    case 'add': { const l = compileAst(node.a), r = compileAst(node.b); return e => l(e) + r(e); }
    case 'sub': { const l = compileAst(node.a), r = compileAst(node.b); return e => l(e) - r(e); }
    case 'mul': { const l = compileAst(node.a), r = compileAst(node.b); return e => l(e) * r(e); }
    case 'div': { const l = compileAst(node.a), r = compileAst(node.b); return e => l(e) / r(e); }
    case 'pow': { const l = compileAst(node.a), r = compileAst(node.b); return e => Math.pow(l(e), r(e)); }
    case 'fn': {
      const fn = FUNCS[node.f] || INTERNAL_FUNCS[node.f], arg = compileAst(node.a);
      return e => fn(arg(e));
    }
    default: throw new Error('ast:' + node.k);
  }
}

/** Ifoda → f(env). (P00 dagi Calc.compile bilan mos API.) */
export function compile(expr, params) {
  return compileAst(parse(expr, params));
}

/** Tugun x ga bog'liqmi */
export function dependsOn(node, x) {
  switch (node.k) {
    case 'num': return false;
    case 'var': return node.n === x;
    case 'neg': case 'fn': return dependsOn(node.a, x);
    default: return dependsOn(node.a, x) || dependsOn(node.b, x);
  }
}

/** Ifodadagi o'zgaruvchilar nomlari */
export function variables(node, out = new Set()) {
  if (node.k === 'var') out.add(node.n);
  else if (node.a) { variables(node.a, out); if (node.b) variables(node.b, out); }
  return out;
}

/* ─── Soddalashtiruvchi konstruktorlar (hosila ifodasi kichik bo'lishi uchun) ─── */
const NUM = v => ({ k: 'num', v });
const isNum = (n, v) => n.k === 'num' && (v === undefined || n.v === v);
export const mk = {
  num: NUM,
  neg(a) { if (isNum(a)) return NUM(-a.v); if (a.k === 'neg') return a.a; return { k: 'neg', a }; },
  add(a, b) {
    if (isNum(a, 0)) return b; if (isNum(b, 0)) return a;
    if (isNum(a) && isNum(b)) return NUM(a.v + b.v);
    return { k: 'add', a, b };
  },
  sub(a, b) {
    if (isNum(b, 0)) return a; if (isNum(a, 0)) return mk.neg(b);
    if (isNum(a) && isNum(b)) return NUM(a.v - b.v);
    return { k: 'sub', a, b };
  },
  mul(a, b) {
    if (isNum(a, 0) || isNum(b, 0)) return NUM(0);
    if (isNum(a, 1)) return b; if (isNum(b, 1)) return a;
    if (isNum(a, -1)) return mk.neg(b); if (isNum(b, -1)) return mk.neg(a);
    if (isNum(a) && isNum(b)) return NUM(a.v * b.v);
    return { k: 'mul', a, b };
  },
  div(a, b) {
    if (isNum(a, 0)) return NUM(0); if (isNum(b, 1)) return a;
    if (isNum(a) && isNum(b) && b.v !== 0) return NUM(a.v / b.v);
    return { k: 'div', a, b };
  },
  pow(a, b) {
    if (isNum(b, 0)) return NUM(1); if (isNum(b, 1)) return a;
    if (isNum(a) && isNum(b)) return NUM(Math.pow(a.v, b.v));
    return { k: 'pow', a, b };
  },
  fn(f, a) { return { k: 'fn', f, a }; },
};

/**
 * Simvolik hosila ∂node/∂x (AST). Ref: JCGM 100:2008 §5.1.3 — c_i = ∂f/∂x_i, x_i da baholanadi.
 * Qoidalar: yig'indi, ko'paytma, bo'linma, daraja (o'zgarmas daraja ko'rsatkichi / o'zgarmas asos / umumiy),
 * zanjir qoidasi elementar funksiyalar uchun.
 */
export function derivative(node, x) {
  if (!dependsOn(node, x)) return NUM(0);
  const d = n => derivative(n, x);
  switch (node.k) {
    case 'var': return NUM(node.n === x ? 1 : 0);
    case 'neg': return mk.neg(d(node.a));
    case 'add': return mk.add(d(node.a), d(node.b));
    case 'sub': return mk.sub(d(node.a), d(node.b));
    case 'mul': return mk.add(mk.mul(d(node.a), node.b), mk.mul(node.a, d(node.b)));
    case 'div': // (u'·v − u·v') / v²
      return mk.div(mk.sub(mk.mul(d(node.a), node.b), mk.mul(node.a, d(node.b))), mk.pow(node.b, NUM(2)));
    case 'pow': {
      const u = node.a, v = node.b;
      if (!dependsOn(v, x)) // v·u^(v−1)·u'
        return mk.mul(mk.mul(v, mk.pow(u, mk.sub(v, NUM(1)))), d(u));
      if (!dependsOn(u, x)) // u^v·ln u·v'
        return mk.mul(mk.mul(node, mk.fn('ln', u)), d(v));
      // u^v·(v'·ln u + v·u'/u)
      return mk.mul(node, mk.add(mk.mul(d(v), mk.fn('ln', u)), mk.div(mk.mul(v, d(u)), u)));
    }
    case 'fn': {
      const u = node.a, du = d(u);
      switch (node.f) {
        case 'sqrt': return mk.div(du, mk.mul(NUM(2), node));
        case 'abs': return mk.mul(mk.fn('sign', u), du);
        case 'exp': return mk.mul(node, du);
        case 'ln': return mk.div(du, u);
        case 'log': case 'lg': case 'log10': return mk.div(du, mk.mul(u, NUM(Math.LN10)));
        case 'sin': return mk.mul(mk.fn('cos', u), du);
        case 'cos': return mk.neg(mk.mul(mk.fn('sin', u), du));
        case 'tan': return mk.div(du, mk.pow(mk.fn('cos', u), NUM(2)));
        case 'asin': return mk.div(du, mk.fn('sqrt', mk.sub(NUM(1), mk.pow(u, NUM(2)))));
        case 'acos': return mk.neg(mk.div(du, mk.fn('sqrt', mk.sub(NUM(1), mk.pow(u, NUM(2))))));
        case 'atan': return mk.div(du, mk.add(NUM(1), mk.pow(u, NUM(2))));
        case 'sign': return NUM(0); // 0 dan tashqari hamma joyda
        default: throw new Error('deriv:' + node.f);
      }
    }
    default: return NUM(0);
  }
}

/** AST → o'qiladigan matn (diagnostika va hisobot uchun). */
export function toText(node) {
  const P = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4 };
  const OPS = { add: ' + ', sub: ' − ', mul: '·', div: '/', pow: '^' };
  const wrap = (n, prec, right) => {
    const s = toText(n);
    const p = P[n.k];
    return p !== undefined && (p < prec || (right && p === prec && n.k !== 'pow')) ? '(' + s + ')' : s;
  };
  switch (node.k) {
    case 'num': return String(node.v);
    case 'var': return node.n;
    case 'neg': return '−' + wrap(node.a, 3);
    case 'fn': return node.f + '(' + toText(node.a) + ')';
    default: return wrap(node.a, P[node.k] + (node.k === 'pow' ? 1 : 0)) + OPS[node.k] + wrap(node.b, P[node.k], true);
  }
}
