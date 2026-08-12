# Prototype order and Nubi polish

## C29 · Local prototype registry and stronger Nubi cues

`prototype-order` is now stored in `src/prototypeNodes.js` instead of being an inline `App.jsx` object. The registry is intentionally local-only: it is available to Playtest Lab, but it is not included in the 12 campaign nodes, progress normalization, mastery, reward, curriculum approval, or cloud providers.

The ordering prototype also has a complete `src/interactionSpecs.js` contract. Pointer drag is the primary gesture; select-then-tap and native keyboard buttons remain fallbacks. The contract is covered by `src/prototypeNodes.test.js` and the existing order engine/visual tests.

Nubi keeps the two transparent RGBA runtime sprites. A masked cutout edge makes the silhouette readable over bright or busy scenes, while `attention` and `recovering` receive bounded static-friendly corona/core cues. The flattened `nubi-hero-v2.png` asset remains excluded from the runtime registry.

## Review boundary

Use Settings → Parent area → answer `12 × 8 = 96` → Playtest Lab → `Dòng Ký Ức`. Completing the prototype does not change the parent progress report. Production remains fail-closed until official curriculum evidence and human approval exist.

## Verification

- `npm test`: 310/310 passed.
- `npm run build:demo`: passed; prototype audit remains `12 nodes, 3 optional quests, 0 approved`.
- Browser: wrong-order soft-fail, real Pointer drag placement, select-then-tap fallback, full three-item completion, and Nubi transparent mask cue were verified on `http://localhost:5173/`.
