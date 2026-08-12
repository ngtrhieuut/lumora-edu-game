# Lumora 500-Level Catalog

Data boundary between curriculum/level design and gameplay runtime. `ALL_LEVELS` expands to exactly 500 normalized configs, while grade files stay compact.

- `grade1.js` … `grade5.js`: 100 explicit level blueprints each.
- `buildGradeLevels.js`: shared expansion rules (difficulty, rewards, prerequisites, boss metadata).
- `mechanicRegistry.js`: canonical mechanic families and current prototype adapter status.
- `validate.js` + `levelCatalog.test.js`: structural checks.
- `index.js`: import/query API.

```js
import { getLevelById, getGradeLevels } from "./levelCatalog/index.js";
const level = getLevelById("g1-l012");
const grade1 = getGradeLevels(1);
```

## Runtime rule

Select gameplay by `level.mechanicId`, never by a giant `switch(level.id)`. Add/refine level content in the catalog; add runtime behavior once per mechanic family.

## Boss cadence

Levels 10,20,...,90 are chapter bosses. Level 100 is the Grand Boss. Boss config includes phase checkpoints and weak-skill micro-practice; failure must not reset the whole boss.

## Curriculum safety

All 500 configs remain `curriculum.approved: false` until an exact official outcome is human-reviewed. Each config traces back to the design docs on `main`.

## Reward policy

New catalog content does not depend on generic XP (`xp: 0`). Progression is Knowledge Energy + milestone Knowledge Shards + restoration/mastery. Legacy XP may stay temporarily for save compatibility.
