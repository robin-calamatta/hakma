// Topic registry. To add a topic: create topics/<id>.js (see docs/ADDING_TOPICS.md), import it here and add it to TOPICS.
import cs from './topics/cs.js';
import kubernetes from './topics/kubernetes.js';
import python from './topics/python.js';
import softeng from './topics/softeng.js';
import devops from './topics/devops.js';
import golang from './topics/golang.js';
import terraform from './topics/terraform.js';
import electrical from './topics/electrical.js';
import electrician from './topics/electrician.js';
import { mathElem, mathMiddle, mathHigh } from './topics/math.js';
import { elaElem, elaHigh } from './topics/ela.js';
import { scienceElem, physics, chemistry, biology } from './topics/science.js';

export const TOPICS = [
  cs, kubernetes, python, softeng, devops, golang, terraform, electrical, electrician,
  mathElem, mathMiddle, mathHigh, elaElem, elaHigh, scienceElem, physics, chemistry, biology,
];
