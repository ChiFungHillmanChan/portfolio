//! Connect 4 solver, compiled to wasm32-unknown-unknown.
//!
//! Two exported entry points:
//!
//!   solve_best_move(mask, current, moves, max_depth) -> i32
//!     Depth-limited negamax + α-β + TT with a heuristic fallback at the
//!     leaf. Used for Try Game mode (intentionally beatable).
//!
//!   solve_perfect(mask, current, moves) -> i32
//!     Pascal Pons's weak solver — null-window score bisection searching
//!     all the way to terminal. Returns the column of a provably optimal
//!     move for the current player (0..6, or -1 if no legal move).
//!     Used for Challenge mode. Since Connect 4 is solved (first player
//!     wins from the centre), this guarantees the machine always wins
//!     when it moves first and at least draws when it moves second.

// ================================================================
// Bit-board constants
// ================================================================
const COLS: u32 = 7;
const ROWS: u32 = 6;
const H1: u32 = ROWS + 1;           // 7 — column stride (one padding bit per column)
const SIZE: u32 = ROWS * COLS;      // 42
const COL_ORDER: [usize; 7] = [3, 2, 4, 1, 5, 0, 6];

// bit c*H1 is row 0 of column c (the bottom cell)
static COL_BOTTOM: [u64; 7] = [
    1u64 << 0, 1u64 << 7, 1u64 << 14, 1u64 << 21,
    1u64 << 28, 1u64 << 35, 1u64 << 42,
];
// bit c*H1 + (ROWS-1) is the top cell of column c
static COL_TOP: [u64; 7] = [
    1u64 << 5, 1u64 << 12, 1u64 << 19, 1u64 << 26,
    1u64 << 33, 1u64 << 40, 1u64 << 47,
];
static COL_SHIFT: [u32; 7] = [0, 7, 14, 21, 28, 35, 42];
const ROWS_MASK: u64 = (1u64 << ROWS) - 1;   // 0x3F

// One bit set at row 0 of each column: 0b0000001_0000001_0000001_... (7 bits).
const BOTTOM_SINGLE: u64 =
    (1 <<  0) | (1 <<  7) | (1 << 14) | (1 << 21) |
    (1 << 28) | (1 << 35) | (1 << 42);

// All 42 valid cells.
const BOARD_MASK: u64 = BOTTOM_SINGLE * ROWS_MASK;

// ================================================================
// Position
// ================================================================
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

    #[inline] fn play_bit(&mut self, move_bit: u64) {
        self.current ^= self.mask;
        self.mask |= move_bit;
        self.moves += 1;
    }

    #[inline] fn undo(&mut self, c: usize) {
        // Clear the highest occupied bit of column c.
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

    /// Canonical position key. `mask + current` + BOTTOM_SINGLE (so that the
    /// key is zero only for a truly empty slot, never for the initial
    /// position) — this lets us use 0 as an empty-TT-slot sentinel.
    #[inline] fn key(&self) -> u64 { self.mask + self.current + BOTTOM_SINGLE }

    // ---------- Pons-style bitboard helpers (for the perfect solver) ----------

    /// Bitboard of all playable cells — one cell per non-full column.
    #[inline]
    fn possible(&self) -> u64 {
        (self.mask + BOTTOM_SINGLE) & BOARD_MASK
    }

    /// Bitboard of cells where placing a piece for `side` completes a 4-in-a-row.
    /// `side` is the bitboard of the player's pieces, `mask` is all placed pieces.
    fn winning_position_of(side: u64, mask: u64) -> u64 {
        // Vertical: four stacked in a column.
        let mut r = (side << 1) & (side << 2) & (side << 3);

        // Horizontal: four across a row (stride H1).
        let mut p = (side << H1) & (side << (2 * H1));
        r |= p & (side << (3 * H1));
        r |= p & (side >> H1);
        p = (side >> H1) & (side >> (2 * H1));
        r |= p & (side << H1);
        r |= p & (side >> (3 * H1));

        // Diagonal / (stride H1-1 = 6).
        p = (side << (H1 - 1)) & (side << (2 * (H1 - 1)));
        r |= p & (side << (3 * (H1 - 1)));
        r |= p & (side >> (H1 - 1));
        p = (side >> (H1 - 1)) & (side >> (2 * (H1 - 1)));
        r |= p & (side << (H1 - 1));
        r |= p & (side >> (3 * (H1 - 1)));

        // Diagonal \ (stride H1+1 = 8).
        p = (side << (H1 + 1)) & (side << (2 * (H1 + 1)));
        r |= p & (side << (3 * (H1 + 1)));
        r |= p & (side >> (H1 + 1));
        p = (side >> (H1 + 1)) & (side >> (2 * (H1 + 1)));
        r |= p & (side << (H1 + 1));
        r |= p & (side >> (3 * (H1 + 1)));

        r & (BOARD_MASK ^ mask)
    }

    #[inline] fn winning_position(&self) -> u64 {
        Self::winning_position_of(self.current, self.mask)
    }

    #[inline] fn opponent_winning_position(&self) -> u64 {
        Self::winning_position_of(self.current ^ self.mask, self.mask)
    }

    #[inline] fn can_win_next(&self) -> bool {
        (self.winning_position() & self.possible()) != 0
    }

    /// Non-losing moves: filter out moves that give opponent an immediate win
    /// the very next turn. If opponent has two or more such threats, returns
    /// 0 (we already lose; no move can save us).
    fn possible_non_losing_moves(&self) -> u64 {
        let mut possible = self.possible();
        let opp_win = self.opponent_winning_position();
        let forced = possible & opp_win;
        if forced != 0 {
            if forced & forced.wrapping_sub(1) != 0 {
                return 0;
            }
            possible = forced;
        }
        // Never play a move that sits directly under an opponent winning cell.
        possible & !(opp_win >> 1)
    }

    /// Heuristic score for move ordering: number of winning spots this move
    /// creates for us (higher is better).
    #[inline] fn move_score(&self, move_bit: u64) -> u32 {
        Self::winning_position_of(
            self.current | move_bit,
            self.mask | move_bit,
        ).count_ones()
    }
}

// ================================================================
// Evaluation + TT for the DEPTH-LIMITED engine (Try Game mode)
// ================================================================

// Pre-computed 4-windows (21 horiz + 24 vert + 12 + 12 diag = 69).
static WINDOWS: &[[u64; 4]] = &{
    let mut arr = [[0u64; 4]; 69];
    let mut i = 0usize;
    let mut c = 0u32;
    while c < 7 {
        let mut r = 0u32;
        while r < 6 {
            if r + 3 < 6 {
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << (c * 7 + r + 1),
                    1u64 << (c * 7 + r + 2), 1u64 << (c * 7 + r + 3),
                ];
                i += 1;
            }
            if c + 3 < 7 {
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << ((c + 1) * 7 + r),
                    1u64 << ((c + 2) * 7 + r), 1u64 << ((c + 3) * 7 + r),
                ];
                i += 1;
            }
            if c + 3 < 7 && r + 3 < 6 {
                arr[i] = [
                    1u64 << (c * 7 + r), 1u64 << ((c + 1) * 7 + r + 1),
                    1u64 << ((c + 2) * 7 + r + 2), 1u64 << ((c + 3) * 7 + r + 3),
                ];
                i += 1;
            }
            if c + 3 < 7 && r >= 3 {
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
    for r in 0..ROWS {
        let bit = 1u64 << (3 * H1 + r);
        if me & bit != 0 { score += 3; }
        if opp & bit != 0 { score -= 3; }
    }
    score + count_lines(me, opp)
}

// Depth-limited TT (for Try Game mode).
const HWIN_SCORE: i32 = 100_000;
const DTT_EXACT: u8 = 0;
const DTT_LOWER: u8 = 1;
const DTT_UPPER: u8 = 2;

#[derive(Clone, Copy)]
struct DTTEntry { key: u64, value: i32, depth: u8, bound: u8, best_move: u8 }

const DTT_SIZE: usize = 1 << 18;   // 256 K entries
const DTT_MASK: usize = DTT_SIZE - 1;

static mut DTT: [DTTEntry; DTT_SIZE] =
    [DTTEntry { key: 0, value: 0, depth: 0, bound: 0, best_move: 0 }; DTT_SIZE];

#[inline]
fn dtt_index(key: u64) -> usize {
    (key.wrapping_mul(0x9E37_79B9_7F4A_7C15) as usize) & DTT_MASK
}

#[inline]
fn dtt_get(key: u64) -> Option<DTTEntry> {
    let idx = dtt_index(key);
    let e = unsafe { DTT[idx] };
    if e.key == key && e.key != 0 { Some(e) } else { None }
}

#[inline]
fn dtt_set(key: u64, value: i32, depth: u8, bound: u8, best_move: u8) {
    let idx = dtt_index(key);
    unsafe { DTT[idx] = DTTEntry { key, value, depth, bound, best_move }; }
}

fn h_negamax(pos: &mut Position, depth: i32, mut alpha: i32, mut beta: i32) -> i32 {
    let alpha_orig = alpha;
    if pos.is_draw() { return 0; }

    for &c in COL_ORDER.iter() {
        if pos.can_play(c) && pos.would_win(c) {
            return HWIN_SCORE - pos.moves as i32;
        }
    }
    if depth == 0 { return evaluate(pos); }

    let key = pos.key();
    let mut tt_move: Option<u8> = None;
    if let Some(e) = dtt_get(key) {
        tt_move = Some(e.best_move);
        if e.depth as i32 >= depth {
            match e.bound {
                DTT_EXACT => return e.value,
                DTT_LOWER => if e.value > alpha { alpha = e.value; },
                DTT_UPPER => if e.value < beta  { beta  = e.value; },
                _ => {}
            }
            if alpha >= beta { return e.value; }
        }
    }

    let max = HWIN_SCORE - pos.moves as i32 - 2;
    if beta > max { beta = max; if alpha >= beta { return beta; } }

    let mut best = i32::MIN + 1;
    let mut best_move: u8 = 0;
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
        let score = -h_negamax(pos, depth - 1, -beta, -alpha);
        pos.undo(c);
        if score > best { best = score; best_move = c as u8; }
        if score > alpha { alpha = score; }
        if alpha >= beta { break; }
    }

    let bound = if best <= alpha_orig { DTT_UPPER }
                else if best >= beta  { DTT_LOWER }
                else                  { DTT_EXACT };
    dtt_set(key, best, depth as u8, bound, best_move);
    best
}

fn h_search_depth(pos: &mut Position, depth: i32, preferred: Option<u8>) -> (i32, i32) {
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
        let score = -h_negamax(pos, depth - 1, -beta, -alpha);
        pos.undo(c);
        if score > local_score { local_score = score; local_best = c as i32; }
        if score > alpha { alpha = score; }
    }
    (local_best, local_score)
}

fn find_tactical(pos: &mut Position) -> i32 {
    for i in 0..COLS as usize {
        let c = COL_ORDER[i];
        if pos.can_play(c) && pos.would_win(c) { return c as i32; }
    }
    pos.current ^= pos.mask;
    let mut blk: i32 = -1;
    for i in 0..COLS as usize {
        let c = COL_ORDER[i];
        if pos.can_play(c) && pos.would_win(c) { blk = c as i32; break; }
    }
    pos.current ^= pos.mask;
    blk
}

// ================================================================
// Depth-limited entry point (Try Game mode)
// ================================================================
#[no_mangle]
pub extern "C" fn solve_best_move(mask: u64, current: u64, moves: u32, max_depth: u32) -> i32 {
    let mut pos = Position { mask, current, moves };
    let t = find_tactical(&mut pos);
    if t >= 0 { return t; }
    let mut best: i32 = -1;
    let mut preferred: Option<u8> = None;
    for depth in 1..=(max_depth as i32) {
        let (col, score) = h_search_depth(&mut pos, depth, preferred);
        best = col;
        preferred = if col >= 0 { Some(col as u8) } else { None };
        if score >= HWIN_SCORE - 50 { break; }
    }
    best
}

// ================================================================
// Perfect solver (Pons's weak solver) — Challenge mode
// ================================================================
//
// Score semantics (shared with Pons's code):
//   +N = current player wins, where N = number of moves *remaining*
//        until the game is full, halved (so "win on next move" = (42-moves)/2+
//        rounding — the exact formula is (SIZE + 1 - moves) / 2, yielding
//        a maximum of 21 at move 0 and 1 at move 40).
//   0  = draw.
//   -N = current player loses, with N = how-fast-you-lose analogue.
//
// Range ±((SIZE+1)/2) = ±21; use ±22 as "empty" / "ignore" sentinels.

const PMIN_SCORE: i32 = -(SIZE as i32) / 2;          // -21
const PMAX_SCORE: i32 = ((SIZE as i32) + 1) / 2;     //  21

// TT stores a shifted non-zero byte; 0 = empty slot.
//   stored = score - PMIN_SCORE + 1            if UPPER bound  (stored ∈ 1..=43)
//   stored = score - PMIN_SCORE + 1 + (PMAX_SCORE - PMIN_SCORE + 2)
//                                               if LOWER bound (stored ∈ 45..=87)
// Entry type is therefore recoverable from the range.
const PUPPER_OFFSET: i32 = -PMIN_SCORE + 1;                         // 22
const PLOWER_OFFSET: i32 = PUPPER_OFFSET + (PMAX_SCORE - PMIN_SCORE + 2); // 66

const PTT_SIZE: usize = 1 << 23;    // 8 M slots × (8 + 1) B ≈ 72 MB
const PTT_MASK: usize = PTT_SIZE - 1;

static mut PTT_KEYS:   [u64; PTT_SIZE] = [0u64; PTT_SIZE];
static mut PTT_VALUES: [u8;  PTT_SIZE] = [0u8;  PTT_SIZE];

#[inline]
fn ptt_index(key: u64) -> usize {
    (key.wrapping_mul(0x9E37_79B9_7F4A_7C15) as usize) & PTT_MASK
}

#[inline]
fn ptt_put(key: u64, encoded: u8) {
    let idx = ptt_index(key);
    unsafe {
        PTT_KEYS[idx]   = key;
        PTT_VALUES[idx] = encoded;
    }
}

#[inline]
fn ptt_get(key: u64) -> u8 {
    let idx = ptt_index(key);
    unsafe {
        if PTT_KEYS[idx] == key { PTT_VALUES[idx] } else { 0 }
    }
}

/// Returns i32 bounds for stored TT entry, None if empty.
/// (lower_bound, upper_bound) where either may be -INF/+INF sentinel.
fn ptt_decode(v: u8) -> Option<(i32, i32)> {
    if v == 0 { return None; }
    let v = v as i32;
    if v >= PLOWER_OFFSET {
        // LOWER bound: stored as score + PLOWER_OFFSET - 1
        let lo = v - PLOWER_OFFSET + PMIN_SCORE;
        Some((lo, PMAX_SCORE))
    } else {
        // UPPER bound
        let up = v - PUPPER_OFFSET + PMIN_SCORE;
        Some((PMIN_SCORE, up))
    }
}

/// MoveSorter — insertion-sorted stack of (move, score) pairs, iterated
/// highest-score first. Fixed-size (max 7 moves per ply).
struct MoveSorter {
    moves: [(u64, u32); 7],
    size: usize,
}

impl MoveSorter {
    fn new() -> Self { Self { moves: [(0, 0); 7], size: 0 } }

    fn add(&mut self, move_bit: u64, score: u32) {
        // Insert so that `moves` is sorted ascending by score;
        // we pop from the END to get descending order.
        let mut pos = self.size;
        while pos > 0 && self.moves[pos - 1].1 > score {
            self.moves[pos] = self.moves[pos - 1];
            pos -= 1;
        }
        self.moves[pos] = (move_bit, score);
        self.size += 1;
    }

    fn next(&mut self) -> Option<u64> {
        if self.size > 0 {
            self.size -= 1;
            Some(self.moves[self.size].0)
        } else {
            None
        }
    }
}

fn p_negamax(pos: &Position, mut alpha: i32, mut beta: i32) -> i32 {
    // Caller invariants:
    //   alpha < beta
    //   !pos.can_win_next()  (immediate wins are handled outside)

    let possible = pos.possible_non_losing_moves();
    if possible == 0 {
        // Every move we make lets opponent win next turn.
        return -(((SIZE - pos.moves) as i32) / 2);
    }
    if pos.moves >= SIZE - 2 {
        return 0;   // Board too full for anyone to make a new 4-in-a-row.
    }

    // Lower bound on score: we can't lose in less than SIZE - 2 - pos.moves plies.
    let min = -(((SIZE - 2 - pos.moves) as i32) / 2);
    if alpha < min {
        alpha = min;
        if alpha >= beta { return alpha; }
    }
    // Upper bound: we can't win sooner than SIZE - 1 - pos.moves plies away.
    let max = ((SIZE - 1 - pos.moves) as i32) / 2;
    if beta > max {
        beta = max;
        if alpha >= beta { return beta; }
    }

    let key = pos.key();
    if let Some((lo, up)) = ptt_decode(ptt_get(key)) {
        if alpha < lo { alpha = lo; if alpha >= beta { return alpha; } }
        if beta  > up { beta  = up; if alpha >= beta { return beta;  } }
    }

    // Order moves by our move_score (threats created), center-preferred on tie.
    let mut sorter = MoveSorter::new();
    for &c in COL_ORDER.iter() {
        let col_bits = ROWS_MASK << COL_SHIFT[c];
        let mv = possible & col_bits;
        if mv != 0 {
            sorter.add(mv, pos.move_score(mv));
        }
    }

    while let Some(mv) = sorter.next() {
        let mut p2 = *pos;
        p2.play_bit(mv);
        let score = -p_negamax(&p2, -beta, -alpha);
        if score >= beta {
            // LOWER bound.
            let stored = (score - PMIN_SCORE + PLOWER_OFFSET) as u8;
            ptt_put(key, stored);
            return score;
        }
        if score > alpha { alpha = score; }
    }

    // UPPER bound.
    let stored = (alpha - PMIN_SCORE + PUPPER_OFFSET) as u8;
    ptt_put(key, stored);
    alpha
}

/// Exact score of a position: null-window bisection over the score range.
/// Pons's trick: pick `med` that splits positive/negative asymmetrically so
/// the window homes in on the sign first (wins vs losses vs draw), then
/// refines magnitude.
fn p_solve(pos: &Position) -> i32 {
    if pos.can_win_next() {
        return ((SIZE + 1 - pos.moves) as i32) / 2;
    }
    let mut min = -(((SIZE - pos.moves) as i32) / 2);
    let mut max = ((SIZE + 1 - pos.moves) as i32) / 2;
    while min < max {
        let mut med = min + (max - min) / 2;
        if med <= 0 && min / 2 < med { med = min / 2; }
        else if med >= 0 && max / 2 > med { med = max / 2; }
        let r = p_negamax(pos, med, med + 1);
        if r <= med { max = r; } else { min = r; }
    }
    min
}

// ================================================================
// Perfect-solver entry point (Challenge mode)
// ================================================================
/// Returns the column (0..6) of a provably optimal move for the current
/// player, or -1 if no legal move is available.
///
/// Tie-breaking: prefers center-first via COL_ORDER when multiple columns
/// share the same exact minimax score.
#[no_mangle]
pub extern "C" fn solve_perfect(mask: u64, current: u64, moves: u32) -> i32 {
    let pos = Position { mask, current, moves };

    // Immediate-win shortcut — we never need to search if we can 4-in-a-row now.
    if pos.can_win_next() {
        for i in 0..COLS as usize {
            let c = COL_ORDER[i];
            if pos.can_play(c) && pos.would_win(c) { return c as i32; }
        }
    }

    // If every move loses immediately, any legal move is fine — pick first.
    // (Also covers the degenerate full-board case.)
    let possible = pos.possible();
    if possible == 0 { return -1; }

    // Score each legal column; higher = better for us.
    // score_after_play = -solve(child), so we invert.
    let mut best_col: i32 = -1;
    let mut best_score: i32 = PMIN_SCORE - 1;
    for i in 0..COLS as usize {
        let c = COL_ORDER[i];
        if !pos.can_play(c) { continue; }
        let mut child = pos;
        child.play(c);
        // If the child position has the opponent immediately winning,
        // that move loses us the game the very next turn — score = worst.
        let score = if child.can_win_next() {
            // Opponent wins next ⇒ we lose as fast as possible.
            -(((SIZE + 1 - child.moves) as i32) / 2)
        } else {
            -p_solve(&child)
        };
        if score > best_score {
            best_score = score;
            best_col = c as i32;
        }
    }
    best_col
}

/// Clears the perfect-solver TT. Useful from JS between unrelated queries
/// (e.g. the validator re-runs across many independent submissions).
/// Cheap — writes zeroes to the keys array; values are implicitly ignored
/// since we gate reads on key match.
#[no_mangle]
pub extern "C" fn reset_perfect_tt() {
    unsafe {
        for i in 0..PTT_SIZE { PTT_KEYS[i] = 0; PTT_VALUES[i] = 0; }
    }
}
