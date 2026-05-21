# bb/100 Upload — Verification Script

Run on a folder of GGPoker hand history files:

```bash
node verify/verify.mjs /path/to/hand-history-folder
```

Default path: `/Users/hillmanchan/Desktop/0000019e-4a9e-fb13-0000-0000280dc4e8`

Output prints both AFTER-RAKE and BEFORE-RAKE final values. The BEFORE-RAKE values
must match what GGPoker shows in its EV Graph view. The 1,815-hand sample dataset
should produce green ≈ $8.50 and orange ≈ $11.00 in the BEFORE-RAKE section.
