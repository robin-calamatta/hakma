// Per-topic worked examples: { 'Term name': ['example', ...] }. Keys must match term names in topics/*.js exactly.
import cs from './cs.js'; import kubernetes from './kubernetes.js'; import python from './python.js';
import softeng from './softeng.js'; import devops from './devops.js'; import golang from './golang.js';
import terraform from './terraform.js'; import electrical from './electrical.js'; import electrician from './electrician.js';
import mathElem from './math-elem.js'; import mathMiddle from './math-middle.js'; import mathHigh from './math-high.js';
import elaElem from './ela-elem.js'; import elaHigh from './ela-high.js'; import scienceElem from './science-elem.js';
import physics from './physics.js';
import java from './java.js'; import french from './french.js'; import spanish from './spanish.js'; import maltese from './maltese.js'; import automotive from './automotive.js'; import finance from './finance.js'; import chemistry from './chemistry.js'; import biology from './biology.js';
export const EXAMPLES = {
  cs, kubernetes, python, softeng, devops, golang, terraform, electrical, electrician,
  'math-elem': mathElem, 'math-middle': mathMiddle, 'math-high': mathHigh,
  'ela-elem': elaElem, 'ela-high': elaHigh, 'science-elem': scienceElem, physics, chemistry, biology, java, french, spanish, maltese, automotive, finance,
};
