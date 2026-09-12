# cubejs 1.3.2

Vendored from the official npm release of [ldez/cubejs](https://github.com/ldez/cubejs), distributed under the [MIT license](./LICENSE). Copyright 2013–2017 Petri Lehtinen and 2018 Ludovic Fernandez.

- Package: https://registry.npmjs.org/cubejs/-/cubejs-1.3.2.tgz
- Release commit: `678bde034370bb14d095877bc0aaabe9dc52330f`
- Package integrity (SHA-512): `NuHpWIR/mpjrP3YpU6OaXAbo34idWlzo86GnAqGDG96OHDKyavTAelMyruZ77SgPhQ8l9IcP6/rzXoNcAy9OaQ==`
- Original `lib/cube.js` SHA-256: `450a53a9acf5033fde7ca23be8fd08ac37d30f04c58aac63f053a1c05a7f5802`
- Original `lib/solve.js` SHA-256: `faa0ccffca78f80a5fe7a197a9676af02d79d8ddece9cf3506154fea616fc445`

Only the outer IIFE in each JavaScript file was changed from `.call(this)` to `.call(globalThis)` so the original browser library can load inside an ES module worker. Trailing whitespace on three blank lines in `solve.js` was also removed. Its algorithms are unchanged. The package's development tooling and unrelated npm runtime dependency are not included.

The solver implements [Herbert Kociemba's two-phase algorithm](https://kociemba.org/math/imptwophase.htm). It searches for a short solution (up to 22 face turns here), without claiming the shortest possible solution. Lookup-table preparation and search run locally in a persistent worker. Cube validation and independent replay verification live in `../../full-solver.js`.
