import coldOpen from './s0-cold-open.js';

// The morphing field walks this list in order across the whole film.
// Scenes tween field.state.s between neighbouring indices only.
export const SEQUENCE = ['dust', 'ship'];

// One entry per scene in content.scenes; `create` is added as scenes are built.
export const sceneDefs = [coldOpen, {}, {}, {}, {}, {}];
