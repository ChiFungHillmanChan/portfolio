//! Connect 4 solver, compiled to wasm32-unknown-unknown.
//!
//! Port of the JS engine at portfolio/public/games/connect4/index.html.
//! Same algorithm (negamax + α-β + transposition table with EXACT/LOWER/
//! UPPER bounds + TT-move ordering + iterative deepening with PV hand-off),
//! but using native u64 bitboards instead of JavaScript BigInt.
//!
//! The whole bitboard fits in 49 bits, so one u64 per side. Every operation
//! is a single native instruction on wasm's i64 — no heap allocations, no
//! stringification, no Map lookups in the hot path. Expected: 20–50× faster
//! than the JS version.

// Single exported function; keep everything else private.

const COLS: usize = 7;
const ROWS: u32 = 6;
const H1: u32 = 7;                 // ROWS + 1 — column stride in bit layout
const SIZE: u32 = 42;              // 7 × 6
const WIN_SCORE: i32 = 100_000;
const COL_ORDER: [usize; 7] = [3, 2, 4, 1, 5, 0, 6];

// Bit positions. c is 0..7.
// Bottom cell of column c: bit c*H1
// Top cell (row ROWS-1) of column c: bit c*H1 + (ROWS-1)
static COL_BOTTOM: [u64; 7] = [
    1u64 << 0, 1u64 << 7, 1u64 << 14, 1u64 << 21,
    1u64 << 28, 1u64 << 35, 1u64 << 42,
];
static COL_TOP: [u64; 7] = [
    1u64 << 5, 1u64 << 12, 1u64 << 19, 1u64 << 26,
    1u64 << 33, 1u64 << 40, 1u64 << 47,
];
static COL_SHIFT: [u32; 7] = [0, 7, 14, 21, 28, 35, 42];
const ROWS_MASK: u64 = (1u64 << ROWS) - 1;   // 0x3F (63)

// ---------- Position ----------
#[derive(Clone, Copy)]
struct Position { mask: u64, current: u64, moves: u32 }

impl Position {
    #[inline] fn can_play(&self, c: usize) -> bool { (self.mask & COL_TOP[c]) == 0 }
    #[inline] fn play(&mut self, c: usize) {
        let new_mask = self.mask | (self.mask + COL_BOTTOM[c]);
        self.current ^= self.mask;
        self.mask = new_mask;
        self.moves += 1;
    }
    #[inline] fn undo(&mut self, c: usize) {
        // Find the highest occupied bit in column c and clear it.
        let col_mask = ROWS_MASK << COL_SHIFT[c];
        let col_bits = self.mask & col_mask;
        let mut highest: u64 = 0;
        let mut bit = COL_BOTTOM[c];
        for _ in 0..ROWS {
            if col_bits & bit != 0 { highest = bit; }
            bit <<= 1;
        }
        self.mask ^= highest;
        self.current ^= self.mask;
        self.moves -= 1;
    }
    #[inline] fn is_draw(&self) -> bool { self.moves == SIZE }

    #[inline]
    fn has_four(pos: u64) -> bool {
        // Check all four line directions with standard bitboard trick.
        let m = pos & (pos >> H1);
        if m & (m >> (2 * H1)) != 0 { return true; }
        let m = pos & (pos >> (H1 - 1));
        if m & (m >> (2 * (H1 - 1))) != 0 { return true; }
        let m = pos & (pos >> (H1 + 1));
        if m & (m >> (2 * (H1 + 1))) != 0 { return true; }
        let m = pos & (pos >> 1);
        if m & (m >> 2) != 0 { return true; }
        false
    }

    #[inline]
    fn would_win(&self, c: usize) -> bool {
        let new_mask = self.mask | (self.mask + COL_BOTTOM[c]);
        let new_piece = new_mask & !self.mask;
        Self::has_four(self.current | new_piece)
    }

    /// Canonical position key: mask + current. This trick (Pons) gives a
    /// unique 64-bit encoding of a 2-player bitboard position.
    #[inline] fn key(&self) -> u64 { self.mask + self.current }
}

// ---------- Evaluation (pre-baked 4-window table) ----------
// Each window is 4 bits the player must occupy together.
// There are 69 such windows on a 7×6 board (21 horizontal, 24 vertical,
// 12 each diagonal) — identical to WINDOW_CACHE in the JS engine.
static WINDOWS: &[[u64; 4]] = &{
    // Build table at const-evaluation time. 69 windows total.
    let mut arr = [[0u64; 4]; 69];
    let mut i = 0usize;
    let mut c = 0u32;
    while c < 7 {
        let mut r = 0u32;
        while r < 6 {
            if r + 3 < 6 {   // vertical
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << (c * 7 + r + 1),
                    1u64 << (c * 7 + r + 2), 1u64 << (c * 7 + r + 3),
                ];
                i += 1;
            }
            if c + 3 < 7 {   // horizontal
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << ((c + 1) * 7 + r),
                    1u64 << ((c + 2) * 7 + r), 1u64 << ((c + 3) * 7 + r),
                ];
                i += 1;
            }
            if c + 3 < 7 && r + 3 < 6 {   // diag /
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << ((c + 1) * 7 + r + 1),
                    1u64 << ((c + 2) * 7 + r + 2), 1u64 << ((c + 3) * 7 + r + 3),
                ];
                i += 1;
            }
            if c + 3 < 7 && r >= 3 {   // diag \
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << ((c + 1) * 7 + r - 1),
                    1u64 << ((c + 2) * 7 + r - 2), 1u64 << ((c + 3) * 7 + r - 3),
                ];
                i += 1;
            }
            r += 1;
        }
        c += 1;
    }
    arr
};

fn count_lines(me: u64, opp: u64) -> i32 {
    let mut s = 0i32;
    for w in WINDOWS {
        let mut mine = 0i32; let mut theirs = 0i32;
        for k in 0..4 {
            if me & w[k] != 0 { mine += 1; }
            else if opp & w[k] != 0 { theirs += 1; }
        }
        if mine != 0 && theirs != 0 { continue; }
        match mine { 3 => s += 5, 2 => s += 2, 1 => s += 1, _ => {} }
        match theirs { 3 => s -= 5, 2 => s -= 2, 1 => s -= 1, _ => {} }
    }
    s
}

fn evaluate(pos: &Position) -> i32 {
    let me = pos.current;
    let opp = pos.mask ^ pos.current;
    let mut score = 0i32;
    // Centre-column bias — matches JS engine (3 points per centre piece).
    for r in 0..ROWS {
        let bit = 1u64 << (3 * H1 + r);
        if me & bit != 0 { score += 3; }
        if opp & bit != 0 { score -= 3; }
    }
    score + count_lines(me, opp)
}

// ---------- Transposition table ----------
// Fixed-size open-addressed table; always-replace on collision. Key doubles
// as the occupancy check (0 means empty slot).
const TT_EXACT: u8 = 0;
const TT_LOWER: u8 = 1;
const TT_UPPER: u8 = 2;

#[derive(Clone, Copy)]
struct TTEntry { key: u64, value: i32, depth: u8, bound: u8, best_move: u8 }

const TT_SIZE: usize = 1 << 18;   // 256 K entries × 24 B ≈ 6 MB (in .bss)
const TT_MASK: usize = TT_SIZE - 1;

// All-zero default so the table goes into .bss (zero-initialized at wasm
// instantiation time — NOT embedded in the wasm binary as data). best_move
// = 0 is never observed for an empty slot because we gate reads on key != 0.
static mut TT: [TTEntry; TT_SIZE] =
    [TTEntry { key: 0, value: 0, depth: 0, bound: 0, best_move: 0 }; TT_SIZE];

// Fibonacci-hash the key into the TT index. `mask + current` is the canonical
// position key but its low bits are not well-distributed (column interleaving
// makes sibling positions land in the same bucket). Multiplying by the golden-
// ratio constant mixes the bits across the full word before truncation.
#[inline]
fn tt_index(key: u64) -> usize {
    ((key.wrapping_mul(0x9E37_79B9_7F4A_7C15)) as usize) & TT_MASK
}

#[inline]
fn tt_get(key: u64) -> Option<TTEntry> {
    let idx = tt_index(key);
    // SAFETY: single-threaded wasm; exclusive access is implicit.
    let e = unsafe { TT[idx] };
    if e.key == key && e.key != 0 { Some(e) } else { None }
}

#[inline]
fn tt_set(key: u64, value: i32, depth: u8, bound: u8, best_move: u8) {
    let idx = tt_index(key);
    unsafe { TT[idx] = TTEntry { key, value, depth, bound, best_move }; }
}

// ---------- Negamax with α-β + TT ----------
fn negamax(pos: &mut Position, depth: i32, mut alpha: i32, mut beta: i32) -> i32 {
    let alpha_orig = alpha;
    if pos.is_draw() { return 0; }

    // Immediate win check.
    for &c in COL_ORDER.iter() {
        if pos.can_play(c) && pos.would_win(c) {
            return WIN_SCORE - pos.moves as i32;
        }
    }
    if depth == 0 { return evaluate(pos); }

    let key = pos.key();
    let mut tt_move: Option<u8> = None;
    if let Some(e) = tt_get(key) {
        tt_move = Some(e.best_move);
        if e.depth as i32 >= depth {
            match e.bound {
                TT_EXACT => return e.value,
                TT_LOWER => if e.value > alpha { alpha = e.value; },
                TT_UPPER => if e.value < beta  { beta  = e.value; },
                _ => {}
            }
            if alpha >= beta { return e.value; }
        }
    }

    let max = WIN_SCORE - pos.moves as i32 - 2;
    if beta > max { beta = max; if alpha >= beta { return beta; } }

    let mut best = i32::MIN + 1;   // avoid overflow under negation
    let mut best_move: u8 = 0;

    // Slot index: -1 = TT move; 0..7 = COL_ORDER (skipping the TT move).
    for i in -1..(COLS as i32) {
        let c: usize = if i < 0 {
            match tt_move { Some(tm) => tm as usize, None => continue }
        } else {
            let cand = COL_ORDER[i as usize];
            if Some(cand as u8) == tt_move { continue; }
            cand
        };
        if !pos.can_play(c) { continue; }
        pos.play(c);
        let score = -negamax(pos, depth - 1, -beta, -alpha);
        pos.undo(c);
        if score > best { best = score; best_move = c as u8; }
        if score > alpha { alpha = score; }
        if alpha >= beta { break; }
    }

    let bound = if best <= alpha_orig { TT_UPPER }
                else if best >= beta  { TT_LOWER }
                else                  { TT_EXACT };
    tt_set(key, best, depth as u8, bound, best_move);
    best
}

// ---------- Root search ----------
fn search_depth(pos: &mut Position, depth: i32, preferred: Option<u8>) -> (i32, i32) {
    let mut local_best: i32 = -1;
    let mut local_score: i32 = i32::MIN + 1;
    let mut alpha: i32 = i32::MIN + 1;
    let beta: i32 = i32::MAX;

    for i in -1..(COLS as i32) {
        let c: usize = if i < 0 {
            match preferred { Some(p) => p as usize, None => continue }
        } else {
            let cand = COL_ORDER[i as usize];
            if Some(cand as u8) == preferred { continue; }
            cand
        };
        if !pos.can_play(c) { continue; }
        if local_best < 0 { local_best = c as i32; }
        pos.play(c);
        let score = -negamax(pos, depth - 1, -beta, -alpha);
        pos.undo(c);
        if score > local_score { local_score = score; local_best = c as i32; }
        if score > alpha { alpha = score; }
    }
    (local_best, local_score)
}

fn find_tactical(pos: &mut Position) -> i32 {
    // Immediate winning move.
    for i in 0..COLS {
        let c = COL_ORDER[i];
        if pos.can_play(c) && pos.would_win(c) { return c as i32; }
    }
    // Immediate block — swap to opponent view, check, swap back.
    pos.current ^= pos.mask;
    let mut blk: i32 = -1;
    for i in 0..COLS {
        let c = COL_ORDER[i];
        if pos.can_play(c) && pos.would_win(c) { blk = c as i32; break; }
    }
    pos.current ^= pos.mask;
    blk
}

// ---------- Exported entry point ----------
/// Returns 0..6 for best column, or -1 if no legal move.
///
/// Arguments:
///   mask:      u64 bitboard of all placed pieces (side-independent)
///   current:   u64 bitboard of the player-to-move's pieces
///   moves:     number of pieces played so far (0..42)
///   max_depth: iterative-deepening ceiling (live engine uses 14)
#[no_mangle]
pub extern "C" fn solve_best_move(mask: u64, current: u64, moves: u32, max_depth: u32) -> i32 {
    let mut pos = Position { mask, current, moves };

    // Tactical shortcut (matches JS findTacticalMove order: win > block).
    let t = find_tactical(&mut pos);
    if t >= 0 { return t; }

    // Iterative deepening with PV hand-off.
    let mut best: i32 = -1;
    let mut preferred: Option<u8> = None;
    for depth in 1..=(max_depth as i32) {
        let (col, score) = search_depth(&mut pos, depth, preferred);
        best = col;
        preferred = if col >= 0 { Some(col as u8) } else { None };
        if score >= WIN_SCORE - 50 { break; }
    }
    best
}

// Wasm requires a panic handler when compiled without std's default unwinding.
// `panic = "abort"` in Cargo.toml makes the default one suffice; we don't need
// one here. But we must mark the module so that unused-import lints don't fire
// and allow the linker to strip what's unused.
