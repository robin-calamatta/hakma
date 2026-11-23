// "Find the mistake" questions. Code/worked solutions are shown line by line; exactly ONE line is wrong.
//  - MATH_MISTAKES: procedural generators (fresh numbers every time), same shape as GEN in generators.js.
//  - MISTAKES[topic]: hand-written items. { ci, title, code: [lines], bad: lineNumber (1-based), fix }
//    or for language arts { ci, title, parts: [4 chunks of a sentence], bad: index (0-based), fix }.

const ALL_OK = 'No mistake — it\'s all correct';
// Build a question tuple [q, answer, w1, w2, w3, expl] from lines with a 1-based bad line.
export function codeQ(title, lines, bad, fix, rnd = Math.random) {
  const w = String(lines.length).length;
  const body = lines.map((l, i) => `${String(i + 1).padStart(w, ' ')}│ ${l}`).join('\n');
  const q = `🔍 Find the mistake — ${title}\n\`\`\`\n${body}\n\`\`\``;
  const others = lines.map((_, i) => i + 1).filter((n) => n !== bad && lines[n - 1].trim() && !/^\s*[})\]]+;?\s*$/.test(lines[n - 1]));
  // deterministic-ish pick of 3 other lines (closest to the bad one feel most plausible)
  others.sort((a, b) => Math.abs(a - bad) - Math.abs(b - bad) || a - b);
  const wrong = others.slice(0, 3).map((n) => `Line ${n}`);
  while (wrong.length < 3) wrong.push(ALL_OK);
  return [q, `Line ${bad}`, ...[...new Set(wrong)].slice(0, 3), `Line ${bad}: ${fix}`];
}
export function partsQ(title, parts, bad, fix) {
  const q = `🔍 Find the mistake — ${title}\n“${parts.join(' ')}”`;
  return [q, parts[bad], ...parts.filter((_, i) => i !== bad).slice(0, 3), `“${parts[bad]}” — ${fix}`];
}

// ------------------------------------------------------------ procedural maths (one wrong step, later steps follow it)
const pick = (r, a) => a[r.int(0, a.length - 1)];
const sg = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);
export const MATH_MISTAKES = {
  mAdd: (r) => { // column addition with carrying
    const a = r.int(15, 79), b = r.int(15, 89 - a + 10); const ao = a % 10, bo = b % 10, at = Math.floor(a / 10), bt = Math.floor(b / 10);
    const os = ao + bo, carry = os >= 10 ? 1 : 0; const k = pick(r, carry ? [1, 2, 3] : [1, 3]);
    const os2 = k === 1 ? os + pick(r, [1, -1]) : os; const c2 = os2 >= 10 ? 1 : 0;
    const ts = at + bt + (k === 2 ? 0 : c2); const ans = k === 3 ? ts * 10 + (os2 % 10) + 10 : ts * 10 + (os2 % 10);
    const lines = [`Ones: ${ao} + ${bo} = ${os2}${c2 ? ` → write ${os2 % 10}, carry 1` : ''}`, `Tens: ${at} + ${bt}${k === 2 ? '' : c2 ? ' + 1' : ''} = ${ts}`, `Answer: ${ans}`];
    const fix = k === 1 ? `${ao} + ${bo} = ${os}.` : k === 2 ? 'Forgot to add the carried 1 to the tens.' : `Tens ${ts} and ones ${os2 % 10} make ${ts * 10 + (os2 % 10)}.`;
    return codeQ(`${a} + ${b}`, lines, k, fix, r);
  },
  mSub: (r) => { // take away the tens, then the ones
    const a = r.int(41, 95), b = r.int(12, a - 10); const bt = Math.floor(b / 10) * 10, bo = b % 10; const k = pick(r, [1, 2]);
    const x = a - bt + (k === 1 ? 10 : 0), y = x - bo + (k === 2 ? pick(r, [1, -1]) : 0);
    return codeQ(`${a} − ${b}`, [`${a} − ${bt} = ${x}`, `${x} − ${bo} = ${y}`, `So ${a} − ${b} = ${y}`], k, k === 1 ? `${a} − ${bt} = ${a - bt}.` : `${x} − ${bo} = ${x - bo}.`);
  },
  mTimes: (r) => { const a = r.int(6, 9), b = r.int(6, 9); const k = pick(r, [2, 3, 4]);
    const p5 = a * 5 + (k === 2 ? 5 : 0), rest = a * (b - 5) + (k === 3 ? a : 0); const tot = p5 + rest + (k === 4 ? 10 : 0);
    return codeQ(`${a} × ${b} by splitting`, [`${a} × ${b} = ${a} × 5 + ${a} × ${b - 5}`, `${a} × 5 = ${p5}`, `${a} × ${b - 5} = ${rest}`, `${p5} + ${rest} = ${tot}`], k, k === 2 ? `${a} × 5 = ${a * 5}.` : k === 3 ? `${a} × ${b - 5} = ${a * (b - 5)}.` : `${p5} + ${rest} = ${p5 + rest}.`); },
  mDiv: (r) => { const d = r.int(3, 9), q = r.int(4, 12), n = d * q; const k = pick(r, [2, 3]);
    return codeQ(`${n} ÷ ${d}`, [`Think: ${d} × ? = ${n}`, k === 2 ? `${d} × ${q} = ${n + d}` : `${d} × ${q} = ${n}`, `So ${n} ÷ ${d} = ${k === 3 ? q + 1 : q}`], k, k === 2 ? `${d} × ${q} = ${n}.` : `${d} × ${q} = ${n}, so the answer is ${q}.`); },
  mFracEq: (r) => { const a = r.int(1, 4), b = r.int(a + 1, 6), m = r.int(2, 4); const k = pick(r, [2, 3]);
    return codeQ(`make a fraction equal to ${a}/${b}`, [`Multiply top and bottom by ${m}`, k === 2 ? `${a} × ${m} = ${a * m + 1}` : `${a} × ${m} = ${a * m}`, k === 3 ? `${b} + ${m} = ${b + m}` : `${b} × ${m} = ${b * m}`, `${a}/${b} = ${k === 2 ? a * m + 1 : a * m}/${k === 3 ? b + m : b * m}`], k, k === 2 ? `${a} × ${m} = ${a * m}.` : `Multiply the bottom too: ${b} × ${m} = ${b * m}.`); },
  mPerim: (r) => { const l = r.int(4, 15), w = r.int(2, l - 1); const k = pick(r, [2, 3]);
    return codeQ(`perimeter of a ${l} m × ${w} m rectangle`, [`P = 2 × (length + width)`, k === 2 ? `P = 2 × (${l} × ${w})` : `P = 2 × (${l} + ${w})`, k === 2 ? `P = ${2 * l * w} m` : `P = ${2 * (l + w) + pick(r, [2, -2, 10])} m`], k, k === 2 ? 'Add length and width — multiplying gives area.' : `2 × ${l + w} = ${2 * (l + w)}.`); },
  mFracAdd: (r) => { const b = r.int(2, 6), d = r.int(2, 7); const a = r.int(1, b - 1), c = r.int(1, d - 1); const k = pick(r, [2, 3]);
    const L = [`${a}/${b} + ${c}/${d}`, k === 2 ? `= ${a + c}/${b + d}` : `= ${a * d}/${b * d} + ${c * b}/${b * d}`, k === 2 ? `(done)` : `= ${a * d + c * b + 1}/${b * d}`];
    return codeQ(`${a}/${b} + ${c}/${d}`, L, k, k === 2 ? 'Never add denominators — use a common denominator first.' : `${a * d} + ${c * b} = ${a * d + c * b}.`); },
  mPercent: (r) => { const p = pick(r, [10, 15, 20, 25, 30, 40]), price = r.int(2, 20) * 10; const k = pick(r, [2, 3]);
    const off = price * p / 100;
    return codeQ(`${p}% off a $${price} item`, [`Discount = ${p}% of $${price}`, k === 2 ? `= ${p} × ${price} = $${p * price}` : `= ${p / 100} × ${price} = $${off}`, `Pay $${price} − $${k === 2 ? p * price : off} = $${k === 3 ? price + off : price - (k === 2 ? p * price : off)}`], k, k === 2 ? `${p}% means ${p}/100 = ${p / 100}.` : `Subtract the discount: $${price - off}.`); },
  mOrder: (r) => { const a = r.int(2, 9), b = r.int(2, 6), c = r.int(2, 6), d = r.int(1, 5); const k = pick(r, [1, 3]);
    if (k === 1) return codeQ(`${a} + ${b} × ${c} − ${d}`, [`${a} + ${b} = ${a + b}`, `${a + b} × ${c} = ${(a + b) * c}`, `${(a + b) * c} − ${d} = ${(a + b) * c - d}`], 1, `Multiply first: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} − ${d} = ${a + b * c - d}.`);
    return codeQ(`${a} + ${b} × ${c} − ${d}`, [`${b} × ${c} = ${b * c}`, `${a} + ${b * c} = ${a + b * c}`, `${a + b * c} − ${d} = ${a + b * c + d}`], 3, `${a + b * c} − ${d} = ${a + b * c - d}.`); },
  mLinear: (r) => { // ax + b = c
    const a = r.int(2, 7), x = r.int(-5, 9) || 3, b = r.int(-9, 12) || 4, c = a * x + b; const k = pick(r, [2, 3, 4]);
    const okOp = b > 0 ? `− ${b}` : `+ ${-b}`, badOp = b > 0 ? `+ ${b}` : `− ${-b}`;
    const step = k === 2 ? c + b : c - b; const prod = k === 3 ? step + pick(r, [1, -1, 2]) : step;
    const div = (v) => (v % a === 0 ? `${v / a}` : `${v}/${a}`);
    const last = k === 4 ? `x = ${prod} × ${a} = ${prod * a}` : `x = ${div(prod)}`;
    return codeQ(`solve ${a}x ${sg(b)} = ${c}`, [`${a}x ${sg(b)} = ${c}`, `${a}x = ${c} ${k === 2 ? badOp : okOp}`, `${a}x = ${prod}`, last], k,
      k === 2 ? `Undo ${sg(b)} with the opposite operation: ${a}x = ${c} ${okOp} = ${c - b}.` : k === 3 ? `${c} ${okOp} = ${c - b}.` : `Divide both sides by ${a}: x = ${div(c - b)}.`);
  },
  mDistrib: (r) => { const a = r.int(2, 6), b = r.int(1, 9), c = r.int(1, 6); const k = pick(r, [2, 3]);
    return codeQ(`simplify ${a}(x − ${b}) + ${c}x`, [`${a}(x − ${b}) + ${c}x`, k === 2 ? `= ${a}x − ${b} + ${c}x` : `= ${a}x − ${a * b} + ${c}x`, k === 2 ? `= ${a + c}x − ${b}` : `= ${a * c}x − ${a * b}`], k, k === 2 ? `Multiply BOTH terms: ${a} × ${b} = ${a * b}.` : `Like terms add: ${a}x + ${c}x = ${a + c}x.`); },
  mExpo: (r) => { const m = r.int(2, 6), n = r.int(2, 5); const k = pick(r, [2, 3]);
    return codeQ(`simplify (x^${m})^${n} · x`, [`(x^${m})^${n} · x`, k === 2 ? `= x^${m + n} · x` : `= x^${m * n} · x`, k === 2 ? `= x^${m + n + 1}` : `= x^${m * n * 1}`], k, k === 2 ? `Power of a power multiplies: x^${m * n}.` : `x = x^1, and multiplying adds exponents: x^${m * n + 1}.`); },
  mPythag: (r) => { const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]]); const k = pick(r, [2, 3]);
    return codeQ(`hypotenuse with legs ${a} and ${b}`, [`c² = a² + b²`, k === 2 ? `c² = ${a * 2} + ${b * 2} = ${2 * (a + b)}` : `c² = ${a * a} + ${b * b} = ${a * a + b * b}`, k === 3 ? `c = ${(a * a + b * b) / 2}` : `c = √${2 * (a + b)}`], k, k === 2 ? `Square, don't double: ${a}² = ${a * a}, ${b}² = ${b * b}.` : `Take the square root: √${c * c} = ${c}.`); },
  mMean: (r) => { const xs = [r.int(2, 20), r.int(2, 20), r.int(2, 20), r.int(2, 20)]; const s = xs.reduce((p, q) => p + q, 0); const k = pick(r, [2, 3]);
    return codeQ(`mean of ${xs.join(', ')}`, [`Add them up`, `${xs.join(' + ')} = ${k === 2 ? s + 2 : s}`, `${k === 2 ? s + 2 : s} ÷ ${k === 3 ? 3 : 4} = ${Math.round(((k === 2 ? s + 2 : s) / (k === 3 ? 3 : 4)) * 100) / 100}`], k, k === 2 ? `The total is ${s}.` : 'Divide by how many numbers there are: 4.'); },
  mSlope: (r) => { const x1 = r.int(-3, 3), y1 = r.int(-4, 5), dx = r.int(1, 4), m = r.int(-3, 4) || 2; const x2 = x1 + dx, y2 = y1 + m * dx; const k = pick(r, [2, 3]);
    return codeQ(`slope through (${x1}, ${y1}) and (${x2}, ${y2})`, [`m = (y₂ − y₁) / (x₂ − x₁)`, k === 2 ? `m = (${x2} − ${x1}) / (${y2} − ${y1})` : `m = (${y2} − ${y1}) / (${x2} − ${x1})`, k === 2 ? `m = ${dx}/${m * dx}` : `m = ${m * dx}/${dx} = ${m * dx + dx}`], k, k === 2 ? "Rise over run: y's on top." : `${m * dx} ÷ ${dx} = ${m}.`); },
  mFactor: (r) => { const p = r.int(1, 7), q = r.int(1, 7); const b = p + q, c = p * q; const k = pick(r, [2, 3]);
    return codeQ(`solve x² + ${b}x + ${c} = 0`, [`x² + ${b}x + ${c} = 0`, k === 2 ? `(x + ${p})(x − ${q}) = 0` : `(x + ${p})(x + ${q}) = 0`, k === 3 ? `x = ${p} or x = ${q}` : `x = −${p} or x = ${q}`], k, k === 2 ? `Need two numbers that add to ${b} and multiply to ${c}: +${p} and +${q}.` : `x + ${p} = 0 gives x = −${p} (and x = −${q}).`); },
  mDeriv: (r) => { const a = r.int(2, 6), n = r.int(2, 5), b = r.int(1, 9); const k = pick(r, [2, 3]);
    return codeQ(`d/dx of ${a}x^${n} + ${b}x`, [`d/dx(${a}x^${n}) + d/dx(${b}x)`, k === 2 ? `= ${a * n}x^${n} + ${b}` : `= ${a * n}x^${n - 1} + ${b}`, k === 3 ? `= ${a * n}x^${n - 1} + ${b}x` : `(done)`], k, k === 2 ? `Power rule lowers the exponent: ${a * n}x^${n - 1}.` : `d/dx(${b}x) = ${b} — the x disappears.`); },
  mLog: (r) => { const bse = pick(r, [2, 3, 10]), e1 = r.int(1, 4), e2 = r.int(1, 3); const k = pick(r, [2, 3]);
    return codeQ(`log_${bse}(${bse ** e1} × ${bse ** e2})`, [`= log_${bse}(${bse ** e1}) + log_${bse}(${bse ** e2})`, k === 2 ? `= ${e1} × ${e2}` : `= ${e1} + ${e2}`, `= ${k === 2 ? e1 * e2 : e1 + e2 + 1}`], k, k === 2 ? 'Logs of a product ADD.' : `${e1} + ${e2} = ${e1 + e2}.`); },
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
    { ci: 0, title: 'print the average', code: ['nums = [4, 8, 15]', 'total = sum(nums)', 'avg = total / len(num)', 'print(avg)'], bad: 3, fix: '`num` is undefined (NameError) — it should be `nums`.' },
    { ci: 0, title: 'add one to an age', code: ['age = input("Age? ")', 'next_year = age + 1', 'print(next_year)'], bad: 2, fix: 'input() returns a string — use int(age) + 1.' },
    { ci: 1, title: 'loop over a dict', code: ['scores = {"ana": 90, "ben": 72}', 'for name, score in scores:', '    print(name, score)'], bad: 2, fix: 'Looping a dict gives keys only — use scores.items().' },
    { ci: 1, title: 'smallest item', code: ['items = [3, 1, 2]', 'items = items.sort()', 'print(items[0])'], bad: 2, fix: 'list.sort() sorts in place and returns None — call items.sort() or use sorted(items).' },
    { ci: 2, title: 'collect tags', code: ['def add_tag(tag, tags=[]):', '    tags.append(tag)', '    return tags', 'print(add_tag("a"), add_tag("b"))'], bad: 1, fix: 'A mutable default list is shared between calls — use tags=None and create a new list inside.' },
    { ci: 2, title: 'a counter', code: ['count = 0', 'def bump():', '    count += 1', 'bump()'], bad: 3, fix: 'Assigning makes count local (UnboundLocalError) — declare global count, or better, pass and return it.' },
    { ci: 3, title: 'a class', code: ['class Dog:', '    def __init__(name):', '        self.name = name', '    def speak(self):', '        return self.name + " says woof"'], bad: 2, fix: 'Methods need self first: def __init__(self, name).' },
    { ci: 4, title: 'a generator of squares', code: ['def squares(n):', '    for i in range(n):', '        return i * i', 'print(list(squares(3)))'], bad: 3, fix: 'return exits on the first value — use yield to produce each square.' },
    { ci: 4, title: 'read a file', code: ['with open("data.txt") as f:', '    lines = f.readlines()', 'print(len(lines))', 'for line in f:', '    print(line)'], bad: 4, fix: 'The file is closed once the with-block ends — loop over lines (or move the loop inside).' },
    { ci: 5, title: 'catch two errors', code: ['try:', '    value = int(text)', 'except ValueError or TypeError:', '    value = 0'], bad: 3, fix: '`ValueError or TypeError` is just ValueError — use except (ValueError, TypeError):' },
    { ci: 6, title: 'count in threads', code: ['counter = 0', 'def work():', '    global counter', '    for _ in range(100_000):', '        counter += 1'], bad: 5, fix: 'counter += 1 is not atomic across threads — protect it with a threading.Lock.' },
    { ci: 7, title: 'a 3×3 grid', code: ['grid = [[0] * 3] * 3', 'grid[0][0] = 1', 'print(grid)  # expect only one 1'], bad: 1, fix: 'All three rows are the same list — use [[0] * 3 for _ in range(3)].' },
    { ci: 7, title: 'compare numbers', code: ['x = int("1000")', 'if x is 1000:', '    print("match")'], bad: 2, fix: '`is` checks identity, not value — use ==.' },
  ],
  golang: [
    { ci: 0, title: 'increment', code: ['func main() {', '    x := 5', '    x := x + 1', '    fmt.Println(x)', '}'], bad: 3, fix: ':= needs a new variable on the left — use x = x + 1.' },
    { ci: 0, title: 'greeting', code: ['func greet(name string) string {', '    msg := "Hi " + name', '    return', '}'], bad: 3, fix: 'The function returns a string — return msg.' },
    { ci: 1, title: 'word counts', code: ['var counts map[string]int', 'counts["go"]++', 'fmt.Println(counts)'], bad: 1, fix: 'A nil map panics on write — counts := make(map[string]int).' },
    { ci: 1, title: 'grow a slice', code: ['s := []int{1, 2, 3}', 'append(s, 4)', 'fmt.Println(s)'], bad: 2, fix: 'append returns the new slice — s = append(s, 4).' },
    { ci: 2, title: 'a counter type', code: ['type Counter struct{ n int }', 'func (c Counter) Inc() { c.n++ }', 'c := Counter{}', 'c.Inc()'], bad: 2, fix: 'A value receiver changes a copy — use func (c *Counter) Inc().' },
    { ci: 3, title: 'type assertion', code: ['var v any = "hi"', 'n := v.(int)', 'fmt.Println(n)'], bad: 2, fix: 'This panics when v isn\'t an int — use n, ok := v.(int).' },
    { ci: 4, title: 'open a file', code: ['f, err := os.Open("cfg.json")', 'defer f.Close()', 'if err != nil {', '    return err', '}'], bad: 2, fix: 'Check err first — f is nil when Open fails. Defer Close after the check.' },
    { ci: 5, title: 'send and receive', code: ['ch := make(chan int)', 'ch <- 42', 'fmt.Println(<-ch)'], bad: 2, fix: 'An unbuffered send blocks forever with no receiver (deadlock) — send from a goroutine or buffer the channel.' },
    { ci: 5, title: 'wait for workers', code: ['var wg sync.WaitGroup', 'for i := 0; i < 3; i++ {', '    go func() {', '        wg.Add(1)', '        defer wg.Done()', '        work()', '    }()', '}', 'wg.Wait()'], bad: 4, fix: 'Call wg.Add(1) before starting the goroutine, or Wait may return too early.' },
    { ci: 6, title: 'JSON output', code: ['type User struct {', '    name string `json:"name"`', '}', 'b, _ := json.Marshal(User{name: "Ana"}) // {}'], bad: 2, fix: 'encoding/json skips unexported fields — rename to Name.' },
  ],
  cs: [
    { ci: 0, title: 'a complexity claim', code: ['# Claim: this is O(n)', 'for i in range(n):', '    for j in range(i, n):', '        total += a[i] * a[j]'], bad: 1, fix: 'Nested loops over n give about n²/2 steps: O(n²).' },
    { ci: 1, title: 'take the newest item', code: ['stack = []', 'stack.append(1)', 'stack.append(2)', 'top = stack.pop(0)  # want the newest'], bad: 4, fix: 'pop(0) removes the oldest (queue behaviour) — a stack uses pop().' },
    { ci: 2, title: 'binary search', code: ['def bsearch(a, x):', '    lo, hi = 0, len(a) - 1', '    while lo < hi:', '        mid = (lo + hi) // 2', '        if a[mid] == x: return mid', '        if a[mid] < x: lo = mid + 1', '        else: hi = mid - 1', '    return -1'], bad: 3, fix: 'Use lo <= hi, or a one-element range is never checked.' },
    { ci: 3, title: 'breadth-first search', code: ['def bfs(start):', '    queue = deque([start])', '    while queue:', '        node = queue.popleft()', '        for nb in graph[node]:', '            queue.append(nb)'], bad: 6, fix: 'Without a visited set, cycles loop forever — only enqueue unseen neighbours and mark them visited.' },
    { ci: 4, title: 'factorial', code: ['def fact(n):', '    if n == 1:', '        return 1', '    return n * fact(n - 1)', 'print(fact(0))'], bad: 2, fix: 'fact(0) never hits the base case — use if n <= 1.' },
    { ci: 4, title: 'memoised Fibonacci', code: ['memo = {}', 'def fib(n):', '    if n < 2: return n', '    if n in memo: return memo[n]', '    return fib(n - 1) + fib(n - 2)'], bad: 5, fix: 'The result is never stored — memo[n] = fib(n-1) + fib(n-2), then return it.' },
    { ci: 6, title: 'SQL: busy customers', code: ['SELECT name, COUNT(*)', 'FROM orders', 'WHERE COUNT(*) > 5', 'GROUP BY name;'], bad: 3, fix: 'Filter groups with HAVING COUNT(*) > 5 after GROUP BY — WHERE can\'t use aggregates.' },
  ],
  softeng: [
    { ci: 1, title: 'a class hierarchy', code: ['class Bird { fly() { … } }', 'class Sparrow extends Bird { fly() { flap(); } }', 'class Penguin extends Bird { fly() { throw Error("can\'t") } }', 'birds.forEach(b => b.fly());'], bad: 3, fix: 'Penguin breaks Liskov Substitution — not every Bird can fly; model flying separately.' },
    { ci: 3, title: 'a unit test', code: ['test("adds tax", () => {', '  const total = addTax(100);', '  expect(total).toBe(113);', '  expect(addTax(0)).toBeTruthy;', '});'], bad: 4, fix: 'toBeTruthy is never called (missing ()), so the assertion silently does nothing.' },
    { ci: 4, title: 'REST routes', code: ['GET    /users/42         → read user', 'POST   /users/42/delete  → delete user', 'PUT    /users/42         → replace user', 'POST   /users            → create user'], bad: 2, fix: 'Use the DELETE method on the resource: DELETE /users/42.' },
    { ci: 4, title: 'status codes', code: ['order created    → 201 Created', 'order not found  → 404 Not Found', 'invalid input    → 200 OK', 'too many calls   → 429 Too Many Requests'], bad: 3, fix: 'Bad client input should be 400 Bad Request (or 422).' },
    { ci: 6, title: 'back-of-envelope', code: ['1,000,000 users × 10 requests/day', '= 10,000,000 requests/day', '÷ 86,400 seconds/day', '≈ 1,157,000 requests/second'], bad: 4, fix: '10M ÷ 86,400 ≈ 116 requests per second.' },
  ],
  devops: [
    { ci: 0, title: 'a bash script', code: ['#!/bin/bash', 'NAME = "hakma"', 'echo "Deploying $NAME"', 'exit 0'], bad: 2, fix: 'No spaces around = in shell assignments: NAME="hakma".' },
    { ci: 1, title: 'ship a fix', code: ['git switch main', 'git pull', 'git commit -am "fix login"', 'git push --force'], bad: 4, fix: 'Force-pushing a shared main rewrites everyone\'s history — use a normal push (or a PR).' },
    { ci: 2, title: 'a CI pipeline', code: ['steps:', '  - run: npm ci', '  - run: npm test || true', '  - run: npm run build'], bad: 3, fix: '`|| true` hides failing tests — the pipeline must fail when tests fail.' },
    { ci: 3, title: 'a Dockerfile', code: ['FROM node:22-alpine', 'WORKDIR /app', 'COPY . .', 'RUN npm ci', 'CMD ["node", "server.js"]'], bad: 3, fix: 'Copying everything first busts the cache — COPY package*.json, RUN npm ci, then COPY the rest.' },
    { ci: 6, title: 'an error budget', code: ['SLO: 99.9% per 30-day month', '30 days = 43,200 minutes', 'Budget = 0.1% × 43,200', '= 432 minutes'], bad: 4, fix: '0.1% of 43,200 is 43.2 minutes.' },
  ],
  kubernetes: [
    { ci: 0, title: 'a Pod manifest', code: ['apiVersion: v1', 'kind: pod', 'metadata:', '  name: web', 'spec:', '  containers:', '  - name: web', '    image: nginx:1.27'], bad: 2, fix: 'kind is case-sensitive: Pod.' },
    { ci: 1, title: 'a Deployment', code: ['kind: Deployment', 'spec:', '  replicas: 3', '  selector:', '    matchLabels: {app: api}', '  template:', '    metadata:', '      labels: {app: web}'], bad: 8, fix: 'Template labels must match the selector (app: api).' },
    { ci: 2, title: 'a Service (pods are labelled app: web)', code: ['kind: Service', 'spec:', '  selector:', '    app: frontend', '  ports:', '  - port: 80'], bad: 4, fix: 'The selector matches no pods, so the Service has no endpoints — use app: web.' },
    { ci: 3, title: 'a Secret', code: ['apiVersion: v1', 'kind: Secret', 'metadata: {name: db}', 'data:', '  password: hunter2'], bad: 5, fix: 'data values must be base64 — encode it, or use stringData for plain text.' },
    { ci: 4, title: 'container resources', code: ['resources:', '  requests:', '    memory: "512Mi"', '  limits:', '    memory: "256Mi"'], bad: 5, fix: 'A limit can\'t be lower than the request.' },
    { ci: 6, title: 'a read-only Role', code: ['kind: Role', 'rules:', '- apiGroups: [""]', '  resources: ["pods"]', '  verbs: ["*"]'], bad: 5, fix: 'Read-only should be ["get", "list", "watch"] — "*" grants everything (least privilege).' },
  ],
  terraform: [
    { ci: 0, title: 'a bucket and its output', code: ['resource "aws_s3_bucket" "logs" {', '  bucket = "acme-logs"', '}', 'output "bucket_arn" {', '  value = aws_s3_bucket.log.arn', '}'], bad: 5, fix: 'The resource is named logs: aws_s3_bucket.logs.arn.' },
    { ci: 2, title: 'a variable', code: ['variable "env" {', '  type    = number', '  default = "dev"', '}'], bad: 2, fix: '"dev" is a string — type = string.' },
    { ci: 2, title: 'three instances', code: ['resource "aws_instance" "web" {', '  count = 3', '  ami   = var.ami', '  tags  = { Name = "web-${count}" }', '}'], bad: 4, fix: 'Use count.index for each instance\'s number.' },
    { ci: 3, title: 'a remote backend', code: ['terraform {', '  backend "s3" {', '    bucket = "acme-tfstate"', '    key    = var.state_key', '  }', '}'], bad: 4, fix: 'Backend blocks can\'t use variables — hard-code it or pass -backend-config.' },
    { ci: 4, title: 'use a module', code: ['module "vpc" {', '  source  = "terraform-aws-modules/vpc/aws"', '  version = "latest"', '  cidr    = "10.0.0.0/16"', '}'], bad: 3, fix: 'version needs a constraint like "~> 5.0" — "latest" isn\'t valid.' },
    { ci: 6, title: 'a password variable', code: ['variable "db_password" {', '  type      = string', '  sensitive = false', '}'], bad: 3, fix: 'Mark secrets sensitive = true so they\'re hidden in plan output.' },
  ],
  electrical: [
    { ci: 0, title: '12 V across 4 Ω', code: ['V = 12 V, R = 4 Ω', 'I = V × R', 'I = 48 A', 'P = V × I = 576 W'], bad: 2, fix: 'Ohm\'s law: I = V / R = 3 A (then P = 36 W).' },
    { ci: 1, title: '6 Ω parallel with 3 Ω', code: ['1/R = 1/6 + 1/3', '1/R = 1/6 + 2/6', '1/R = 3/6', 'R = 0.5 Ω'], bad: 4, fix: 'Flip it: R = 6/3 = 2 Ω.' },
    { ci: 2, title: 'RC time constant', code: ['R = 10 kΩ, C = 100 µF', 'τ = R × C', 'τ = 10,000 × 100', 'τ = 1,000,000 s'], bad: 3, fix: '100 µF = 100 × 10⁻⁶ F, so τ = 10,000 × 0.0001 = 1 s.' },
    { ci: 3, title: 'reactive power', code: ['S = 10 kVA, PF = 0.8', 'P = S × PF = 8 kW', 'Q = S − P = 2 kVAR'], bad: 3, fix: 'Powers form a triangle: Q = √(S² − P²) = 6 kVAR.' },
  ],
  electrician: [
    { ci: 0, title: 'safe work order', code: ['Notify people affected', 'Switch off the breaker', 'Start work on the circuit', 'Apply your lock and tag'], bad: 3, fix: 'Lock out, tag, and verify de-energised BEFORE any work starts.' },
    { ci: 1, title: 'a heater circuit', code: ['Heater: 1,800 W at 120 V', 'I = P / V', 'I = 1,800 / 120 = 15 A', 'Put it on a 15 A circuit'], bad: 4, fix: 'A continuous load should be ≤ 80% of the breaker (12 A on 15 A) — it needs a larger circuit. Always check your local code.' },
    { ci: 3, title: 'a kitchen circuit plan', code: ['Wire: 14 AWG copper', 'Breaker: 20 A', 'Receptacles: tamper-resistant', 'GFCI protection near the sink'], bad: 2, fix: '14 AWG copper is typically limited to 15 A — use 12 AWG for 20 A.' },
    { ci: 7, title: 'troubleshooting', code: ['Outlet dead: meter reads 0 V hot–neutral', 'Breaker is ON, not tripped', 'Conclusion: nothing is wrong', 'Next: check upstream GFCI / loose connections'], bad: 3, fix: '0 V on a live circuit means a fault — keep tracing.' },
  ],
  physics: [
    { ci: 0, title: 'distance from rest', code: ['u = 0, a = 3 m/s², t = 4 s', 'v = u + at = 12 m/s', 's = ut + ½at²', 's = ½ × 3 × 4 = 6 m'], bad: 4, fix: 'Square the time: ½ × 3 × 16 = 24 m.' },
    { ci: 1, title: 'acceleration', code: ['m = 5 kg, F = 20 N', 'a = F × m', 'a = 100 m/s²'], bad: 2, fix: 'a = F / m = 4 m/s².' },
    { ci: 2, title: 'kinetic energy', code: ['m = 2 kg, v = 3 m/s', 'KE = ½mv²', 'KE = ½ × 2 × 3', 'KE = 3 J'], bad: 3, fix: 'v² = 9, so KE = ½ × 2 × 9 = 9 J.' },
    { ci: 4, title: 'speed of a wave', code: ['f = 440 Hz, λ = 0.78 m', 'v = f / λ', 'v ≈ 564 m/s'], bad: 2, fix: 'v = f × λ ≈ 343 m/s.' },
    { ci: 5, title: '3 Ω and 6 Ω in series', code: ['R₁ = 3 Ω, R₂ = 6 Ω (series)', 'R = (R₁ × R₂) / (R₁ + R₂)', 'R = 2 Ω'], bad: 2, fix: 'That\'s the parallel formula — series adds: 9 Ω.' },
  ],
  chemistry: [
    { ci: 0, title: 'carbon-14', code: ['Atomic number of C = 6', 'Protons = 6', 'Neutrons = 14', 'Electrons (neutral) = 6'], bad: 3, fix: 'Neutrons = mass number − protons = 8.' },
    { ci: 3, title: 'balance H₂ + O₂ → H₂O', code: ['H₂ + O₂ → H₂O', 'Balance O: H₂ + O₂ → 2H₂O', 'Balance H: H₂ + O₂ → 2H₂O', 'Final: H₂ + O₂ → 2H₂O'], bad: 3, fix: '2H₂O has 4 H, so use 2H₂: 2H₂ + O₂ → 2H₂O.' },
    { ci: 4, title: 'molar mass of water', code: ['H = 1.01, O = 16.00', 'M = 1.01 + 16.00', 'M = 17.01 g/mol'], bad: 2, fix: 'Water has two H: 2(1.01) + 16.00 = 18.02 g/mol.' },
    { ci: 4, title: 'moles of salt', code: ['m(NaCl) = 117 g', 'M(NaCl) = 58.5 g/mol', 'n = M / m = 0.5 mol'], bad: 3, fix: 'n = m / M = 117 / 58.5 = 2 mol.' },
    { ci: 6, title: 'pH', code: ['[H⁺] = 1 × 10⁻³ M', 'pH = −log[H⁺]', 'pH = −3'], bad: 3, fix: '−log(10⁻³) = 3.' },
  ],
  'ela-elem': [
    { ci: 1, title: 'spelling', parts: ['I hav', 'two brothers', 'and a', 'sister.'], bad: 0, fix: 'spelled "have".' },
    { ci: 1, title: 'plurals', parts: ['We saw', 'three mouses', 'in the', 'barn.'], bad: 1, fix: 'the plural of mouse is "mice".' },
    { ci: 2, title: 'verbs', parts: ['The cats', 'is sleeping', 'on the', 'mat.'], bad: 1, fix: 'more than one cat → "are sleeping".' },
    { ci: 2, title: 'adverbs', parts: ['She', 'sings beautiful', 'every', 'morning.'], bad: 1, fix: 'describes how she sings → "beautifully".' },
    { ci: 3, title: 'capitals', parts: ['my dog', 'likes to run', 'in the', 'park.'], bad: 0, fix: 'sentences start with a capital: "My".' },
    { ci: 3, title: 'end marks', parts: ['Where', 'is my', 'red', 'backpack.'], bad: 3, fix: 'it\'s a question → "backpack?"' },
    { ci: 4, title: 'homophones', parts: ['Can I', 'come', 'two the', 'party?'], bad: 2, fix: 'use "to the" (two means 2).' },
  ],
  'ela-high': [
    { ci: 0, title: 'comma splice', parts: ['I finished', 'my essay,', 'I submitted', 'it online.'], bad: 1, fix: 'two sentences joined by a comma — use a semicolon or ", and".' },
    { ci: 0, title: 'dangling modifier', parts: ['Walking to school,', 'the rain', 'soaked', 'my shoes.'], bad: 1, fix: 'the rain wasn\'t walking — "Walking to school, I got my shoes soaked."' },
    { ci: 1, title: 'they\'re / their / there', parts: ['Their going', 'to announce', 'the results', 'tomorrow.'], bad: 0, fix: '"They\'re" = they are.' },
    { ci: 1, title: 'agreement', parts: ['The list', 'of supplies', 'are on', 'the counter.'], bad: 2, fix: 'the subject is "list" (singular) → "is on".' },
    { ci: 1, title: 'its / it\'s', parts: ['The company', 'raised', 'it\'s prices', 'again.'], bad: 2, fix: 'possessive "its" has no apostrophe.' },
    { ci: 1, title: 'who / whom', parts: ['To who', 'should I', 'address', 'the letter?'], bad: 0, fix: 'object of "to" → "whom".' },
    { ci: 1, title: 'fewer / less', parts: ['There were', 'less people', 'at the game', 'than last year.'], bad: 1, fix: 'countable nouns take "fewer".' },
  ],
};

export function mistakeQuestions(topicId) {
  return (MISTAKES[topicId] || []).map((m) => ({ ci: m.ci, t: m.parts ? partsQ(m.title, m.parts, m.bad, m.fix) : codeQ(m.title, m.code, m.bad, m.fix) }));
}
