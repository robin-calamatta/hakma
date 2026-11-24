// Deep content packs: per-topic arrays (one entry per city) that extend the base topic packs with
// lessons, extra glossary terms, levelled questions (1 easy · 2 medium · 3 mastery), vocabulary banks,
// conjugation tables and extra generators. See docs/ADDING_TOPICS.md.
export const DEEP = {};
export const DEEP_META = {};
export function registerDeep(id, cities, meta = {}) { DEEP[id] = cities; DEEP_META[id] = meta; }
