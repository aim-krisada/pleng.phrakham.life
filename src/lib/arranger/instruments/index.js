// B107 P2 · §4B — instrument module registry + resolver. Maps a sampler instrument id (the thing
// the user picks in แกน "เครื่องดนตรี") to the idiomatic arranger module that shapes HOW it plays
// (voicing constraints + comp patterns + humanize feel). Adding an instrument = one module here;
// the arranger core (harmony / dynamics / humanize-velocity) never changes.

import { keyboard } from './keyboard.js'
import { bowed } from './bowed.js'
import { guitar } from './guitar.js'

// instrument id → module. grand/felt = keyboard; violin/cello/string = bowed; nylon = guitar.
const MODULE_BY_INSTRUMENT = {
  grand: keyboard,
  felt: keyboard,
  violin: bowed,
  cello: bowed,
  string: bowed,
  nylon: guitar,
}

// Resolve the module for an instrument id, defaulting to the keyboard (piano) module — so an
// unknown / synth instrument keeps the P1 behaviour. This is the ONE seam the scheduler uses to
// pick the idiomatic module without knowing about specific instruments.
export function moduleForInstrument(id) {
  return MODULE_BY_INSTRUMENT[id] || keyboard
}

export { keyboard, bowed, guitar }
