// Extra procedural generators, levelled: each takes (r, lvl) where lvl 1 = easy, 2 = medium, 3 = mastery.
// Returns [question, answer, wrong1, wrong2, wrong3, explanation] like the core generators.
import { GEN } from './generators.js';

const code = (lines) => '\n```\n' + lines.join('\n') + '\n```';
const numVariants = (a) => { const str = String(a); const m = str.match(/-?\d[\d,]*\.?\d*/); if (!m) return []; const n = parseFloat(m[0].replace(/,/g, '')); const fmtN = (x) => (m[0].includes(',') ? Math.round(x).toLocaleString('en-US') : String(Math.round(x * 100) / 100)); return [n * 2, n + 1, n / 2, n - 1, n * 10, n + 2, n * 3, n + 10].filter((x) => x !== n && x >= 0).map((x) => str.replace(m[0], fmtN(x))); };
const uniq3 = (a, cands) => { const s = []; for (const c of [...cands, ...numVariants(a)]) { const v = String(c); if (v !== String(a) && !s.includes(v)) s.push(v); if (s.length === 3) break; } let k = 1; while (s.length < 3) { const v = String(a) + ' (approx.)'.repeat(k++); if (!s.includes(v)) s.push(v); } return s; };
const Q = (q, a, cands, expl) => [q, String(a), ...uniq3(a, cands), expl];
const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => '$' + r2(x).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const WORDS = ['python', 'galaxy', 'rocket', 'planet', 'hakma', 'monster', 'binary', 'kernel', 'cookie', 'banana'];

// ---------------------------------------------------------------- Python
GEN.pyOut = (r, lvl = 1) => {
  if (lvl === 1) {
    const k = r.int(0, 4); const a = r.int(7, 29), b = r.int(2, 6);
    if (k === 0) return Q('What does this print?' + code([`print(${a} // ${b})`]), Math.floor(a / b), [a / b, Math.ceil(a / b), a % b], '// is floor division: it drops the remainder.');
    if (k === 1) return Q('What does this print?' + code([`print(${a} % ${b})`]), a % b, [Math.floor(a / b), b - (a % b), 0], '% gives the remainder.');
    if (k === 2) { const e = r.int(2, 4); return Q('What does this print?' + code([`print(${b} ** ${e})`]), b ** e, [b * e, b ** (e + 1), e ** b], '** is exponentiation.'); }
    if (k === 3) { const w = r.pick(WORDS); return Q('What does this print?' + code([`print(len("${w}"))`]), w.length, [w.length - 1, w.length + 1, w.length * 2], 'len() counts characters.'); }
    const w = r.pick(['ab', 'hi', 'xo']); const n = r.int(2, 4); return Q('What does this print?' + code([`print("${w}" * ${n})`]), w.repeat(n), [w + n, `${w} ${w}`, w.repeat(n - 1)], 'str * int repeats the string.');
  }
  if (lvl === 2) {
    const k = r.int(0, 4); const w = r.pick(WORDS);
    if (k === 0) { const i = r.int(0, 2), j = r.int(i + 2, Math.min(w.length, i + 4)); return Q('What does this print?' + code([`s = "${w}"`, `print(s[${i}:${j}])`]), w.slice(i, j), [w.slice(i, j + 1), w.slice(i + 1, j + 1), w.slice(i + 1, j)], 'Slices include the start index and stop BEFORE the end index.'); }
    if (k === 1) return Q('What does this print?' + code([`s = "${w}"`, 'print(s[-1])']), w[w.length - 1], [w[0], w[w.length - 2], 'IndexError'], 'Negative indexes count from the end.');
    if (k === 2) return Q('What does this print?' + code([`s = "${w}"`, 'print(s[::-1])']), [...w].reverse().join(''), [w, w.slice(1), w.slice(0, -1)], 'A step of -1 reverses the sequence.');
    if (k === 3) { const n = r.int(3, 7); const s = (n * (n - 1)) / 2; return Q('What does this print?' + code([`print(sum(range(${n})))`]), s, [s + n, (n * (n + 1)) / 2 + 1, n], `range(${n}) is 0…${n - 1}; their sum is ${s}.`); }
    const n = r.int(2, 4); return Q('What does this print?' + code([`x = [${Array.from({ length: n }, (_, i) => i + 1).join(', ')}]`, 'x.append([7, 8])', 'print(len(x))']), n + 1, [n + 2, n, 2], 'append adds ONE element — even if that element is a list.');
  }
  const k = r.int(0, 3);
  if (k === 0) { const n = r.int(4, 7); const v = []; for (let i = 0; i < n; i++) if (i % 2 === 0) v.push(i * i); return Q('What does this print?' + code([`print([i * i for i in range(${n}) if i % 2 == 0])`]), `[${v.join(', ')}]`, [`[${v.slice(1).join(', ')}]`, `[${Array.from({ length: n }, (_, i) => i * i).join(', ')}]`, `[${v.map((x) => x + 1).join(', ')}]`], 'The if filters even i, then i*i is computed.'); }
  if (k === 1) return Q('What does this print?' + code(['d = {"a": 1}', 'print(d.get("b", 0) + d["a"])']), 1, ['KeyError', 2, 'None'], 'get() returns the default (0) for a missing key.');
  if (k === 2) return Q('What does this print?' + code(['a = [1, 2]', 'b = a', 'b.append(3)', 'print(a)']), '[1, 2, 3]', ['[1, 2]', '[3]', 'Error'], 'b = a copies the REFERENCE: both names point at one list.');
  return Q('What does this print?' + code(['def f(x, acc=[]):', '    acc.append(x)', '    return len(acc)', 'f(1)', 'print(f(2))']), 2, [1, 0, 'Error'], 'Default arguments are created once — the same list is reused between calls.');
};
// ---------------------------------------------------------------- Java
GEN.javaOut = (r, lvl = 1) => {
  const p = (e) => `System.out.println(${e});`;
  if (lvl === 1) {
    const a = r.int(7, 29), b = r.int(2, 6); const k = r.int(0, 2);
    if (k === 0) return Q('What does this print?' + code([p(`${a} / ${b}`)]), Math.floor(a / b), [r2(a / b), Math.ceil(a / b), a % b], 'int / int is integer division in Java.');
    if (k === 1) return Q('What does this print?' + code([p(`${a} % ${b}`)]), a % b, [Math.floor(a / b), 0, b], '% is the remainder.');
    return Q('What does this print?' + code([p(`${a} / ${b}.0`)]), String(a / b).includes('.') ? String(a / b) : (a / b).toFixed(1), [Math.floor(a / b), Math.ceil(a / b), a % b], 'With a double operand, Java does floating-point division.');
  }
  if (lvl === 2) {
    const k = r.int(0, 2); const a = r.int(1, 5), b = r.int(1, 5);
    if (k === 0) return Q('What does this print?' + code([p(`"x" + ${a} + ${b}`)]), `x${a}${b}`, [`x${a + b}`, `${a + b}x`, 'Error'], 'Left to right: "x" + 1 makes a String, then + 2 concatenates.');
    if (k === 1) return Q('What does this print?' + code([p(`${a} + ${b} + "x"`)]), `${a + b}x`, [`${a}${b}x`, `x${a + b}`, 'Error'], 'Left to right: the ints add first, then the String is appended.');
    const w = r.pick(WORDS); const i = r.int(0, 2), j = r.int(i + 2, i + 3); return Q('What does this print?' + code([p(`"${w}".substring(${i}, ${j})`)]), w.slice(i, j), [w.slice(i, j + 1), w.slice(i + 1, j + 1), w.slice(i, j - 1) || '""'], 'substring(begin, end) excludes the end index.');
  }
  const k = r.int(0, 2);
  if (k === 0) { const x = r.int(2, 6); return Q('What does this print?' + code([`int x = ${x};`, 'int y = x++;', p('x + " " + y')]), `${x + 1} ${x}`, [`${x} ${x}`, `${x + 1} ${x + 1}`, `${x} ${x + 1}`], 'x++ returns the OLD value, then increments.'); }
  if (k === 1) return Q('What does this print?' + code(['String a = new String("hi");', 'String b = new String("hi");', p('(a == b) + " " + a.equals(b)')]), 'false true', ['true true', 'true false', 'false false'], '== compares references; equals compares content.');
  return Q('What does this print?' + code(['List<Integer> xs = List.of(1, 2, 3, 4);', p('xs.stream().filter(n -> n % 2 == 0).mapToInt(n -> n).sum()')]), 6, [10, 4, 2], 'filter keeps 2 and 4; their sum is 6.');
};
// ---------------------------------------------------------------- Go
GEN.goOut = (r, lvl = 1) => {
  const p = (e) => `fmt.Println(${e})`;
  if (lvl === 1) {
    const a = r.int(7, 29), b = r.int(2, 6); const k = r.int(0, 2);
    if (k === 0) return Q('What does this print?' + code([p(`${a} / ${b}`)]), Math.floor(a / b), [r2(a / b), Math.ceil(a / b), a % b], 'Integer division truncates in Go.');
    if (k === 1) return Q('What does this print?' + code(['var n int', 'var s string', p('n, s == "")')]), '0 true', ['nil true', '0 false', 'nil false'], 'Every type has a zero value: 0 for ints, "" for strings.');
    const w = r.pick(WORDS); return Q('What does this print?' + code([p(`len("${w}")`)]), w.length, [w.length - 1, w.length + 1, 0], 'len of a string counts bytes (ASCII letters are 1 byte each).');
  }
  if (lvl === 2) {
    const k = r.int(0, 2); const n = r.int(5, 7); const arr = Array.from({ length: n }, (_, i) => (i + 1) * 10); const i = r.int(0, 2), j = r.int(i + 1, i + 3);
    if (k === 0) return Q('What does this print?' + code([`s := []int{${arr.join(', ')}}`, p(`s[${i}:${j}]`)]), `[${arr.slice(i, j).join(' ')}]`, [`[${arr.slice(i, j + 1).join(' ')}]`, `[${arr.slice(i + 1, j + 1).join(' ')}]`, `[${arr.slice(i, j).join(', ')}]`], 'Slicing is half-open: s[low:high] excludes high. Go prints slices with spaces.');
    if (k === 1) return Q('What does this print?' + code(['m := map[string]int{"a": 1}', 'v, ok := m["b"]', p('v, ok')]), '0 false', ['nil false', '0 true', 'panic'], 'A missing key gives the zero value, and ok reports false.');
    return Q('What does this print?' + code(['s := make([]int, 2, 5)', p('len(s), cap(s)')]), '2 5', ['5 5', '2 2', '0 5'], 'make([]T, len, cap).');
  }
  const k = r.int(0, 2);
  if (k === 0) return Q('What does this print?' + code(['for i := 0; i < 3; i++ {', '    defer fmt.Print(i)', '}']), '210', ['012', '333', '222'], 'Deferred calls run last-in, first-out; i is evaluated when defer runs the statement.');
  if (k === 1) return Q('What does this print?' + code([p('len("héllo")')]), 6, [5, 4, 7], 'é is 2 bytes in UTF-8; len counts bytes. Use utf8.RuneCountInString for characters.');
  return Q('What does this print?' + code(['a := []int{1, 2, 3}', 'b := a', 'b[0] = 9', p('a[0]')]), 9, [1, 0, 'panic'], 'Slices share the same backing array.');
};
// ---------------------------------------------------------------- CS fundamentals
GEN.binary = (r, lvl = 1) => {
  if (lvl === 1) { const n = r.int(2, 31); return Q(`Write ${n} in binary.`, n.toString(2), [(n + 1).toString(2), (n - 1).toString(2), (n ^ 2).toString(2) === n.toString(2) ? (n + 2).toString(2) : (n ^ 2).toString(2)], `${n} = ${n.toString(2)}₂ (sum of powers of 2).`); }
  if (lvl === 2) { const n = r.int(17, 255); return Q(`What is 0x${n.toString(16).toUpperCase()} in decimal?`, n, [n + 16, n - 1, parseInt(n.toString(16).split('').reverse().join(''), 16)], 'Each hex digit is 4 bits: multiply by powers of 16.'); }
  const k = r.int(0, 1);
  if (k === 0) { const n = r.pick([16, 32, 64, 128, 256, 1024, 4096, 1e6]); const steps = Math.ceil(Math.log2(n)); return Q(`Binary search on a sorted array of ${n.toLocaleString()} items needs at most about how many comparisons?`, steps, [steps * 2, Math.round(n / 2), Math.round(Math.sqrt(n))], 'log₂(n) — each step halves the search space.'); }
  const n = r.int(1, 127); return Q(`In 8-bit two's complement, what is -${n}?`, ((256 - n) >>> 0).toString(2).padStart(8, '0'), [n.toString(2).padStart(8, '0'), ((255 - n) >>> 0).toString(2).padStart(8, '0'), ('1' + n.toString(2).padStart(7, '0'))], "Invert all bits of n, then add 1.");
};
GEN.bigO = (r, lvl = 1) => {
  const L1 = [['for i in range(n):\n    total += i', 'O(n)'], ['x = arr[5]', 'O(1)'], ['for i in range(n):\n    for j in range(n):\n        count += 1', 'O(n²)'], ['i = n\nwhile i > 1:\n    i //= 2', 'O(log n)']];
  const L3 = [['for i in range(n):\n    j = 1\n    while j < n:\n        j *= 2', 'O(n log n)'], ['for i in range(n):\n    for j in range(i):\n        pass', 'O(n²)'], ['def f(n):\n    if n <= 1: return 1\n    return f(n-1) + f(n-1)', 'O(2ⁿ)'], ['for i in range(n):\n    for j in range(10):\n        pass', 'O(n)']];
  const [c, a] = r.pick(lvl >= 3 ? L3 : lvl === 2 ? [...L1, ...L3.slice(0, 2)] : L1);
  return Q('What is the time complexity?' + code(c.split('\n')), a, ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'].filter((x) => x !== a).sort(() => r() - 0.5), 'Count how many times the innermost line runs as n grows.');
};
// ---------------------------------------------------------------- Kubernetes / DevOps / SRE
GEN.k8sUnits = (r, lvl = 1) => {
  if (lvl === 1) { const m = r.pick([100, 250, 500, 750, 1500, 2000]); return Q(`A container requests cpu: "${m}m". How many CPU cores is that?`, m / 1000, [m / 100, m, m / 10000], 'm = millicores: 1000m = 1 core.'); }
  if (lvl === 2) { const mi = r.pick([128, 256, 512, 1024]); return Q(`memory: "${mi}Mi" is how many bytes?`, (mi * 1048576).toLocaleString('en-US'), [(mi * 1000000).toLocaleString('en-US'), (mi * 1024).toLocaleString('en-US'), (mi * 1000).toLocaleString('en-US')], 'Mi = mebibyte = 1,048,576 bytes (M would be 1,000,000).'); }
  const cur = r.int(2, 6), util = r.pick([90, 120, 150, 200]), tgt = r.pick([50, 60, 75]); const want = Math.ceil(cur * (util / tgt));
  return Q(`HPA: ${cur} replicas at ${util}% CPU, target ${tgt}%. Desired replicas?`, want, [want + 1, Math.max(1, want - 1), cur], 'desired = ceil(current × currentUtil / targetUtil).');
};
GEN.sloBudget = (r, lvl = 1) => {
  if (lvl === 1) { const code = r.pick([[200, '2xx success'], [404, '4xx client error'], [500, '5xx server error'], [301, '3xx redirect'], [503, '5xx server error'], [401, '4xx client error']]); return Q(`HTTP ${code[0]} is a…`, code[1], ['2xx success', '3xx redirect', '4xx client error', '5xx server error'].filter((x) => x !== code[1]), '1xx info · 2xx success · 3xx redirect · 4xx client error · 5xx server error.'); }
  const slo = r.pick([99, 99.5, 99.9, 99.95, 99.99]); const days = 30; const min = r2(((100 - slo) / 100) * days * 24 * 60);
  if (lvl === 2) return Q(`SLO ${slo}% over ${days} days. Error budget in minutes?`, min, [r2(min * 10), r2(min / 10), r2(min * 2)], `(1 − ${slo}%) × 30 × 24 × 60 min.`);
  const used = r.pick([25, 50, 75]); return Q(`SLO ${slo}% (30 days). An outage used ${r2((min * used) / 100)} minutes. What % of the error budget is left?`, `${100 - used}%`, [`${used}%`, `${100 - used / 2}%`, '0%'], `Budget = ${min} min; ${used}% used.`);
};
// ---------------------------------------------------------------- Electrical
GEN.elecPower = (r, lvl = 1) => {
  if (lvl === 1) { const v = r.pick([12, 24, 120, 240]), i = r.int(1, 10); return Q(`A load draws ${i} A at ${v} V. Power?`, `${v * i} W`, [`${v + i} W`, `${r2(v / i)} W`, `${v * i * 2} W`], 'P = V × I.'); }
  if (lvl === 2) { const i = r.int(2, 6), R = r.int(2, 20); return Q(`${i} A flows through ${R} Ω. Power dissipated?`, `${i * i * R} W`, [`${i * R} W`, `${i * R * 2} W`, `${r2(R / i)} W`], 'P = I²R.'); }
  const w = r.pick([60, 100, 1500, 2000]), h = r.int(2, 10), c = r.pick([0.1, 0.13, 0.15]); const cost = r2((w / 1000) * h * c);
  return Q(`A ${w} W device runs ${h} h at $${c}/kWh. Cost?`, money(cost), [money(cost * 10), money(cost / 10), money(w * h * c)], 'kWh = W ÷ 1000 × hours; cost = kWh × rate.');
};
GEN.resistors = (r, lvl = 1) => {
  const a = r.pick([2, 3, 4, 6, 10, 12, 20]), b = r.pick([2, 3, 4, 6, 10, 12, 20]);
  if (lvl === 1) { const c = r.pick([5, 10, 15]); return Q(`Series resistors: ${a} Ω, ${b} Ω, ${c} Ω. Total?`, `${a + b + c} Ω`, [`${r2(1 / (1 / a + 1 / b + 1 / c))} Ω`, `${a * b * c} Ω`, `${Math.max(a, b, c)} Ω`], 'Series resistances add.'); }
  if (lvl === 2) { const p = r2((a * b) / (a + b)); return Q(`Parallel resistors: ${a} Ω and ${b} Ω. Total?`, `${p} Ω`, [`${a + b} Ω`, `${r2((a + b) / 2)} Ω`, `${Math.min(a, b)} Ω`], 'Two in parallel: (R1 × R2) / (R1 + R2) — always less than the smallest.'); }
  const vin = r.pick([5, 9, 12, 24]); const out = r2((vin * b) / (a + b)); return Q(`Voltage divider: Vin = ${vin} V, R1 = ${a} kΩ (top), R2 = ${b} kΩ (bottom). Vout?`, `${out} V`, [`${r2((vin * a) / (a + b))} V`, `${vin} V`, `${r2(vin / 2)} V`], 'Vout = Vin × R2 / (R1 + R2).');
};
GEN.rcTau = (r, lvl = 2) => { const R = r.pick([1, 2, 4.7, 10]), C = r.pick([10, 47, 100, 220]); const tau = r2(R * C); return Q(`R = ${R} kΩ, C = ${C} µF. Time constant τ?`, `${tau} ms`, [`${r2(tau * 1000)} ms`, `${r2(tau / 10)} ms`, `${r2(R + C)} ms`], 'τ = R × C; kΩ × µF = ms. After 5τ the capacitor is ~fully charged.'); };
// ---------------------------------------------------------------- Automotive
GEN.autoMath = (r, lvl = 1) => {
  if (lvl === 1) { const l = r.int(30, 60), km = r.pick([400, 500, 600, 750]); const v = r2((l / km) * 100); return Q(`A car used ${l} L of fuel to drive ${km} km. Consumption in L/100 km?`, v, [r2(km / l), r2(v * 2), r2(l / 10)], 'L/100 km = litres ÷ km × 100. Lower is better.'); }
  if (lvl === 2) { const drive = r.pick([12, 15, 20]), driven = r.pick([36, 45, 60]); const g = r2(driven / drive); return Q(`A ${drive}-tooth gear drives a ${driven}-tooth gear. Gear ratio?`, `${g}:1`, [`${r2(drive / driven)}:1`, `${driven - drive}:1`, `${g * 2}:1`], 'Ratio = driven teeth ÷ driving teeth. Higher ratio = more torque, less speed.'); }
  const k = r.int(0, 1);
  if (k === 0) { const cyl = r.pick([4, 6, 8]), per = r.pick([400, 500, 625]); const tot = cyl * per; return Q(`An engine has ${cyl} cylinders of ${per} cc each. Displacement in litres?`, `${tot / 1000} L`, [`${per / 1000} L`, `${(tot * 2) / 1000} L`, `${cyl} L`], 'Total displacement = cylinders × per-cylinder volume.'); }
  const kwh = r.pick([60, 75, 82]), use = r.pick([15, 17, 20]); const range = Math.round((kwh / use) * 100); return Q(`An EV has a ${kwh} kWh usable battery and uses ${use} kWh/100 km. Range?`, `${range} km`, [`${kwh * use} km`, `${Math.round(range / 2)} km`, `${Math.round((use / kwh) * 100)} km`], 'Range = battery ÷ consumption × 100.');
};
// ---------------------------------------------------------------- Finance (Canada-flavoured, simplified)
GEN.finMath = (r, lvl = 1) => {
  if (lvl === 1) {
    const k = r.int(0, 2);
    if (k === 0) { const inc = r.pick([2000, 2500, 3000, 4000]); return Q(`50/30/20 rule: net income ${money(inc)}/month. How much for savings & debt?`, money(inc * 0.2), [money(inc * 0.3), money(inc * 0.5), money(inc * 0.1)], '50% needs, 30% wants, 20% savings/debt.'); }
    if (k === 1) { const p = r.pick([20, 40, 80, 150]); return Q(`An item costs ${money(p)} before 13% HST (Ontario). Total?`, money(p * 1.13), [money(p * 1.05), money(p + 13), money(p * 1.3)], 'Total = price × 1.13.'); }
    const rate = r.pick([4, 6, 8, 9, 12]); return Q(`Rule of 72: at ${rate}% a year, money doubles in about…`, `${r2(72 / rate)} years`, [`${rate * 2} years`, `${r2(100 / rate)} years`, `${72 - rate} years`], 'Years to double ≈ 72 ÷ rate.');
  }
  if (lvl === 2) {
    const k = r.int(0, 2);
    if (k === 0) { const P = r.pick([1000, 2000, 5000]), rate = r.pick([3, 4, 5]), y = r.int(2, 4); return Q(`${money(P)} at ${rate}% simple interest for ${y} years earns how much interest?`, money((P * rate * y) / 100), [money((P * rate) / 100), money(P * ((1 + rate / 100) ** y - 1)), money((P * rate * y) / 10)], 'Simple interest = P × r × t.'); }
    if (k === 1) { const fixed = r.pick([3000, 6000, 12000]), price = r.pick([25, 40, 50]), varc = r.pick([10, 15]); const be = Math.ceil(fixed / (price - varc)); return Q(`Fixed costs ${money(fixed)}, price ${money(price)}, variable cost ${money(varc)} per unit. Break-even units?`, be, [Math.ceil(fixed / price), be * 2, Math.ceil(fixed / varc)], 'Break-even = fixed ÷ (price − variable cost).'); }
    const rev = r.pick([50000, 80000, 120000]), cost = Math.round(rev * r.pick([0.6, 0.75, 0.9])); return Q(`Revenue ${money(rev)}, total costs ${money(cost)}. Profit margin?`, `${Math.round(((rev - cost) / rev) * 100)}%`, [`${Math.round(((rev - cost) / cost) * 100)}%`, `${Math.round((cost / rev) * 100)}%`, `${Math.round(((rev - cost) / rev) * 50)}%`], 'Margin = profit ÷ revenue.');
  }
  const k = r.int(0, 1);
  if (k === 0) { const P = r.pick([1000, 5000, 10000]), rate = r.pick([5, 6, 7]), y = r.pick([10, 20]); const fv = P * (1 + rate / 100) ** y; return Q(`${money(P)} grows at ${rate}% compounded yearly for ${y} years. Value (nearest $)?`, '$' + Math.round(fv).toLocaleString('en-CA'), ['$' + Math.round(P * (1 + (rate * y) / 100)).toLocaleString('en-CA'), '$' + Math.round(fv * 1.2).toLocaleString('en-CA'), '$' + Math.round(P * rate * y).toLocaleString('en-CA')], 'FV = P × (1 + r)ⁿ — compounding beats simple interest.'); }
  const inc = r.pick([60000, 80000, 100000]); const b = 55000, lo = 0.15, hi = 0.205; const tax = b * lo + (inc - b) * hi;
  return Q(`Illustrative brackets: 15% on the first $55,000, 20.5% above. Tax on ${money(inc)}?`, money(tax), [money(inc * hi), money(inc * lo), money(b * lo)], `Marginal tax: 15% × 55,000 + 20.5% × ${inc - b}. Average rate = ${r2((tax / inc) * 100)}%.`);
};
// ---------------------------------------------------------------- Physics & Chemistry
GEN.physMix = (r, lvl = 1) => {
  if (lvl === 1) { const m = r.int(2, 20), h = r.int(2, 10); return Q(`A ${m} kg box is lifted ${h} m (g = 9.8 m/s²). Potential energy gained?`, `${r2(m * 9.8 * h)} J`, [`${m * h} J`, `${r2(m * 9.8)} J`, `${r2(0.5 * m * h * h)} J`], 'PE = m g h.'); }
  if (lvl === 2) { const f = r.pick([100, 200, 440, 500]), l = r.pick([0.5, 1, 2, 0.75]); return Q(`A wave has frequency ${f} Hz and wavelength ${l} m. Speed?`, `${r2(f * l)} m/s`, [`${r2(f / l)} m/s`, `${r2(l / f)} m/s`, `${f + l} m/s`], 'v = f λ.'); }
  const m1 = r.int(1, 5), v1 = r.int(2, 8), m2 = r.int(1, 5); const v = r2((m1 * v1) / (m1 + m2)); return Q(`A ${m1} kg cart at ${v1} m/s sticks to a resting ${m2} kg cart. Final speed?`, `${v} m/s`, [`${v1} m/s`, `${r2(v1 / 2)} m/s`, `${r2((m1 * v1) / m2)} m/s`], 'Momentum is conserved: m1v1 = (m1 + m2)v.');
};
const ELEMENTS = [['H', 1, 1], ['He', 2, 4], ['C', 6, 12], ['N', 7, 14], ['O', 8, 16], ['Na', 11, 23], ['Mg', 12, 24], ['Al', 13, 27], ['Cl', 17, 35], ['K', 19, 39], ['Ca', 20, 40], ['Fe', 26, 56]];
GEN.chemMix = (r, lvl = 1) => {
  if (lvl === 1) { const [s, z, A] = r.pick(ELEMENTS); return Q(`${s} has atomic number ${z} and mass number ${A}. Neutrons?`, A - z, [z, A, A + z], 'Neutrons = mass number − atomic number.'); }
  if (lvl === 2) { const [f, m] = r.pick([['H₂O', 18], ['CO₂', 44], ['NaCl', 58.5], ['CH₄', 16], ['NH₃', 17], ['O₂', 32], ['CaCO₃', 100]]); return Q(`Molar mass of ${f}? (H 1, C 12, N 14, O 16, Na 23, Cl 35.5, Ca 40)`, `${m} g/mol`, [`${m + 16} g/mol`, `${m - 2} g/mol`, `${m * 2} g/mol`], 'Add the atomic masses of every atom in the formula.'); }
  const k = r.int(0, 1);
  if (k === 0) { const p = r.int(1, 13); return Q(`[H⁺] = 1 × 10⁻${p} mol/L. pH?`, p, [14 - p, p + 1, -p], `pH = −log[H⁺] = ${p}. ${p < 7 ? 'Acidic' : p > 7 ? 'Basic' : 'Neutral'}.`); }
  const M1 = r.pick([2, 4, 6]), V1 = r.pick([50, 100, 250]), V2 = V1 * r.pick([2, 4, 5]); return Q(`Dilute ${V1} mL of ${M1} M solution to ${V2} mL. New concentration?`, `${r2((M1 * V1) / V2)} M`, [`${r2((M1 * V2) / V1)} M`, `${M1} M`, `${r2(M1 / 2)} M`], 'M1V1 = M2V2.');
};
// ---------------------------------------------------------------- Networking & security
const ip = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
GEN.subnet = (r, lvl = 1) => {
  if (lvl === 1) { const p = r.pick([24, 25, 26, 27, 28, 29, 30]); const h = 2 ** (32 - p) - 2; return Q(`How many usable hosts in a /${p} subnet?`, h, [h + 2, 2 ** (32 - p), h / 2], `2^(32 − ${p}) − 2 (network and broadcast are reserved).`); }
  if (lvl === 2) { const p = r.pick([25, 26, 27, 28, 29, 30, 23, 22]); const mask = (0xffffffff << (32 - p)) >>> 0; return Q(`Subnet mask for /${p}?`, ip(mask), [ip((mask << 1) >>> 0), ip(((mask >>> 1) | 0x80000000) >>> 0), ip((mask << 2) >>> 0)], `${p} one-bits followed by zeros.`); }
  const p = r.pick([26, 27, 28, 29]); const size = 2 ** (32 - p); const base = (192 << 24 | 168 << 16 | r.int(0, 20) << 8) >>> 0; const host = base + r.int(1, 254); const net = Math.floor(host / size) * size;
  return r() < 0.5 ? Q(`Network address of ${ip(host)}/${p}?`, ip(net), [ip(net + size), ip(Math.max(base, net - size)), ip(host & 0xffffff00)], `Blocks of ${size}: round down to a multiple of ${size}.`)
    : Q(`Broadcast address of ${ip(host)}/${p}?`, ip(net + size - 1), [ip(net), ip(net + size), ip(net + size - 2)], `Last address of the ${size}-address block.`);
};
const PORTS = [[20, 'FTP data'], [21, 'FTP'], [22, 'SSH'], [23, 'Telnet'], [25, 'SMTP'], [53, 'DNS'], [67, 'DHCP'], [80, 'HTTP'], [110, 'POP3'], [143, 'IMAP'], [443, 'HTTPS'], [3389, 'RDP'], [3306, 'MySQL'], [5432, 'PostgreSQL'], [161, 'SNMP'], [123, 'NTP']];
GEN.ports = (r, lvl = 1) => {
  const pool = lvl === 1 ? PORTS.filter(([p]) => [22, 25, 53, 80, 443, 21].includes(p)) : PORTS; const [p, s] = r.pick(pool); const others = pool.filter((x) => x[0] !== p);
  const pick3 = () => { const o = []; while (o.length < 3) { const c = r.pick(others); if (!o.includes(c)) o.push(c); } return o; };
  return r() < 0.5 ? Q(`Which service uses port ${p} by default?`, s, pick3().map((x) => x[1]), `${s} → ${p}.`) : Q(`Default port for ${s}?`, p, pick3().map((x) => x[0]), `${s} → ${p}.`);
};
GEN.passEntropy = (r, lvl = 1) => {
  if (lvl === 1) { const n = r.pick([4, 6, 8]); return Q(`A PIN of ${n} digits has how many possible combinations?`, (10 ** n).toLocaleString('en-US'), [(10 * n).toLocaleString('en-US'), (n ** 10).toLocaleString('en-US'), (2 ** n).toLocaleString('en-US')], 'Each digit has 10 options: 10ⁿ.'); }
  if (lvl === 2) { const len = r.pick([8, 10, 12, 16]), set = r.pick([[26, 'lowercase letters'], [62, 'letters and digits'], [95, 'all printable characters']]); const bits = Math.round(len * Math.log2(set[0])); return Q(`About how many bits of entropy in a random ${len}-character password from ${set[0]} ${set[1]}?`, `${bits} bits`, [`${len} bits`, `${set[0]} bits`, `${Math.round(bits / 2)} bits`], `${len} × log₂(${set[0]}) ≈ ${bits}. Each extra bit doubles the guesses.`); }
  const words = r.pick([4, 5, 6]); const bits = Math.round(words * Math.log2(7776)); return Q(`A passphrase of ${words} random words from a 7,776-word list has about…`, `${bits} bits of entropy`, [`${words * 8} bits of entropy`, `${Math.round(bits / 3)} bits of entropy`, `${7776 * words} bits of entropy`], `log₂(7776) ≈ 12.9 bits per word — long passphrases are strong AND memorable.`);
};
GEN.cryptoMath = (r, lvl = 1) => {
  if (lvl === 1) { const w = r.pick(['HELLO', 'CYBER', 'ATTACK', 'SECRET', 'KEY']), k = r.int(1, 5); const sh = (s, n) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + n + 26) % 26) + 65)); return Q(`Caesar cipher, shift ${k}: encrypt "${w}".`, sh(w, k), [sh(w, k + 1), sh(w, -k), sh(w, k - 1) === w ? sh(w, k + 2) : sh(w, k - 1)], 'Shift every letter forward — trivially breakable, which is why we use modern ciphers.'); }
  if (lvl === 2) { const b = r.pick([1, 2, 3, 4, 8]); return Q(`A hex string of ${b * 2} characters represents how many bytes?`, b, [b * 2, b * 4, b * 8], 'Each byte = 2 hex digits.'); }
  const k = r.pick([56, 64, 128, 256]); return Q(`A ${k}-bit key has how many possible values?`, `2^${k}`, [`${k}²`, `${k} × 2`, `2^${k / 2}`], 'Each extra bit doubles the keyspace; AES-128/256 are infeasible to brute force.');
};
// ---------------------------------------------------------------- Trading (education only)
GEN.tradeMath = (r, lvl = 1) => {
  if (lvl === 1) { const k = r.int(0, 1);
    if (k === 0) { const b = r.pick([10, 25, 48, 100]), c = r.pick([0.01, 0.02, 0.05, 0.1]); const a = r2(b + c); return Q(`Bid $${b.toFixed(2)}, ask $${a.toFixed(2)}. Spread?`, `$${c.toFixed(2)}`, [`$${(c * 10).toFixed(2)}`, `$${a.toFixed(2)}`, `$${(c / 2).toFixed(3)}`], 'Spread = ask − bid.'); }
    const buy = r.int(20, 80), sell = buy + r.pick([-5, -3, 2, 4, 6]), n = r.pick([50, 100, 200]); const pl = (sell - buy) * n; return Q(`Buy ${n} shares at $${buy}, sell at $${sell}. Profit/loss (before fees)?`, `${pl < 0 ? '−' : ''}$${Math.abs(pl)}`, [`${pl < 0 ? '' : '−'}$${Math.abs(pl)}`, `$${Math.abs(sell - buy)}`, `$${Math.abs(pl) * 2}`], '(sell − buy) × shares.'); }
  if (lvl === 2) { const k = r.int(0, 2);
    if (k === 0) { const price = r.pick([30, 45, 60, 90, 120]), eps = r.pick([1.5, 2, 3, 4, 6]); return Q(`Price $${price}, EPS $${eps}. P/E ratio?`, r2(price / eps), [r2(eps / price * 100), price * eps, r2(price / eps / 2)], 'P/E = price ÷ earnings per share.'); }
    if (k === 1) { const xs = Array.from({ length: 5 }, () => r.int(20, 30)); const avg = r2(xs.reduce((a, b) => a + b, 0) / 5); return Q(`Closes: ${xs.join(', ')}. 5-day simple moving average?`, avg, [Math.max(...xs), xs[4], r2(avg + 1)], 'Sum ÷ 5.'); }
    const loss = r.pick([20, 25, 33, 50]); const need = r2((loss / (100 - loss)) * 100); return Q(`After a ${loss}% loss, what % gain gets you back to even?`, `${need}%`, [`${loss}%`, `${r2(need / 2)}%`, `${loss * 3}%`], 'Losses need bigger gains to recover: L ÷ (100 − L).'); }
  const k = r.int(0, 1);
  if (k === 0) { const acct = r.pick([5000, 10000, 20000, 50000]), risk = r.pick([0.5, 1, 2]), entry = r.pick([20, 40, 50, 80]), stopGap = r.pick([0.5, 1, 2, 4]); const sh = Math.floor((acct * risk / 100) / stopGap); return Q(`Account $${acct.toLocaleString()}, risk ${risk}%, entry $${entry}, stop $${entry - stopGap}. Max shares?`, sh, [Math.floor(acct / entry), sh * 2, Math.floor(sh / 2)], `Risk $${acct * risk / 100} ÷ $${stopGap} per share.`); }
  const w = r.pick([30, 40, 50, 60]), aw = r.pick([150, 200, 300]), al = r.pick([100, 150]); const ex = r2(w / 100 * aw - (100 - w) / 100 * al); return Q(`Win rate ${w}%, average win $${aw}, average loss $${al}. Expectancy per trade?`, `${ex < 0 ? '−' : '+'}$${Math.abs(ex)}`, [`${ex < 0 ? '+' : '−'}$${Math.abs(ex)}`, `+$${aw - al}`, `+$${r2(w / 100 * aw)}`], 'win% × avg win − loss% × avg loss.');
};
