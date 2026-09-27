import coldOpen from './s0-cold-open.js';
import title from './s1-title.js';
import purpose from './s2-purpose.js';
import equity from './s3-equity.js';
import conscious from './s4-conscious.js';

// The morphing field walks this list in order across the whole film.
// Scenes tween field.state.s between neighbouring indices only.
export const SEQUENCE = ['dust', 'ship', 'route', 'uzbek', 'uzbekLit', 'inn'];

// One entry per scene in content.scenes; `create` is added as scenes are built.
export const sceneDefs = [coldOpen, title, purpose, equity, conscious, {}];
