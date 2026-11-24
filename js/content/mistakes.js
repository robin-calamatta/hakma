// "Find the mistake" questions. Code/worked solutions are shown line by line; exactly ONE line is wrong.
//  - MATH_MISTAKES: procedural generators (fresh numbers every time), same shape as GEN in generators.js.
//  - MISTAKES[topic]: hand-written items. { ci, title, code: [lines], bad: lineNumber (1-based), fix }
//    or for language arts { ci, title, parts: [4 chunks of a sentence], bad: index (0-based), fix }.

const ALL_OK = 'No mistake — it\'s all correct';
const numbered = (lines, mark) => { const w = String(lines.length).length; return lines.map((l, i) => `${String(i + 1).padStart(w, ' ')}${mark && mark.has(i) ? '✔' : '│'} ${l}`).join('\n'); };
// Build a question tuple [q, answer, w1, w2, w3, explanation] from lines with a 1-based bad line.
// `fixed` is the fully corrected version; it's shown after answering, with changed lines marked ✔.
export function codeQ(title, lines, bad, fix, fixed) {
  const q = `🔍 Find the mistake — ${title}\n\`\`\`\n${numbered(lines)}\n\`\`\``;
  const others = lines.map((_, i) => i + 1).filter((n) => n !== bad && lines[n - 1].trim() && !/^\s*[})\]]+;?\s*$/.test(lines[n - 1]));
  others.sort((a, b) => Math.abs(a - bad) - Math.abs(b - bad) || a - b); // nearby lines are the most plausible decoys
  const wrong = others.slice(0, 3).map((n) => `Line ${n}`);
  while (wrong.length < 3) wrong.push(ALL_OK);
  let expl = `Line ${bad}: ${fix}`;
  if (fixed && fixed.length) { const orig = new Set(lines.map((l) => l.trim())); const badT = lines[bad - 1].trim(); const changed = new Set(fixed.map((l, i) => (!orig.has(l.trim()) || (l.trim() === badT && i !== bad - 1) ? i : -1)).filter((i) => i >= 0)); expl += `\n✔ Correct version:\n\`\`\`\n${numbered(fixed, changed)}\n\`\`\``; }
  return [q, `Line ${bad}`, ...[...new Set(wrong)].slice(0, 3), expl];
}
export function partsQ(title, parts, bad, fix, fixedSentence) {
  const q = `🔍 Find the mistake — ${title}\n“${parts.join(' ')}”`;
  return [q, parts[bad], ...parts.filter((_, i) => i !== bad).slice(0, 3), `“${parts[bad]}” — ${fix}${fixedSentence ? `\n✔ Correct: *“${fixedSentence}”*` : ''}`];
}
const withLine = (code, bad, rep) => { const out = code.slice(); out.splice(bad - 1, 1, ...[].concat(rep)); return out; };

// ------------------------------------------------------------ procedural maths
// Each builds its lines with L(k): k = which step goes wrong (later steps follow the mistake), L(0) = fully correct.
const pick = (r, a) => a[r.int(0, a.length - 1)];
const sg = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);
const minus = (t) => String(t).replace(/(^|[\s(=/×+−])-(\d)/g, '$1−$2');
const Q = (title, L, k, fix) => { const M = (k) => L(k).map(minus); return codeQ(minus(title), M(k), k, minus(fix), M(0)); };
export const MATH_MISTAKES = {
  mAdd: (r) => {
    const a = r.int(15, 79), b = r.int(15, 89 - a + 10); const ao = a % 10, bo = b % 10, at = Math.floor(a / 10), bt = Math.floor(b / 10);
    const os = ao + bo, d = pick(r, [1, -1]); const k = pick(r, os >= 10 ? [1, 2, 3] : [1, 3]);
    const L = (k) => { const os2 = os + (k === 1 ? d : 0), c2 = os2 >= 10 ? 1 : 0, ts = at + bt + (k === 2 ? 0 : c2);
      return [`Ones: ${ao} + ${bo} = ${os2}${c2 ? ` → write ${os2 % 10}, carry 1` : ''}`, `Tens: ${at} + ${bt}${k !== 2 && c2 ? ' + 1' : ''} = ${ts}`, `Answer: ${ts * 10 + (os2 % 10) + (k === 3 ? 10 : 0)}`]; };
    return Q(`${a} + ${b}`, L, k, k === 1 ? `${ao} + ${bo} = ${os}.` : k === 2 ? 'Forgot to add the carried 1 to the tens.' : 'The tens and ones were put together wrong.');
  },
  mSub: (r) => {
    const a = r.int(41, 95), b = r.int(12, a - 10); const bt = Math.floor(b / 10) * 10, bo = b % 10; const k = pick(r, [1, 2]), d = pick(r, [1, -1]);
    const L = (k) => { const x = a - bt + (k === 1 ? 10 : 0), y = x - bo + (k === 2 ? d : 0); return [`${a} − ${bt} = ${x}`, `${x} − ${bo} = ${y}`, `So ${a} − ${b} = ${y}`]; };
    return Q(`${a} − ${b}`, L, k, k === 1 ? `${a} − ${bt} = ${a - bt}.` : 'The ones were subtracted wrong.');
  },
  mTimes: (r) => {
    const a = r.int(6, 9), b = r.int(6, 9); const k = pick(r, [2, 3, 4]);
    const L = (k) => { const p5 = a * 5 + (k === 2 ? 5 : 0), rest = a * (b - 5) + (k === 3 ? a : 0); return [`${a} × ${b} = ${a} × 5 + ${a} × ${b - 5}`, `${a} × 5 = ${p5}`, `${a} × ${b - 5} = ${rest}`, `${p5} + ${rest} = ${p5 + rest + (k === 4 ? 10 : 0)}`]; };
    return Q(`${a} × ${b} by splitting`, L, k, k === 2 ? `${a} × 5 = ${a * 5}.` : k === 3 ? `${a} × ${b - 5} = ${a * (b - 5)}.` : 'The two parts were added wrong.');
  },
  mDiv: (r) => {
    const d = r.int(3, 9), q = r.int(4, 12), n = d * q; const k = pick(r, [2, 3]);
    const L = (k) => [`Think: ${d} × ? = ${n}`, `${d} × ${q} = ${k === 2 ? n + d : n}`, `So ${n} ÷ ${d} = ${k === 3 ? q + 1 : q}`];
    return Q(`${n} ÷ ${d}`, L, k, k === 2 ? `${d} × ${q} = ${n}.` : `${d} × ${q} = ${n}, so the answer is ${q}.`);
  },
  mFracEq: (r) => {
    const a = r.int(1, 4), b = r.int(a + 1, 6), m = r.int(2, 4); const k = pick(r, [2, 3]);
    const L = (k) => { const top = a * m + (k === 2 ? 1 : 0), bot = k === 3 ? b + m : b * m; return [`Multiply top and bottom by ${m}`, `${a} × ${m} = ${top}`, k === 3 ? `${b} + ${m} = ${bot}` : `${b} × ${m} = ${bot}`, `${a}/${b} = ${top}/${bot}`]; };
    return Q(`make a fraction equal to ${a}/${b}`, L, k, k === 2 ? `${a} × ${m} = ${a * m}.` : 'The bottom must be multiplied too, not added.');
  },
  mPerim: (r) => {
    const l = r.int(4, 15), w = r.int(2, l - 1), dd = pick(r, [2, -2, 10]); const k = pick(r, [2, 3]);
    const L = (k) => [`P = 2 × (length + width)`, k === 2 ? `P = 2 × (${l} × ${w})` : `P = 2 × (${l} + ${w})`, `P = ${k === 2 ? 2 * l * w : 2 * (l + w) + (k === 3 ? dd : 0)} m`];
    return Q(`perimeter of a ${l} m × ${w} m rectangle`, L, k, k === 2 ? 'Add length and width — multiplying gives area.' : `2 × ${l + w} = ${2 * (l + w)}.`);
  },
  mFracAdd: (r) => {
    const b = r.int(2, 6), d = r.int(2, 7), a = r.int(1, b - 1), c = r.int(1, d - 1); const k = pick(r, [2, 3]);
    const L = (k) => (k === 2 ? [`${a}/${b} + ${c}/${d}`, `= ${a + c}/${b + d}`, '(done)'] : [`${a}/${b} + ${c}/${d}`, `= ${a * d}/${b * d} + ${c * b}/${b * d}`, `= ${a * d + c * b + (k === 3 ? 1 : 0)}/${b * d}`]);
    return Q(`${a}/${b} + ${c}/${d}`, L, k, k === 2 ? 'Never add denominators — use a common denominator first.' : `${a * d} + ${c * b} = ${a * d + c * b}.`);
  },
  mPercent: (r) => {
    const p = pick(r, [10, 15, 20, 25, 30, 40]), price = r.int(2, 20) * 10, off = (price * p) / 100; const k = pick(r, [2, 3]);
    const L = (k) => { const disc = k === 2 ? p * price : off; return [`Discount = ${p}% of $${price}`, k === 2 ? `= ${p} × ${price} = $${disc}` : `= ${p / 100} × ${price} = $${off}`, `Pay $${price} − $${disc} = $${k === 3 ? price + off : price - disc}`]; };
    return Q(`${p}% off a $${price} item`, L, k, k === 2 ? `${p}% means ${p}/100 = ${p / 100}.` : 'Subtract the discount, don\'t add it.');
  },
  mOrder: (r) => {
    const a = r.int(2, 9), b = r.int(2, 6), c = r.int(2, 6), d = r.int(1, 5); const k = pick(r, [1, 3]);
    const L = (k) => (k === 1 ? [`${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${(a + b) * c}`, `${(a + b) * c} − ${d} = ${(a + b) * c - d}`] : [`${b} × ${c} = ${b * c}`, `${a} + ${b * c} = ${a + b * c}`, `${a + b * c} − ${d} = ${a + b * c - d + (k === 3 ? 2 * d : 0)}`]);
    return Q(`${a} + ${b} × ${c} − ${d}`, L, k, k === 1 ? 'Multiply before adding (order of operations).' : `${a + b * c} − ${d} = ${a + b * c - d}.`);
  },
  mLinear: (r) => {
    const a = r.int(2, 7), x = r.int(-5, 9) || 3, b = r.int(-9, 12) || 4, c = a * x + b, dd = pick(r, [1, -1, 2]); const k = pick(r, [2, 3, 4]);
    const okOp = b > 0 ? `− ${b}` : `+ ${-b}`, badOp = b > 0 ? `+ ${b}` : `− ${-b}`; const div = (v) => (v % a === 0 ? `${v / a}` : `${v}/${a}`);
    const L = (k) => { const step = k === 2 ? c + b : c - b, prod = step + (k === 3 ? dd : 0); return [`${a}x ${sg(b)} = ${c}`, `${a}x = ${c} ${k === 2 ? badOp : okOp}`, `${a}x = ${prod}`, k === 4 ? `x = ${prod} × ${a} = ${prod * a}` : `x = ${div(prod)}`]; };
    return Q(`solve ${a}x ${sg(b)} = ${c}`, L, k, k === 2 ? `Undo ${sg(b)} with the opposite operation (${okOp}).` : k === 3 ? `${c} ${okOp} = ${c - b}.` : `Divide both sides by ${a} — don't multiply.`);
  },
  mDistrib: (r) => {
    const a = r.int(2, 6), b = r.int(1, 9), c = r.int(1, 6); const k = pick(r, [2, 3]);
    const L = (k) => [`${a}(x − ${b}) + ${c}x`, k === 2 ? `= ${a}x − ${b} + ${c}x` : `= ${a}x − ${a * b} + ${c}x`, k === 2 ? `= ${a + c}x − ${b}` : k === 3 ? `= ${a * c}x − ${a * b}` : `= ${a + c}x − ${a * b}`];
    return Q(`simplify ${a}(x − ${b}) + ${c}x`, L, k, k === 2 ? `Multiply BOTH terms in the brackets by ${a}.` : `Like terms add: ${a}x + ${c}x = ${a + c}x.`);
  },
  mExpo: (r) => {
    const m = r.int(2, 6), n = r.int(2, 5); const k = pick(r, [2, 3]);
    const L = (k) => [`(x^${m})^${n} · x`, k === 2 ? `= x^${m + n} · x` : `= x^${m * n} · x`, k === 2 ? `= x^${m + n + 1}` : k === 3 ? `= x^${m * n}` : `= x^${m * n + 1}`];
    return Q(`simplify (x^${m})^${n} · x`, L, k, k === 2 ? 'A power of a power MULTIPLIES the exponents.' : 'x is x^1 — multiplying adds 1 to the exponent.');
  },
  mPythag: (r) => {
    const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]); const k = pick(r, [2, 3]);
    const L = (k) => [`c² = a² + b²`, k === 2 ? `c² = ${a * 2} + ${b * 2} = ${2 * (a + b)}` : `c² = ${a * a} + ${b * b} = ${c * c}`, k === 2 ? `c = √${2 * (a + b)}` : k === 3 ? `c = ${(c * c) / 2}` : `c = √${c * c} = ${c}`];
    return Q(`hypotenuse with legs ${a} and ${b}`, L, k, k === 2 ? 'Square the legs, don\'t double them.' : 'Take the square root, don\'t halve.');
  },
  mMean: (r) => {
    const xs = [r.int(2, 20), r.int(2, 20), r.int(2, 20), r.int(2, 20)], s = xs.reduce((p, q) => p + q, 0); const k = pick(r, [2, 3]);
    const L = (k) => { const s2 = s + (k === 2 ? 2 : 0), dv = k === 3 ? 3 : 4; return [`Add them up`, `${xs.join(' + ')} = ${s2}`, `${s2} ÷ ${dv} = ${Math.round((s2 / dv) * 100) / 100}`]; };
    return Q(`mean of ${xs.join(', ')}`, L, k, k === 2 ? `The total is ${s}.` : 'Divide by how many numbers there are: 4.');
  },
  mSlope: (r) => {
    const x1 = r.int(-3, 3), y1 = r.int(-4, 5), dx = r.int(1, 4), m = r.int(-3, 4) || 2, x2 = x1 + dx, y2 = y1 + m * dx; const k = pick(r, [2, 3]);
    const L = (k) => [`m = (y₂ − y₁) / (x₂ − x₁)`, k === 2 ? `m = (${x2} − ${x1}) / (${y2} − ${y1})` : `m = (${y2} − ${y1}) / (${x2} − ${x1})`, k === 2 ? `m = ${dx}/${m * dx}` : `m = ${m * dx}/${dx} = ${k === 3 ? m * dx + dx : m}`];
    return Q(`slope through (${x1}, ${y1}) and (${x2}, ${y2})`, L, k, k === 2 ? "Rise over run: the y's go on top." : `${m * dx} ÷ ${dx} = ${m}.`);
  },
  mFactor: (r) => {
    const p = r.int(1, 7), q = r.int(1, 7), b = p + q, c = p * q; const k = pick(r, [2, 3]);
    const L = (k) => [`x² + ${b}x + ${c} = 0`, k === 2 ? `(x + ${p})(x − ${q}) = 0` : `(x + ${p})(x + ${q}) = 0`, k === 2 ? `x = −${p} or x = ${q}` : k === 3 ? `x = ${p} or x = ${q}` : `x = −${p} or x = −${q}`];
    return Q(`solve x² + ${b}x + ${c} = 0`, L, k, k === 2 ? `Need two numbers that add to ${b} and multiply to ${c}.` : `x + ${p} = 0 gives x = −${p}.`);
  },
  mDeriv: (r) => {
    const a = r.int(2, 6), n = r.int(2, 5), b = r.int(1, 9); const k = pick(r, [2, 3]);
    const L = (k) => [`d/dx(${a}x^${n}) + d/dx(${b}x)`, k === 2 ? `= ${a * n}x^${n} + ${b}` : `= ${a * n}x^${n - 1} + ${b}`, k === 3 ? `= ${a * n}x^${n - 1} + ${b}x` : '(done)'];
    return Q(`d/dx of ${a}x^${n} + ${b}x`, L, k, k === 2 ? 'The power rule lowers the exponent by 1.' : `d/dx(${b}x) = ${b} — the x disappears.`);
  },
  mLog: (r) => {
    const bse = pick(r, [2, 3, 10]), e1 = r.int(1, 4), e2 = r.int(1, 3); const k = pick(r, [2, 3]);
    const L = (k) => [`= log_${bse}(${bse ** e1}) + log_${bse}(${bse ** e2})`, k === 2 ? `= ${e1} × ${e2}` : `= ${e1} + ${e2}`, `= ${k === 2 ? e1 * e2 : e1 + e2 + (k === 3 ? 1 : 0)}`];
    return Q(`log_${bse}(${bse ** e1} × ${bse ** e2})`, L, k, k === 2 ? 'Logs of a product ADD.' : `${e1} + ${e2} = ${e1 + e2}.`);
  },
};
// which maths cities get which mistake generators (by city index)
export const MATH_MISTAKE_GEN = {
  'math-elem': [['mAdd'], ['mSub'], ['mAdd'], ['mTimes'], ['mDiv'], ['mFracEq'], ['mAdd', 'mSub'], ['mPerim']],
  'math-middle': [['mFracAdd'], ['mPercent'], ['mPercent'], ['mOrder'], ['mLinear', 'mDistrib'], ['mExpo'], ['mPythag'], ['mMean']],
  'math-high': [['mSlope', 'mLinear'], ['mLinear'], ['mFactor'], ['mDistrib'], ['mLog', 'mExpo'], ['mPythag'], ['mMean'], ['mDeriv']],
};

// ------------------------------------------------------------ hand-written
export const MISTAKES = {
  python: [
    { ci: 0, title: 'print the average', code: ['nums = [4, 8, 15]', 'total = sum(nums)', 'avg = total / len(num)', 'print(avg)'], bad: 3, fix: '`num` is undefined (NameError) — it should be `nums`.', fixLine: 'avg = total / len(nums)' },
    { ci: 0, title: 'add one to an age', code: ['age = input("Age? ")', 'next_year = age + 1', 'print(next_year)'], bad: 2, fix: 'input() returns a string — use int(age) + 1.', fixLine: 'next_year = int(age) + 1' },
    { ci: 1, title: 'loop over a dict', code: ['scores = {"ana": 90, "ben": 72}', 'for name, score in scores:', '    print(name, score)'], bad: 2, fix: 'Looping a dict gives keys only — use scores.items().', fixLine: 'for name, score in scores.items():' },
    { ci: 1, title: 'smallest item', code: ['items = [3, 1, 2]', 'items = items.sort()', 'print(items[0])'], bad: 2, fix: 'list.sort() sorts in place and returns None — call items.sort() or use sorted(items).', fixLine: 'items.sort()' },
    { ci: 2, title: 'collect tags', code: ['def add_tag(tag, tags=[]):', '    tags.append(tag)', '    return tags', 'print(add_tag("a"), add_tag("b"))'], bad: 1, fix: 'A mutable default list is shared between calls — use tags=None and create a new list inside.', fixLine: ['def add_tag(tag, tags=None):', '    if tags is None: tags = []'] },
    { ci: 2, title: 'a counter', code: ['count = 0', 'def bump():', '    count += 1', 'bump()'], bad: 3, fix: 'Assigning makes count local (UnboundLocalError) — declare global count, or better, pass and return it.', fixLine: ['    global count', '    count += 1'] },
    { ci: 3, title: 'a class', code: ['class Dog:', '    def __init__(name):', '        self.name = name', '    def speak(self):', '        return self.name + " says woof"'], bad: 2, fix: 'Methods need self first: def __init__(self, name).', fixLine: '    def __init__(self, name):' },
    { ci: 4, title: 'a generator of squares', code: ['def squares(n):', '    for i in range(n):', '        return i * i', 'print(list(squares(3)))'], bad: 3, fix: 'return exits on the first value — use yield to produce each square.', fixLine: '        yield i * i' },
    { ci: 4, title: 'read a file', code: ['with open("data.txt") as f:', '    lines = f.readlines()', 'print(len(lines))', 'for line in f:', '    print(line)'], bad: 4, fix: 'The file is closed once the with-block ends — loop over lines (or move the loop inside).', fixLine: 'for line in lines:' },
    { ci: 5, title: 'catch two errors', code: ['try:', '    value = int(text)', 'except ValueError or TypeError:', '    value = 0'], bad: 3, fix: '`ValueError or TypeError` is just ValueError — use except (ValueError, TypeError):', fixLine: 'except (ValueError, TypeError):' },
    { ci: 6, title: 'count in threads', code: ['counter = 0', 'def work():', '    global counter', '    for _ in range(100_000):', '        counter += 1'], bad: 5, fix: 'counter += 1 is not atomic across threads — protect it with a threading.Lock.', fixed: ['counter = 0', 'lock = threading.Lock()', 'def work():', '    global counter', '    for _ in range(100_000):', '        with lock:', '            counter += 1'] },
    { ci: 7, title: 'a 3×3 grid', code: ['grid = [[0] * 3] * 3', 'grid[0][0] = 1', 'print(grid)  # expect only one 1'], bad: 1, fix: 'All three rows are the same list — use [[0] * 3 for _ in range(3)].', fixLine: 'grid = [[0] * 3 for _ in range(3)]' },
    { ci: 7, title: 'compare numbers', code: ['x = int("1000")', 'if x is 1000:', '    print("match")'], bad: 2, fix: '`is` checks identity, not value — use ==.', fixLine: 'if x == 1000:' },
  ],
  golang: [
    { ci: 0, title: 'increment', code: ['func main() {', '    x := 5', '    x := x + 1', '    fmt.Println(x)', '}'], bad: 3, fix: ':= needs a new variable on the left — use x = x + 1.', fixLine: '    x = x + 1' },
    { ci: 0, title: 'greeting', code: ['func greet(name string) string {', '    msg := "Hi " + name', '    return', '}'], bad: 3, fix: 'The function returns a string — return msg.', fixLine: '    return msg' },
    { ci: 1, title: 'word counts', code: ['var counts map[string]int', 'counts["go"]++', 'fmt.Println(counts)'], bad: 1, fix: 'A nil map panics on write — counts := make(map[string]int).', fixLine: 'counts := make(map[string]int)' },
    { ci: 1, title: 'grow a slice', code: ['s := []int{1, 2, 3}', 'append(s, 4)', 'fmt.Println(s)'], bad: 2, fix: 'append returns the new slice — s = append(s, 4).', fixLine: 's = append(s, 4)' },
    { ci: 2, title: 'a counter type', code: ['type Counter struct{ n int }', 'func (c Counter) Inc() { c.n++ }', 'c := Counter{}', 'c.Inc()'], bad: 2, fix: 'A value receiver changes a copy — use func (c *Counter) Inc().', fixLine: 'func (c *Counter) Inc() { c.n++ }' },
    { ci: 3, title: 'type assertion', code: ['var v any = "hi"', 'n := v.(int)', 'fmt.Println(n)'], bad: 2, fix: 'This panics when v isn\'t an int — use n, ok := v.(int).', fixLine: 'n, ok := v.(int) // ok is false, no panic' },
    { ci: 4, title: 'open a file', code: ['f, err := os.Open("cfg.json")', 'defer f.Close()', 'if err != nil {', '    return err', '}'], bad: 2, fix: 'Check err first — f is nil when Open fails. Defer Close after the check.', fixed: ['f, err := os.Open("cfg.json")', 'if err != nil {', '    return err', '}', 'defer f.Close()'] },
    { ci: 5, title: 'send and receive', code: ['ch := make(chan int)', 'ch <- 42', 'fmt.Println(<-ch)'], bad: 2, fix: 'An unbuffered send blocks forever with no receiver (deadlock) — send from a goroutine or buffer the channel.', fixed: ['ch := make(chan int, 1) // buffered', 'ch <- 42', 'fmt.Println(<-ch)'] },
    { ci: 5, title: 'wait for workers', code: ['var wg sync.WaitGroup', 'for i := 0; i < 3; i++ {', '    go func() {', '        wg.Add(1)', '        defer wg.Done()', '        work()', '    }()', '}', 'wg.Wait()'], bad: 4, fix: 'Call wg.Add(1) before starting the goroutine, or Wait may return too early.', fixed: ['var wg sync.WaitGroup', 'for i := 0; i < 3; i++ {', '    wg.Add(1)', '    go func() {', '        defer wg.Done()', '        work()', '    }()', '}', 'wg.Wait()'] },
    { ci: 6, title: 'JSON output', code: ['type User struct {', '    name string `json:"name"`', '}', 'b, _ := json.Marshal(User{name: "Ana"}) // {}'], bad: 2, fix: 'encoding/json skips unexported fields — rename to Name.', fixed: ['type User struct {', '    Name string `json:"name"`', '}', 'b, _ := json.Marshal(User{Name: "Ana"}) // {"name":"Ana"}'] },
  ],
  cs: [
    { ci: 0, title: 'a complexity claim', code: ['# Claim: this is O(n)', 'for i in range(n):', '    for j in range(i, n):', '        total += a[i] * a[j]'], bad: 1, fix: 'Nested loops over n give about n²/2 steps: O(n²).', fixLine: '# This is O(n²)' },
    { ci: 1, title: 'take the newest item', code: ['stack = []', 'stack.append(1)', 'stack.append(2)', 'top = stack.pop(0)  # want the newest'], bad: 4, fix: 'pop(0) removes the oldest (queue behaviour) — a stack uses pop().', fixLine: 'top = stack.pop()  # newest item' },
    { ci: 2, title: 'binary search', code: ['def bsearch(a, x):', '    lo, hi = 0, len(a) - 1', '    while lo < hi:', '        mid = (lo + hi) // 2', '        if a[mid] == x: return mid', '        if a[mid] < x: lo = mid + 1', '        else: hi = mid - 1', '    return -1'], bad: 3, fix: 'Use lo <= hi, or a one-element range is never checked.', fixLine: '    while lo <= hi:' },
    { ci: 3, title: 'breadth-first search', code: ['def bfs(start):', '    queue = deque([start])', '    while queue:', '        node = queue.popleft()', '        for nb in graph[node]:', '            queue.append(nb)'], bad: 6, fix: 'Without a visited set, cycles loop forever — only enqueue unseen neighbours and mark them visited.', fixed: ['def bfs(start):', '    queue, seen = deque([start]), {start}', '    while queue:', '        node = queue.popleft()', '        for nb in graph[node]:', '            if nb not in seen:', '                seen.add(nb); queue.append(nb)'] },
    { ci: 4, title: 'factorial', code: ['def fact(n):', '    if n == 1:', '        return 1', '    return n * fact(n - 1)', 'print(fact(0))'], bad: 2, fix: 'fact(0) never hits the base case — use if n <= 1.', fixLine: '    if n <= 1:' },
    { ci: 4, title: 'memoised Fibonacci', code: ['memo = {}', 'def fib(n):', '    if n < 2: return n', '    if n in memo: return memo[n]', '    return fib(n - 1) + fib(n - 2)'], bad: 5, fix: 'The result is never stored — memo[n] = fib(n-1) + fib(n-2), then return it.', fixLine: ['    memo[n] = fib(n - 1) + fib(n - 2)', '    return memo[n]'] },
    { ci: 6, title: 'SQL: busy customers', code: ['SELECT name, COUNT(*)', 'FROM orders', 'WHERE COUNT(*) > 5', 'GROUP BY name;'], bad: 3, fix: 'Filter groups with HAVING COUNT(*) > 5 after GROUP BY — WHERE can\'t use aggregates.', fixed: ['SELECT name, COUNT(*)', 'FROM orders', 'GROUP BY name', 'HAVING COUNT(*) > 5;'] },
  ],
  java: [
    { ci: 0, title: 'compare names', code: ['String a = scanner.nextLine();', 'String b = "Robin";', 'if (a == b) {', '    System.out.println("Hi Robin");', '}'], bad: 3, fix: '== compares references — use a.equals(b).', fixLine: 'if (a.equals(b)) {' },
    { ci: 0, title: 'average of two ints', code: ['int total = 7;', 'int count = 2;', 'double avg = total / count;', 'System.out.println(avg); // expected 3.5'], bad: 3, fix: 'int / int does integer division (3) — cast first: (double) total / count.', fixLine: 'double avg = (double) total / count;' },
    { ci: 1, title: 'a constructor', code: ['class Dog {', '    private String name;', '    Dog(String name) {', '        name = name;', '    }', '}'], bad: 4, fix: 'This assigns the parameter to itself — use this.name = name.', fixLine: '        this.name = name;' },
    { ci: 2, title: 'override toString', code: ['class Dog {', '    @Override', '    public String toSting() {', '        return "Dog";', '    }', '}'], bad: 3, fix: 'Typo: toSting — @Override makes the compiler catch it. It should be toString().', fixLine: '    public String toString() {' },
    { ci: 3, title: 'remove short words', code: ['List<String> words = new ArrayList<>(input);', 'for (String w : words) {', '    if (w.length() < 3) words.remove(w);', '}'], bad: 3, fix: 'Removing inside a for-each throws ConcurrentModificationException — use words.removeIf(...).', fixed: ['List<String> words = new ArrayList<>(input);', 'words.removeIf(w -> w.length() < 3);'] },
    { ci: 3, title: 'a list of numbers', code: ['List<int> nums = new ArrayList<>();', 'nums.add(4);', 'nums.add(8);', 'System.out.println(nums);'], bad: 1, fix: 'Generics need objects — use List<Integer>.', fixLine: 'List<Integer> nums = new ArrayList<>();' },
    { ci: 4, title: 'read a file', code: ['BufferedReader r = new BufferedReader(new FileReader(f));', 'String line = r.readLine();', 'System.out.println(line);', '// r is never closed'], bad: 1, fix: 'The reader leaks if anything throws — open it with try-with-resources.', fixed: ['try (BufferedReader r = new BufferedReader(new FileReader(f))) {', '    String line = r.readLine();', '    System.out.println(line);', '} // closed automatically'] },
    { ci: 5, title: 'sum even numbers', code: ['int sum = nums.stream()', '    .filter(n -> n % 2 == 0)', '    .map(n -> n * 1);', 'System.out.println(sum);'], bad: 3, fix: 'map returns a Stream, not an int — finish with a terminal op like .mapToInt(n -> n).sum().', fixLine: '    .mapToInt(n -> n).sum();' },
    { ci: 6, title: 'a shared counter', code: ['class Counter {', '    private int count = 0;', '    void increment() { count++; }', '}', '// called from 8 threads'], bad: 3, fix: 'count++ isn\'t atomic — updates get lost. Make it synchronized or use AtomicInteger.', fixLine: '    synchronized void increment() { count++; }' },
  ],
  french: [
    { ci: 2, title: 'articles', parts: ['J\'aime', 'le', 'musique', 'française.'], bad: 1, fix: 'musique is feminine → "la".', fixPart: 'la' },
    { ci: 2, title: 'agreement', parts: ['Elle a', 'une', 'voiture', 'rouges.'], bad: 3, fix: 'one car → singular "rouge".', fixPart: 'rouge.' },
    { ci: 3, title: 'age', parts: ['Je', 'suis', 'vingt', 'ans.'], bad: 1, fix: 'age uses avoir: "J\'ai vingt ans".', fixed: 'J\'ai vingt ans.' },
    { ci: 3, title: 'negation', parts: ['Je', 'mange pas', 'de', 'viande.'], bad: 1, fix: 'written French needs ne … pas: "ne mange pas".', fixPart: 'ne mange pas' },
    { ci: 5, title: 'être or avoir?', parts: ['Hier,', 'j\'ai allé', 'au', 'cinéma.'], bad: 1, fix: 'aller takes être: "je suis allé".', fixed: 'Hier, je suis allé au cinéma.' },
    { ci: 6, title: 'possessives', parts: ['Elle', 'aime', 'son', 'maison.'], bad: 2, fix: 'maison is feminine → "sa maison".', fixPart: 'sa' },
  ],
  spanish: [
    { ci: 2, title: 'articles', parts: ['Me gusta', 'el', 'casa', 'nueva.'], bad: 1, fix: 'casa is feminine → "la".', fixPart: 'la' },
    { ci: 3, title: 'ser or estar?', parts: ['Hoy', 'soy', 'muy', 'cansado.'], bad: 1, fix: 'temporary state → "estoy".', fixPart: 'estoy' },
    { ci: 1, title: 'age', parts: ['Yo', 'soy', 'treinta', 'años.'], bad: 1, fix: 'age uses tener: "Tengo treinta años".', fixed: 'Tengo treinta años.' },
    { ci: 4, title: 'gustar', parts: ['Me', 'gusta', 'los', 'perros.'], bad: 1, fix: 'plural thing liked → "gustan".', fixPart: 'gustan' },
    { ci: 2, title: 'contractions', parts: ['Vamos', 'a el', 'parque', 'mañana.'], bad: 1, fix: 'a + el → "al".', fixPart: 'al' },
    { ci: 7, title: 'por or para?', parts: ['Este', 'regalo', 'es por', 'ti.'], bad: 2, fix: 'recipient → "para".', fixPart: 'es para' },
  ],
  maltese: [
    { ci: 3, title: 'the sun letters', parts: ['Il-', 'xemx', 'qed', 'tiddi.'], bad: 0, fix: 'x is a sun letter → "Ix-xemx".', fixed: 'Ix-xemx qed tiddi.' },
    { ci: 4, title: 'negation', parts: ['Jiena', 'ma', 'naf', 'Malti.'], bad: 2, fix: 'negation needs the -x ending: "ma nafx".', fixPart: 'nafx' },
    { ci: 4, title: '"to have"', parts: ['Jiena', 'għandu', 'kelb', 'kbir.'], bad: 1, fix: 'I have = "għandi" (għandu = he has).', fixPart: 'għandi' },
    { ci: 3, title: 'the article before a vowel', parts: ['Nixtieq', 'il-', 'ilma,', 'jekk jogħġbok.'], bad: 1, fix: 'before a vowel the article is "l-": "l-ilma".', fixed: 'Nixtieq l-ilma, jekk jogħġbok.' },
    { ci: 3, title: 'plurals', parts: ['Għandi', 'żewġ', 'ktiebs', 'ġodda.'], bad: 2, fix: 'Maltese doesn\'t add -s — the plural of ktieb is "kotba".', fixPart: 'kotba' },
  ],
  automotive: [
    { ci: 0, title: 'setting tire pressure', code: ['Look up the pressure on the tire sidewall: 51 psi', 'Check tires when cold', 'Inflate all four tires', 'Re-check the spare'], bad: 1, fix: 'The sidewall shows the MAXIMUM — use the door-jamb sticker (e.g. 35 psi).', fixLine: 'Look up the pressure on the door-jamb sticker: 35 psi' },
    { ci: 1, title: 'engine displacement', code: ['V6 engine, 500 cc per cylinder', 'Displacement = 6 + 500', '= 506 cc'], bad: 2, fix: 'Multiply cylinders by volume each.', fixed: ['V6 engine, 500 cc per cylinder', 'Displacement = 6 × 500', '= 3,000 cc (3.0 L)'] },
    { ci: 3, title: 'an overheating car', code: ['Temp gauge in the red, steam from the hood', 'Pull over safely and switch off', 'Open the radiator cap to check the level', 'Call for help or wait for it to cool'], bad: 3, fix: 'Never open a hot pressurised radiator — wait until it has cooled.', fixLine: 'Wait until it cools, then check the overflow tank' },
    { ci: 6, title: 'jump-starting', code: ['Red clamp on the dead battery +', 'Red clamp on the good battery +', 'Black clamp on the good battery −', 'Black clamp on the dead battery −'], bad: 4, fix: 'Clip the last black clamp to bare metal away from the dead battery (sparks + battery gas).', fixLine: 'Black clamp on bare metal of the dead car\'s engine' },
    { ci: 7, title: 'EV trip energy', code: ['Consumption: 20 kWh/100 km', 'Trip: 300 km', 'Energy = 20 × 300', '= 6,000 kWh'], bad: 3, fix: 'Consumption is per 100 km: 20 × 3 = 60 kWh.', fixed: ['Consumption: 20 kWh/100 km', 'Trip: 300 km', 'Energy = 20 × (300 ÷ 100)', '= 60 kWh'] },
  ],
  finance: [
    { ci: 0, title: 'the 50/30/20 rule on $4,000 take-home', code: ['Needs: 50% × 4,000 = $2,000', 'Wants: 30% × 4,000 = $1,200', 'Savings: 20% × 4,000 = $400'], bad: 3, fix: '20% of 4,000 is $800.', fixLine: 'Savings: 20% × 4,000 = $800' },
    { ci: 2, title: '$1,000 at 10% compounded for 2 years', code: ['Year 1: 1,000 × 1.10 = 1,100', 'Year 2: 1,000 × 1.10 = 1,100', 'Total after 2 years: $1,100'], bad: 2, fix: 'Compounding grows the NEW balance: 1,100 × 1.10 = 1,210.', fixed: ['Year 1: 1,000 × 1.10 = 1,100', 'Year 2: 1,100 × 1.10 = 1,210', 'Total after 2 years: $1,210'] },
    { ci: 3, title: 'break-even', code: ['Fixed costs: $3,000/month', 'Price $40, variable cost $25 per unit', 'Break-even = 3,000 ÷ 40', '= 75 units'], bad: 3, fix: 'Divide by the contribution per unit (price − variable cost = $15).', fixed: ['Fixed costs: $3,000/month', 'Price $40, variable cost $25 per unit', 'Break-even = 3,000 ÷ (40 − 25)', '= 200 units'] },
    { ci: 4, title: 'the accounting equation', code: ['Assets: $90,000', 'Liabilities: $35,000', 'Equity = Assets + Liabilities', '= $125,000'], bad: 3, fix: 'Equity = Assets − Liabilities.', fixed: ['Assets: $90,000', 'Liabilities: $35,000', 'Equity = Assets − Liabilities', '= $55,000'] },
    { ci: 5, title: 'tax brackets', code: ['My raise moved me into a higher bracket', 'Now ALL my income is taxed at the higher rate', 'So the raise made me poorer', 'I should refuse the raise'], bad: 2, fix: 'Only the income above the bracket threshold gets the higher rate — a raise still increases take-home pay.', fixed: ['My raise moved me into a higher bracket', 'Only the dollars above the threshold get the higher rate', 'So I still take home more than before', 'I should accept the raise'] },
    { ci: 6, title: 'Ontario HST on a $250 invoice', code: ['Subtotal: $250', 'HST 13%: 250 × 0.13 = $32.50', 'Total: $250 + $32.50 = $272.50'], bad: 3, fix: '250 + 32.50 = 282.50.', fixLine: 'Total: $250 + $32.50 = $282.50' },
  ],
  softeng: [
    { ci: 1, title: 'a class hierarchy', code: ['class Bird { fly() { … } }', 'class Sparrow extends Bird { fly() { flap(); } }', 'class Penguin extends Bird { fly() { throw Error("can\'t") } }', 'birds.forEach(b => b.fly());'], bad: 3, fix: 'Penguin breaks Liskov Substitution — not every Bird can fly; model flying separately.', fixed: ['class Bird { … }', 'class FlyingBird extends Bird { fly() { … } }', 'class Sparrow extends FlyingBird { fly() { flap(); } }', 'class Penguin extends Bird { swim() { … } }', 'flyingBirds.forEach(b => b.fly());'] },
    { ci: 3, title: 'a unit test', code: ['test("adds tax", () => {', '  const total = addTax(100);', '  expect(total).toBe(113);', '  expect(addTax(0)).toBeTruthy;', '});'], bad: 4, fix: 'toBeTruthy is never called (missing ()), so the assertion silently does nothing.', fixLine: '  expect(addTax(0)).toBe(0);' },
    { ci: 4, title: 'REST routes', code: ['GET    /users/42         → read user', 'POST   /users/42/delete  → delete user', 'PUT    /users/42         → replace user', 'POST   /users            → create user'], bad: 2, fix: 'Use the DELETE method on the resource: DELETE /users/42.', fixLine: 'DELETE /users/42         → delete user' },
    { ci: 4, title: 'status codes', code: ['order created    → 201 Created', 'order not found  → 404 Not Found', 'invalid input    → 200 OK', 'too many calls   → 429 Too Many Requests'], bad: 3, fix: 'Bad client input should be 400 Bad Request (or 422).', fixLine: 'invalid input    → 400 Bad Request' },
    { ci: 6, title: 'back-of-envelope', code: ['1,000,000 users × 10 requests/day', '= 10,000,000 requests/day', '÷ 86,400 seconds/day', '≈ 1,157,000 requests/second'], bad: 4, fix: '10M ÷ 86,400 ≈ 116 requests per second.', fixLine: '≈ 116 requests/second' },
  ],
  devops: [
    { ci: 0, title: 'a bash script', code: ['#!/bin/bash', 'NAME = "hakma"', 'echo "Deploying $NAME"', 'exit 0'], bad: 2, fix: 'No spaces around = in shell assignments: NAME="hakma".', fixLine: 'NAME="hakma"' },
    { ci: 1, title: 'ship a fix', code: ['git switch main', 'git pull', 'git commit -am "fix login"', 'git push --force'], bad: 4, fix: 'Force-pushing a shared main rewrites everyone\'s history — use a normal push (or a PR).', fixLine: 'git push   # or open a pull request' },
    { ci: 2, title: 'a CI pipeline', code: ['steps:', '  - run: npm ci', '  - run: npm test || true', '  - run: npm run build'], bad: 3, fix: '`|| true` hides failing tests — the pipeline must fail when tests fail.', fixLine: '  - run: npm test' },
    { ci: 3, title: 'a Dockerfile', code: ['FROM node:22-alpine', 'WORKDIR /app', 'COPY . .', 'RUN npm ci', 'CMD ["node", "server.js"]'], bad: 3, fix: 'Copying everything first busts the cache — COPY package*.json, RUN npm ci, then COPY the rest.', fixed: ['FROM node:22-alpine', 'WORKDIR /app', 'COPY package*.json ./', 'RUN npm ci', 'COPY . .', 'CMD ["node", "server.js"]'] },
    { ci: 6, title: 'an error budget', code: ['SLO: 99.9% per 30-day month', '30 days = 43,200 minutes', 'Budget = 0.1% × 43,200', '= 432 minutes'], bad: 4, fix: '0.1% of 43,200 is 43.2 minutes.', fixLine: '= 43.2 minutes' },
  ],
  kubernetes: [
    { ci: 0, title: 'a Pod manifest', code: ['apiVersion: v1', 'kind: pod', 'metadata:', '  name: web', 'spec:', '  containers:', '  - name: web', '    image: nginx:1.27'], bad: 2, fix: 'kind is case-sensitive: Pod.', fixLine: 'kind: Pod' },
    { ci: 1, title: 'a Deployment', code: ['kind: Deployment', 'spec:', '  replicas: 3', '  selector:', '    matchLabels: {app: api}', '  template:', '    metadata:', '      labels: {app: web}'], bad: 8, fix: 'Template labels must match the selector (app: api).', fixLine: '      labels: {app: api}' },
    { ci: 2, title: 'a Service (pods are labelled app: web)', code: ['kind: Service', 'spec:', '  selector:', '    app: frontend', '  ports:', '  - port: 80'], bad: 4, fix: 'The selector matches no pods, so the Service has no endpoints — use app: web.', fixLine: '    app: web' },
    { ci: 3, title: 'a Secret', code: ['apiVersion: v1', 'kind: Secret', 'metadata: {name: db}', 'data:', '  password: hunter2'], bad: 5, fix: 'data values must be base64 — encode it, or use stringData for plain text.', fixLine: '  password: aHVudGVyMg==   # base64 of hunter2' },
    { ci: 4, title: 'container resources', code: ['resources:', '  requests:', '    memory: "512Mi"', '  limits:', '    memory: "256Mi"'], bad: 5, fix: 'A limit can\'t be lower than the request.', fixLine: '    memory: "1Gi"   # limit ≥ request' },
    { ci: 6, title: 'a read-only Role', code: ['kind: Role', 'rules:', '- apiGroups: [""]', '  resources: ["pods"]', '  verbs: ["*"]'], bad: 5, fix: 'Read-only should be ["get", "list", "watch"] — "*" grants everything (least privilege).', fixLine: '  verbs: ["get", "list", "watch"]' },
  ],
  terraform: [
    { ci: 0, title: 'a bucket and its output', code: ['resource "aws_s3_bucket" "logs" {', '  bucket = "acme-logs"', '}', 'output "bucket_arn" {', '  value = aws_s3_bucket.log.arn', '}'], bad: 5, fix: 'The resource is named logs: aws_s3_bucket.logs.arn.', fixLine: '  value = aws_s3_bucket.logs.arn' },
    { ci: 2, title: 'a variable', code: ['variable "env" {', '  type    = number', '  default = "dev"', '}'], bad: 2, fix: '"dev" is a string — type = string.', fixLine: '  type    = string' },
    { ci: 2, title: 'three instances', code: ['resource "aws_instance" "web" {', '  count = 3', '  ami   = var.ami', '  tags  = { Name = "web-${count}" }', '}'], bad: 4, fix: 'Use count.index for each instance\'s number.', fixLine: '  tags  = { Name = "web-${count.index}" }' },
    { ci: 3, title: 'a remote backend', code: ['terraform {', '  backend "s3" {', '    bucket = "acme-tfstate"', '    key    = var.state_key', '  }', '}'], bad: 4, fix: 'Backend blocks can\'t use variables — hard-code it or pass -backend-config.', fixLine: '    key    = "prod/network.tfstate"' },
    { ci: 4, title: 'use a module', code: ['module "vpc" {', '  source  = "terraform-aws-modules/vpc/aws"', '  version = "latest"', '  cidr    = "10.0.0.0/16"', '}'], bad: 3, fix: 'version needs a constraint like "~> 5.0" — "latest" isn\'t valid.', fixLine: '  version = "~> 5.0"' },
    { ci: 6, title: 'a password variable', code: ['variable "db_password" {', '  type      = string', '  sensitive = false', '}'], bad: 3, fix: 'Mark secrets sensitive = true so they\'re hidden in plan output.', fixLine: '  sensitive = true' },
  ],
  electrical: [
    { ci: 0, title: '12 V across 4 Ω', code: ['V = 12 V, R = 4 Ω', 'I = V × R', 'I = 48 A', 'P = V × I = 576 W'], bad: 2, fix: 'Ohm\'s law: I = V / R = 3 A (then P = 36 W).', fixed: ['V = 12 V, R = 4 Ω', 'I = V / R', 'I = 3 A', 'P = V × I = 36 W'] },
    { ci: 1, title: '6 Ω parallel with 3 Ω', code: ['1/R = 1/6 + 1/3', '1/R = 1/6 + 2/6', '1/R = 3/6', 'R = 0.5 Ω'], bad: 4, fix: 'Flip it: R = 6/3 = 2 Ω.', fixLine: 'R = 6/3 = 2 Ω' },
    { ci: 2, title: 'RC time constant', code: ['R = 10 kΩ, C = 100 µF', 'τ = R × C', 'τ = 10,000 × 100', 'τ = 1,000,000 s'], bad: 3, fix: '100 µF = 100 × 10⁻⁶ F, so τ = 10,000 × 0.0001 = 1 s.', fixed: ['R = 10 kΩ, C = 100 µF', 'τ = R × C', 'τ = 10,000 × 0.0001', 'τ = 1 s'] },
    { ci: 3, title: 'reactive power', code: ['S = 10 kVA, PF = 0.8', 'P = S × PF = 8 kW', 'Q = S − P = 2 kVAR'], bad: 3, fix: 'Powers form a triangle: Q = √(S² − P²) = 6 kVAR.', fixLine: 'Q = √(S² − P²) = √(100 − 64) = 6 kVAR' },
  ],
  electrician: [
    { ci: 0, title: 'safe work order', code: ['Notify people affected', 'Switch off the breaker', 'Start work on the circuit', 'Apply your lock and tag'], bad: 3, fix: 'Lock out, tag, and verify de-energised BEFORE any work starts.', fixed: ['Notify people affected', 'Switch off the breaker', 'Apply your lock and tag', 'Verify it is dead, then start work'] },
    { ci: 1, title: 'a heater circuit', code: ['Heater: 1,800 W at 120 V', 'I = P / V', 'I = 1,800 / 120 = 15 A', 'Put it on a 15 A circuit'], bad: 4, fix: 'A continuous load should be ≤ 80% of the breaker (12 A on 15 A) — it needs a larger circuit. Always check your local code.', fixLine: 'Use a 20 A circuit (80% of 20 A = 16 A ≥ 15 A)' },
    { ci: 3, title: 'a kitchen circuit plan', code: ['Wire: 14 AWG copper', 'Breaker: 20 A', 'Receptacles: tamper-resistant', 'GFCI protection near the sink'], bad: 2, fix: '14 AWG copper is typically limited to 15 A — use 12 AWG for 20 A.', fixLine: 'Wire: 12 AWG copper' },
    { ci: 7, title: 'troubleshooting', code: ['Outlet dead: meter reads 0 V hot–neutral', 'Breaker is ON, not tripped', 'Conclusion: nothing is wrong', 'Next: check upstream GFCI / loose connections'], bad: 3, fix: '0 V on a live circuit means a fault — keep tracing.', fixLine: 'Conclusion: there is a fault — keep tracing' },
  ],
  physics: [
    { ci: 0, title: 'distance from rest', code: ['u = 0, a = 3 m/s², t = 4 s', 'v = u + at = 12 m/s', 's = ut + ½at²', 's = ½ × 3 × 4 = 6 m'], bad: 4, fix: 'Square the time: ½ × 3 × 16 = 24 m.', fixLine: 's = ½ × 3 × 4² = 24 m' },
    { ci: 1, title: 'acceleration', code: ['m = 5 kg, F = 20 N', 'a = F × m', 'a = 100 m/s²'], bad: 2, fix: 'a = F / m = 4 m/s².', fixed: ['m = 5 kg, F = 20 N', 'a = F / m', 'a = 4 m/s²'] },
    { ci: 2, title: 'kinetic energy', code: ['m = 2 kg, v = 3 m/s', 'KE = ½mv²', 'KE = ½ × 2 × 3', 'KE = 3 J'], bad: 3, fix: 'v² = 9, so KE = ½ × 2 × 9 = 9 J.', fixed: ['m = 2 kg, v = 3 m/s', 'KE = ½mv²', 'KE = ½ × 2 × 3²', 'KE = 9 J'] },
    { ci: 4, title: 'speed of a wave', code: ['f = 440 Hz, λ = 0.78 m', 'v = f / λ', 'v ≈ 564 m/s'], bad: 2, fix: 'v = f × λ ≈ 343 m/s.', fixed: ['f = 440 Hz, λ = 0.78 m', 'v = f × λ', 'v ≈ 343 m/s'] },
    { ci: 5, title: '3 Ω and 6 Ω in series', code: ['R₁ = 3 Ω, R₂ = 6 Ω (series)', 'R = (R₁ × R₂) / (R₁ + R₂)', 'R = 2 Ω'], bad: 2, fix: 'That\'s the parallel formula — series adds: 9 Ω.', fixed: ['R₁ = 3 Ω, R₂ = 6 Ω (series)', 'R = R₁ + R₂', 'R = 9 Ω'] },
  ],
  chemistry: [
    { ci: 0, title: 'carbon-14', code: ['Atomic number of C = 6', 'Protons = 6', 'Neutrons = 14', 'Electrons (neutral) = 6'], bad: 3, fix: 'Neutrons = mass number − protons = 8.', fixLine: 'Neutrons = 14 − 6 = 8' },
    { ci: 3, title: 'balance H₂ + O₂ → H₂O', code: ['H₂ + O₂ → H₂O', 'Balance O: H₂ + O₂ → 2H₂O', 'Balance H: H₂ + O₂ → 2H₂O', 'Final: H₂ + O₂ → 2H₂O'], bad: 3, fix: '2H₂O has 4 H, so use 2H₂: 2H₂ + O₂ → 2H₂O.', fixed: ['H₂ + O₂ → H₂O', 'Balance O: H₂ + O₂ → 2H₂O', 'Balance H: 2H₂ + O₂ → 2H₂O', 'Final: 2H₂ + O₂ → 2H₂O'] },
    { ci: 4, title: 'molar mass of water', code: ['H = 1.01, O = 16.00', 'M = 1.01 + 16.00', 'M = 17.01 g/mol'], bad: 2, fix: 'Water has two H: 2(1.01) + 16.00 = 18.02 g/mol.', fixed: ['H = 1.01, O = 16.00', 'M = 2(1.01) + 16.00', 'M = 18.02 g/mol'] },
    { ci: 4, title: 'moles of salt', code: ['m(NaCl) = 117 g', 'M(NaCl) = 58.5 g/mol', 'n = M / m = 0.5 mol'], bad: 3, fix: 'n = m / M = 117 / 58.5 = 2 mol.', fixLine: 'n = m / M = 117 / 58.5 = 2 mol' },
    { ci: 6, title: 'pH', code: ['[H⁺] = 1 × 10⁻³ M', 'pH = −log[H⁺]', 'pH = −3'], bad: 3, fix: '−log(10⁻³) = 3.', fixLine: 'pH = 3' },
  ],
  'ela-elem': [
    { ci: 1, title: 'spelling', parts: ['I hav', 'two brothers', 'and a', 'sister.'], bad: 0, fix: 'spelled "have".', fixPart: 'I have' },
    { ci: 1, title: 'plurals', parts: ['We saw', 'three mouses', 'in the', 'barn.'], bad: 1, fix: 'the plural of mouse is "mice".', fixPart: 'three mice' },
    { ci: 2, title: 'verbs', parts: ['The cats', 'is sleeping', 'on the', 'mat.'], bad: 1, fix: 'more than one cat → "are sleeping".', fixPart: 'are sleeping' },
    { ci: 2, title: 'adverbs', parts: ['She', 'sings beautiful', 'every', 'morning.'], bad: 1, fix: 'describes how she sings → "beautifully".', fixPart: 'sings beautifully' },
    { ci: 3, title: 'capitals', parts: ['my dog', 'likes to run', 'in the', 'park.'], bad: 0, fix: 'sentences start with a capital: "My".', fixPart: 'My dog' },
    { ci: 3, title: 'end marks', parts: ['Where', 'is my', 'red', 'backpack.'], bad: 3, fix: 'it\'s a question → "backpack?"', fixPart: 'backpack?' },
    { ci: 4, title: 'homophones', parts: ['Can I', 'come', 'two the', 'party?'], bad: 2, fix: 'use "to the" (two means 2).', fixPart: 'to the' },
  ],
  'ela-high': [
    { ci: 0, title: 'comma splice', parts: ['I finished', 'my essay,', 'I submitted', 'it online.'], bad: 1, fix: 'two sentences joined by a comma — use a semicolon or ", and".', fixed: 'I finished my essay; I submitted it online.' },
    { ci: 0, title: 'dangling modifier', parts: ['Walking to school,', 'the rain', 'soaked', 'my shoes.'], bad: 1, fix: 'the rain wasn\'t walking — "Walking to school, I got my shoes soaked."', fixed: 'Walking to school, I got my shoes soaked in the rain.' },
    { ci: 1, title: 'they\'re / their / there', parts: ['Their going', 'to announce', 'the results', 'tomorrow.'], bad: 0, fix: '"They\'re" = they are.', fixPart: 'They\'re going' },
    { ci: 1, title: 'agreement', parts: ['The list', 'of supplies', 'are on', 'the counter.'], bad: 2, fix: 'the subject is "list" (singular) → "is on".', fixPart: 'is on' },
    { ci: 1, title: 'its / it\'s', parts: ['The company', 'raised', 'it\'s prices', 'again.'], bad: 2, fix: 'possessive "its" has no apostrophe.', fixPart: 'its prices' },
    { ci: 1, title: 'who / whom', parts: ['To who', 'should I', 'address', 'the letter?'], bad: 0, fix: 'object of "to" → "whom".', fixPart: 'To whom' },
    { ci: 1, title: 'fewer / less', parts: ['There were', 'less people', 'at the game', 'than last year.'], bad: 1, fix: 'countable nouns take "fewer".', fixPart: 'fewer people' },
  ],
};

export function mistakeQuestions(topicId) {
  return (MISTAKES[topicId] || []).map((m) => ({ ci: m.ci, t: m.parts
    ? partsQ(m.title, m.parts, m.bad, m.fix, m.fixed || (m.fixPart ? m.parts.map((p, i) => (i === m.bad ? m.fixPart : p)).join(' ') : ''))
    : codeQ(m.title, m.code, m.bad, m.fix, m.fixed || (m.fixLine !== undefined ? withLine(m.code, m.bad, m.fixLine) : null)) }));
}
