// Study Lab games: Trial (gatekeeper exam), Match (memory pairs), Sequence (order the steps), Speed (60s blitz).
import { G, recordAnswer, addCodex } from './state.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { esc, shuffle, R, sleep } from '../core/rng.js';

const S = () => G.save, W = () => G.W;
function reward(flag, give, text) {
  const s = S(); if (s.flags[flag]) { s.money += 40; return 'Practice bonus: ¤40.'; }
  s.flags[flag] = 1; give(s); audio.sfx('badge'); return text;
}

export async function trial(ci, practice = false) {
  const c = W().cities[ci]; const n = practice ? 5 : 8; let score = 0;
  for (let i = 0; i < n; i++) {
    const q = W().pickQ(ci, S(), { mix: false, review: 0 });
    const r = await ui.question(q, { tag: `${c.name} Trial · ${i + 1}/${n} · Score ${score}` });
    recordAnswer(S(), q, r.correct, r.quick); if (r.correct) score++;
  }
  if (practice) { S().money += score * 20; await ui.say(`Practice score: *${score}/${n}*. Earned ¤${score * 20}.`, { name: 'Lab Keeper' }); return; }
  if (score >= 6) {
    S().flags['trial' + ci] = 1; S().bag.cube = (S().bag.cube || 0) + 3; S().money += 300; audio.sfx('badge');
    await ui.say([`*${score}/${n}* — you passed the ${c.name} Trial!`, 'The Mastery Hall will now admit you. Take 3 Capture Cubes and ¤300 too.', `Tip: Leader ${c.leader} favors ${c.type}-type Hakma.`], { name: 'Lab Keeper' });
  } else await ui.say([`*${score}/${n}*. You need 6 to pass.`, 'Talk to people around town, read your Codex, try the stations, then come back!'], { name: 'Lab Keeper' });
  G.autosave?.(); G.events.checkObjective();
}

export async function station(game, ci) {
  if (game === 'match') return match(ci);
  if (game === 'sequence') return sequence(ci);
  return speed(ci);
}

async function match(ci) {
  const c = W().cities[ci]; const terms = shuffle(c.terms).slice(0, 6);
  if (terms.length < 3) return speed(ci);
  if (!(await ui.confirm(`MATCH STATION — flip cards to pair each term with its meaning. ${terms.length} pairs. Ready?`))) return;
  const cards = shuffle(terms.flatMap((t) => [{ id: t.id, txt: t.term, kind: 't' }, { id: t.id, txt: t.def, kind: 'd' }]));
  let open = [], matched = new Set(), moves = 0, lock = false;
  await ui.panel({ title: `Match — ${esc(c.theme)}`, wide: true, cols: 4, cls: 'matchp',
    render: () => `<div class="mgrid">${cards.map((k, i) => { const up = matched.has(k.id) || open.includes(i); return `<button data-nav data-act="flip" data-arg="${i}" class="card ${up ? 'up' : ''} ${matched.has(k.id) ? 'done' : ''} ${k.kind}">${up ? esc(k.txt) : '<span>?</span>'}</button>`; }).join('')}</div><p class="dim">Moves: ${moves} · Pairs: ${matched.size}/${terms.length}</p>`,
    actions: { flip: async (a, el, rr, layer) => {
      const i = +a; if (lock || open.includes(i) || matched.has(cards[i].id)) return;
      open.push(i); audio.sfx('blip'); rr();
      if (open.length === 2) {
        moves++; const [x, y] = open; lock = true;
        if (cards[x].id === cards[y].id && cards[x].kind !== cards[y].kind) { matched.add(cards[x].id); addCodex(S(), cards[x].id); audio.sfx('correct'); open = []; lock = false; rr(); if (matched.size === terms.length) { await sleep(300); const msg = reward(`st_match${ci}`, (s) => { s.bag.cube2 = (s.bag.cube2 || 0) + 2; }, 'First clear reward: 2 *Prime Cubes*!'); layer.close(); await ui.say([`All pairs matched in ${moves} moves!`, msg]); } }
        else { audio.sfx('wrong'); await sleep(900); open = []; lock = false; rr(); }
      }
    } } });
}

async function sequence(ci) {
  const c = W().cities[ci]; const seqs = c.seq || [];
  if (!seqs.length) return definitionDash(ci);
  const [title, steps] = seqs[Math.floor(R() * seqs.length)];
  if (!(await ui.confirm(`SEQUENCE STATION — ${title}. Pick the steps in the correct order.`))) return;
  const pool = shuffle(steps.map((s, i) => ({ s, i }))); const built = []; let mistakes = 0;
  await ui.panel({ title: `Sequence — ${esc(title)}`, wide: true, cls: 'seqp',
    render: () => `<ol class="built">${built.map((b) => `<li>${esc(b.s)}</li>`).join('')}${built.length < steps.length ? '<li class="next">…</li>' : ''}</ol><div class="pool">${pool.filter((p) => !built.includes(p)).map((p) => `<button data-nav data-act="pick" data-arg="${p.i}">${esc(p.s)}</button>`).join('')}</div><p class="dim">Mistakes: ${mistakes}</p>`,
    actions: { pick: async (a, el, rr, layer) => {
      const p = pool.find((x) => x.i === +a); if (p.i === built.length) { built.push(p); audio.sfx('correct'); rr(); if (built.length === steps.length) { const msg = reward(`st_sequence${ci}`, (s) => { s.money += 400; }, 'First clear reward: ¤400!'); layer.close(); await ui.say([`Sequence complete with ${mistakes} mistake${mistakes === 1 ? '' : 's'}!`, msg]); } }
      else { mistakes++; audio.sfx('wrong'); el.classList.add('shake'); await sleep(350); }
    } } });
}
async function definitionDash(ci) {
  const c = W().cities[ci]; const qs = c.pool.filter((q) => q.term && q.id.endsWith('r')); if (!qs.length) return speed(ci);
  if (!(await ui.confirm('DEFINITION DASH — read each definition and pick the right term. 6 rounds!'))) return;
  let score = 0;
  for (const Q of shuffle(qs).slice(0, 6)) { const opts = shuffle([Q.a, ...Q.wrong]); const q = { id: Q.id, q: Q.q, opts, answer: opts.indexOf(Q.a), expl: Q.expl, ci, a: Q.a }; const r = await ui.question(q, { tag: 'Definition Dash' }); recordAnswer(S(), q, r.correct, r.quick); if (r.correct) score++; }
  const msg = score >= 4 ? reward(`st_sequence${ci}`, (s) => { s.money += 400; }, 'First clear reward: ¤400!') : 'Score 4+ to earn the reward.';
  await ui.say([`Definition Dash: *${score}/6*.`, msg]);
}

async function speed(ci) {
  if (!(await ui.confirm('SPEED STATION — answer as many as you can in 60 seconds! 8 correct earns the reward.'))) return;
  const end = performance.now() + 60000; let score = 0, n = 0;
  while (performance.now() < end) {
    const left = Math.max(1, Math.round((end - performance.now()) / 1000)); const q = W().pickQ(ci, S(), { mix: false, review: 0.1 });
    const r = await ui.question(q, { tag: `Speed · ${left}s left · ${score} correct`, time: Math.min(left, 12), autoClose: true, quick: 4 });
    n++; recordAnswer(S(), q, r.correct, r.quick); if (r.correct) score++;
  }
  const msg = score >= 8 ? reward(`st_speed${ci}`, (s) => { s.bag.cube2 = (s.bag.cube2 || 0) + 2; }, 'First clear reward: 2 Prime Cubes!') : 'Get 8 correct to earn the reward.';
  await ui.say([`Time! *${score}/${n}* correct.`, msg]);
}
