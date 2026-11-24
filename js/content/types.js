// Six universal elemental types. Every topic maps its concepts onto these.
// Each type is strong against exactly one other and weak to exactly one other (a cycle),
// so the chart is easy to learn: Logic > Cipher > Spark > Data > Structure > Flux > Logic
export const TYPES = {
  logic:     { name: 'Logic',     color: '#4aa8ff', icon: '◆', desc: 'Reasoning, algorithms, rules' },
  cipher:    { name: 'Cipher',    color: '#b36bff', icon: '✦', desc: 'Security, secrets, abstraction' },
  spark:     { name: 'Spark',     color: '#ffd23f', icon: 'ϟ', desc: 'Energy, speed, signals' },
  data:      { name: 'Data',      color: '#3ddc84', icon: '●', desc: 'Information, storage, life' },
  structure: { name: 'Structure', color: '#c98b52', icon: '■', desc: 'Architecture, matter, foundations' },
  flux:      { name: 'Flux',      color: '#ff6a3d', icon: '▲', desc: 'Change, flow, heat, motion' },
  normal:    { name: 'Focus',     color: '#cfcfd8', icon: '○', desc: 'Neutral' },
};
export const TYPE_KEYS = ['logic', 'cipher', 'spark', 'data', 'structure', 'flux'];

// ------------------------------------------------------------ genre themes
// The six type SLOTS (and the cycle logic ▶ cipher ▶ spark ▶ data ▶ structure ▶ flux ▶ logic) never change, so battles,
// saves and balance stay identical. Each genre just gives the slots its own names, icons, colours and move names.
// Per slot: [name, icon, colour, description, [basic, boost, mid, ultimate move], technique-disc move]
const G = (o) => o;
export const GENRES = {
  tech: G({ label: 'Tech' }), // uses the defaults above (Logic, Cipher, Spark, Data, Structure, Flux) and the built-in move sets
  auto: G({ label: 'Cars & Engines',
    logic: ['Coolant', '❄', '#4aa8ff', 'Cooling, fluids, temperature control', ['Coolant Spray', 'Thermostat', 'Radiator Rush', 'Antifreeze Avalanche'], 'Flash Freeze'],
    cipher: ['Combustion', '✹', '#ff6a3d', 'Fire, exhaust, explosive power', ['Backfire', 'Rev Up', 'Exhaust Blast', 'Detonation'], 'Full-Throttle Blast'],
    spark: ['Steel', '⚙', '#9aa8b8', 'Gears, frames, metal parts', ['Gear Grind', 'Torque Up', 'Chassis Slam', 'Crankshaft Crush'], 'Forged Crank'],
    data: ['Rubber', '◎', '#7a7484', 'Tires, belts, grip and seals', ['Tire Spin', 'Grip', 'Burnout', 'Drift King'], 'Launch Control'],
    structure: ['Electric', 'ϟ', '#ffd23f', 'Batteries, sparks, circuits, EVs', ['Spark Plug', 'Charge', 'Alternator Arc', 'Instant Torque'], 'Ludicrous Surge'],
    flux: ['Fuel', '◍', '#c98b52', 'Fuel, oil, octane and flow', ['Fuel Spray', 'Octane Boost', 'Turbo Spool', 'Nitro Rush'], 'Nitro Overdrive'],
    beatsWhy: ['coolant quenches combustion', 'combustion heat warps steel', 'steel shreds rubber', 'rubber insulates electric', 'a spark ignites fuel', 'fuel contaminates coolant'] }),
  trade: G({ label: 'Electrical',
    logic: ['Ground', '⏚', '#3ddc84', 'Earthing, bonding, safety paths', ['Earth Tap', 'Bond', 'Ground Fault', 'Earthing Grid'], 'Equipotential Bond'],
    cipher: ['Resistance', 'Ω', '#c98b52', 'Resistors, loads and heat', ['Ohm Jab', 'Load Up', 'Resistor Ram', 'High-Ohm Wall'], 'Infinite Ohm'],
    spark: ['Voltage', 'ϟ', '#ffd23f', 'Potential, pressure, supply', ['Volt Zap', 'Step Up', 'Arc Flash', 'High-Voltage Storm'], 'Transformer Surge'],
    data: ['Current', '∿', '#4aa8ff', 'Flow of charge, amps, AC/DC', ['Amp Tap', 'Overcurrent', 'Phase Rush', 'Three-Phase Torrent'], 'Short-Circuit Torrent'],
    structure: ['Insulation', '▣', '#b36bff', 'Cable jackets, conduit, protection', ['Sheath', 'Wrap', 'Conduit Crush', 'Double Insulate'], 'Armoured Cable'],
    flux: ['Magnet', '∩', '#ff6a3d', 'Motors, induction, fields', ['Pull', 'Induce', 'Field Flux', 'Rotating Field'], 'Induction Storm'],
    beatsWhy: ['grounding drains a fault', 'resistance drops voltage', 'voltage drives current', 'overcurrent melts insulation', 'insulation shields from fields', 'induction overwhelms ground'] }),
  lang: G({ label: 'Languages',
    logic: ['Grammar', '§', '#4aa8ff', 'Rules, tenses, agreement', ['Conjugate', 'Agree', 'Tense Shift', 'Perfect Syntax'], 'Flawless Grammar'],
    cipher: ['Idiom', '❝', '#b36bff', 'Expressions, slang, hidden meanings', ['Pun', 'Slang', 'False Friend', 'Idiom Riddle'], 'Lost in Translation'],
    spark: ['Voice', '♪', '#ffd23f', 'Sounds, accent, pronunciation', ['Greet', 'Accent', 'Rolling R', 'Perfect Accent'], 'Native Voice'],
    data: ['Word', '✎', '#3ddc84', 'Vocabulary and meaning', ['Word Toss', 'Learn', 'Vocab Volley', 'Dictionary Drop'], 'Thesaurus Storm'],
    structure: ['Story', '❧', '#c98b52', 'Narrative, past tense, telling tales', ['Once Upon', 'Recall', 'Plot Twist', 'Epic Saga'], 'Legend Retold'],
    flux: ['Culture', '✺', '#ff6a3d', 'Customs, food, festivals, life', ['Bise', 'Festa', 'Feast', 'Grand Fiesta'], 'Carnival Parade'],
    beatsWhy: ['grammar tames slang', 'idioms confuse the ear', 'voice brings words alive', 'words build stories', 'stories carry culture', 'culture bends the rules'] }),
  biz: G({ label: 'Business & Finance',
    logic: ['Tax', '%', '#4aa8ff', 'Rules, returns, the CRA', ['Deduct', 'File', 'Audit', 'Tax Bracket'], 'Refund Rush'],
    cipher: ['Cash', '$', '#3ddc84', 'Money in hand and budgets', ['Pay', 'Save Up', 'Cash Flow', 'Emergency Fund'], 'Payday Torrent'],
    spark: ['Debt', '⚠', '#ff6a3d', 'Loans, credit, interest owed', ['Borrow', 'Leverage', 'Interest Bite', 'Compound Debt'], 'Margin Call'],
    data: ['Asset', '◆', '#c98b52', 'Property, equipment, things you own', ['Acquire', 'Appreciate', 'Equity Slam', 'Portfolio'], 'Real-Estate Crush'],
    structure: ['Risk', '⚡', '#b36bff', 'Volatility, insurance, uncertainty', ['Hedge', 'Insure', 'Volatility', 'Black Swan'], 'Market Shock'],
    flux: ['Stock', '▲', '#ffd23f', 'Shares, markets, growth', ['Buy', 'Dividend', 'Rally', 'Bull Run'], 'Compound Growth'],
    beatsWhy: ['tax takes a cut of cash', 'cash pays off debt', 'debt can seize assets', 'assets cushion risk', 'risk crashes stocks', 'growth outpaces tax'] }),
  sec: G({ label: 'Security & Networks',
    logic: ['Firewall', '🛡', '#4aa8ff', 'Rules, filtering, perimeter defence', ['Block', 'Rule Up', 'Deny All', 'Zero Trust Wall'], 'Default Deny'],
    cipher: ['Malware', '☣', '#ff6a3d', 'Viruses, worms, ransomware', ['Infect', 'Replicate', 'Payload Drop', 'Ransom Lock'], 'Zero-Day Strike'],
    spark: ['Key', '⚿', '#ffd23f', 'Passwords, tokens, credentials', ['Login', 'MFA Boost', 'Token Strike', 'Master Key'], 'Passkey Pierce'],
    data: ['Crypto', '🔒', '#b36bff', 'Encryption, hashing, signatures', ['Hash', 'Salt', 'Cipher Lock', 'AES Storm'], 'Quantum-Safe Seal'],
    structure: ['Packet', '✉', '#3ddc84', 'Traffic, protocols, routing', ['Ping', 'Handshake', 'Packet Flood', 'Route Storm'], 'Fibre Torrent'],
    flux: ['Phish', '🎣', '#c98b52', 'Social engineering and deception', ['Lure', 'Spoof', 'Pretext', 'Spear Phish'], 'Whale Hook'],
    beatsWhy: ['firewalls block malware', 'malware steals keys', 'keys unlock encryption', 'encryption hides packets', 'packet inspection catches phishing links', 'phishing walks right past the firewall'] }),
  math: G({ label: 'Math',
    logic: ['Variable', 'x', '#4aa8ff', 'Unknowns, algebra, equations', ['Solve', 'Isolate', 'Substitute', 'System Solve'], 'Quadratic Formula'],
    cipher: ['Number', '#', '#b36bff', 'Counting, operations, place value', ['Count', 'Add Up', 'Multiply', 'Exponent Blast'], 'Power of Ten'],
    spark: ['Shape', '△', '#ffd23f', 'Geometry, angles, area', ['Angle', 'Rotate', 'Perimeter Pound', 'Pythagoras'], 'Golden Ratio'],
    data: ['Pattern', '⋯', '#3ddc84', 'Sequences, rules, functions', ['Repeat', 'Extend', 'Sequence Strike', 'Fibonacci'], 'Fractal Storm'],
    structure: ['Chance', '⚄', '#c98b52', 'Probability and statistics', ['Roll', 'Shuffle', 'Odds On', 'Jackpot'], 'Normal Curve'],
    flux: ['Measure', '⟷', '#ff6a3d', 'Units, time, money, scale', ['Measure', 'Convert', 'Scale Up', 'Precision Strike'], 'Light-Year Leap'],
    beatsWhy: ['algebra generalises numbers', 'counting sides defines shapes', 'shapes form patterns', 'patterns beat randomness', 'chance blurs measurement', 'measuring pins down unknowns'] }),
  science: G({ label: 'Science',
    logic: ['Water', '≈', '#4aa8ff', 'Liquids, oceans, solutions', ['Splash', 'Dissolve', 'Tidal Wave', 'Hydro Cycle'], 'Tsunami'],
    cipher: ['Fire', '♨', '#ff6a3d', 'Heat, combustion, reactions', ['Ember', 'Ignite', 'Combust', 'Exothermic Blaze'], 'Supernova'],
    spark: ['Life', '❀', '#3ddc84', 'Cells, plants, living things', ['Sprout', 'Grow', 'Photosynthesis', 'Evolution'], 'Natural Selection'],
    data: ['Earth', '⛰', '#c98b52', 'Rocks, minerals, gravity', ['Pebble', 'Erode', 'Quake', 'Tectonic Crush'], 'Continental Drift'],
    structure: ['Energy', 'ϟ', '#ffd23f', 'Electricity, light, forces', ['Zap', 'Charge', 'Kinetic Slam', 'E = mc²'], 'Fusion Burst'],
    flux: ['Air', '☁', '#b36bff', 'Gases, weather, the atmosphere', ['Gust', 'Pressure', 'Cyclone', 'Jet Stream'], 'Hurricane'],
    beatsWhy: ['water douses fire', 'fire burns living things', 'roots crack rock', 'the earth grounds energy', 'energy splits the air', 'wind evaporates water'] }),
  ela: G({ label: 'Language Arts',
    logic: ['Grammar', '§', '#4aa8ff', 'Rules of sentences', ['Punctuate', 'Agree', 'Clause Clamp', 'Perfect Syntax'], 'Flawless Grammar'],
    cipher: ['Poem', '♫', '#b36bff', 'Rhyme, rhythm, figurative language', ['Rhyme', 'Metaphor', 'Sonnet Strike', 'Epic Verse'], 'Iambic Storm'],
    spark: ['Voice', '❝', '#ffd23f', 'Tone, persuasion, speaking', ['Speak', 'Persuade', 'Rhetoric', 'Grand Speech'], 'Ethos Pathos Logos'],
    data: ['Word', '✎', '#3ddc84', 'Vocabulary and spelling', ['Spell', 'Define', 'Vocab Volley', 'Dictionary Drop'], 'Thesaurus Storm'],
    structure: ['Story', '❧', '#c98b52', 'Plot, characters, essays', ['Once Upon', 'Rising Action', 'Plot Twist', 'Climax'], 'Happily Ever After'],
    flux: ['Idea', '✦', '#ff6a3d', 'Themes, arguments, imagination', ['Brainstorm', 'Inspire', 'Thesis', 'Big Idea'], 'Eureka'],
    beatsWhy: ['grammar shapes poems', 'poems outshine plain talk', 'voice gives words power', 'words build stories', 'stories carry ideas', 'new ideas break the rules'] }),
};
const TOPIC_GENRE = { networking: 'sec', cybersec: 'sec', hacking: 'sec', trading: 'biz', automotive: 'auto', electrical: 'trade', electrician: 'trade', french: 'lang', spanish: 'lang', maltese: 'lang', finance: 'biz',
  'math-elem': 'math', 'math-middle': 'math', 'math-high': 'math', 'science-elem': 'science', physics: 'science', chemistry: 'science', biology: 'science', 'ela-elem': 'ela', 'ela-high': 'ela' };
export const genreOf = (topic) => (topic && (topic.genre || TOPIC_GENRE[topic.id])) || 'tech';
const DEFAULTS = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, { ...v }]));
export let currentGenre = 'tech';
// Move sets for generated monsters in a genre (null = use the built-in tech sets)
export function genreMoves(genre, type) { const g = GENRES[genre]; if (!g || !g[type]) return null; const [b, boost, mid, ult] = g[type][4]; return [[b, b, b, b], [boost, boost, boost, boost], [mid, ult, ult, mid]]; } // same shape as the built-in sets: [basic options, boost options, strong options]
export function genreDiscMove(genre, type) { const g = GENRES[genre]; return g && g[type] ? g[type][5] : null; }
// Switch the visible type names/colours to a topic's genre (called whenever a world is loaded).
export function applyTypeTheme(topic) {
  const genre = genreOf(topic); currentGenre = genre; const g = GENRES[genre] || {};
  for (const k of TYPE_KEYS) { const d = DEFAULTS[k]; const t = g[k]; Object.assign(TYPES[k], d, t ? { name: t[0], icon: t[1], color: t[2], desc: t[3] } : {}); }
  try { const st = document.documentElement.style; for (const k of TYPE_KEYS) st.setProperty('--t-' + k, TYPES[k].color); } catch {}
  return genre;
}
// "Coolant ▶ Combustion ▶ … ▶ Coolant"
export const typeCycleText = () => [...TYPE_KEYS, TYPE_KEYS[0]].map((k) => TYPES[k].name).join(' ▶ ');
export const typeBeatsLines = () => TYPE_KEYS.map((k, i) => `${TYPES[k].name} beats ${TYPES[BEATS[k]].name}${GENRES[currentGenre]?.beatsWhy ? ' — ' + GENRES[currentGenre].beatsWhy[i] : ''}.`);
const BEATS = { logic: 'cipher', cipher: 'spark', spark: 'data', data: 'structure', structure: 'flux', flux: 'logic' };
export function effectiveness(atk, def) {
  if (!atk || atk === 'normal' || !def) return 1;
  if (BEATS[atk] === def) return 2;
  if (BEATS[def] === atk) return 0.5;
  return 1;
}
export const beats = (t) => BEATS[t];
export const weakTo = (t) => Object.keys(BEATS).find((k) => BEATS[k] === t);
