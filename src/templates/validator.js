/* ═══════════════════════════════════════════════════════════════
   VALIDATOR.JS — JSON Schema (draft-07) ning kichik qismini tekshiruvchi.
   Tashqi kutubxonasiz (PLAN P04). Faqat schemas/methodology.schema.json da
   ishlatilgan kalit so'zlar qo'llab-quvvatlanadi:
     type, enum, const, required, properties, additionalProperties,
     patternProperties, items, minItems, maxItems, uniqueItems, minLength,
     maxLength, pattern, minimum, maximum, exclusiveMinimum, anyOf, oneOf,
     allOf, if/then, $ref ("#/definitions/…").
   Noma'lum kalit so'z uchrasa — xato (sxema validatordan oshib ketmasin).
   Sof modul: DOM, brauzer xotirasi va global brauzer obyektiga bog'liq emas.
═══════════════════════════════════════════════════════════════ */

const KNOWN = new Set([
  '$schema', '$id', '$comment', 'title', 'description', 'default', 'examples', 'definitions',
  'type', 'enum', 'const', 'required', 'properties', 'additionalProperties', 'patternProperties',
  'items', 'minItems', 'maxItems', 'uniqueItems', 'minLength', 'maxLength', 'pattern',
  'minimum', 'maximum', 'exclusiveMinimum', 'anyOf', 'oneOf', 'allOf', 'if', 'then', '$ref',
]);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function typeMatches(v, t) {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error('unsupported $ref: ' + ref);
  return ref.slice(2).split('/').reduce((node, key) => {
    if (!node || !own(node, key)) throw new Error('unresolved $ref: ' + ref);
    return node[key];
  }, root);
}

/**
 * @param {object} schema  JSON Schema (draft-07 kichik qismi)
 * @param {*} data
 * @returns {{valid:boolean, errors:{path:string, message:string}[]}}
 */
export function validate(schema, data) {
  const errors = [];
  check(schema, data, '$', schema, errors);
  return { valid: errors.length === 0, errors };
}

function check(s, v, path, root, errors) {
  if (s === true) return;
  if (s === false) { errors.push({ path, message: 'not allowed' }); return; }
  for (const k of Object.keys(s)) if (!KNOWN.has(k)) throw new Error(`schema keyword not supported: ${k} (${path})`);

  if (s.$ref) { check(resolveRef(root, s.$ref), v, path, root, errors); return; }

  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some(t => typeMatches(v, t))) {
      errors.push({ path, message: `type ${typeOf(v)}, expected ${types.join('|')}` });
      return;
    }
  }
  if (s.enum && !s.enum.some(e => deepEqual(e, v))) errors.push({ path, message: `not in enum [${s.enum.join(', ')}]` });
  if (own(s, 'const') && !deepEqual(s.const, v)) errors.push({ path, message: `must equal ${JSON.stringify(s.const)}` });

  if (typeof v === 'string') {
    if (s.minLength !== undefined && [...v].length < s.minLength) errors.push({ path, message: `shorter than ${s.minLength}` });
    if (s.maxLength !== undefined && [...v].length > s.maxLength) errors.push({ path, message: `longer than ${s.maxLength}` });
    if (s.pattern && !new RegExp(s.pattern, 'u').test(v)) errors.push({ path, message: `does not match ${s.pattern}` });
  }
  if (typeof v === 'number') {
    if (s.minimum !== undefined && v < s.minimum) errors.push({ path, message: `< ${s.minimum}` });
    if (s.maximum !== undefined && v > s.maximum) errors.push({ path, message: `> ${s.maximum}` });
    if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) errors.push({ path, message: `<= ${s.exclusiveMinimum}` });
  }
  if (Array.isArray(v)) {
    if (s.minItems !== undefined && v.length < s.minItems) errors.push({ path, message: `fewer than ${s.minItems} items` });
    if (s.maxItems !== undefined && v.length > s.maxItems) errors.push({ path, message: `more than ${s.maxItems} items` });
    if (s.uniqueItems) {
      const seen = new Set();
      v.forEach((x, i) => { const key = JSON.stringify(x); if (seen.has(key)) errors.push({ path: `${path}[${i}]`, message: 'duplicate item' }); seen.add(key); });
    }
    if (s.items) v.forEach((x, i) => check(s.items, x, `${path}[${i}]`, root, errors));
  }
  if (typeOf(v) === 'object') {
    for (const r of s.required || []) if (!own(v, r)) errors.push({ path, message: `missing required "${r}"` });
    const props = s.properties || {};
    const pats = Object.entries(s.patternProperties || {}).map(([p, sch]) => [new RegExp(p, 'u'), sch]);
    for (const [k, x] of Object.entries(v)) {
      const sub = `${path}.${k}`;
      let matched = false;
      if (own(props, k)) { check(props[k], x, sub, root, errors); matched = true; }
      for (const [re, sch] of pats) if (re.test(k)) { check(sch, x, sub, root, errors); matched = true; }
      if (!matched && s.additionalProperties !== undefined) {
        if (s.additionalProperties === false) errors.push({ path: sub, message: 'additional property not allowed' });
        else check(s.additionalProperties, x, sub, root, errors);
      }
    }
  }

  if (s.allOf) s.allOf.forEach(sub => check(sub, v, path, root, errors));
  if (s.anyOf) {
    const ok = s.anyOf.some(sub => { const e = []; check(sub, v, path, root, e); return e.length === 0; });
    if (!ok) errors.push({ path, message: 'does not match anyOf' });
  }
  if (s.oneOf) {
    const n = s.oneOf.filter(sub => { const e = []; check(sub, v, path, root, e); return e.length === 0; }).length;
    if (n !== 1) errors.push({ path, message: `matches ${n} of oneOf (expected 1)` });
  }
  if (s.if) {
    const e = [];
    check(s.if, v, path, root, e);
    if (e.length === 0 && s.then) check(s.then, v, path, root, errors);
  }
}
