#![allow(clippy::too_many_arguments)]

use indexmap::IndexMap;
use js_sys::Function;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

// ============================================================================
// JS input types (camelCase JSON from PuzzleOptions)
// ============================================================================

#[derive(Deserialize, Clone)]
#[serde(untagged)]
enum FigureNameIn {
    Str(String),
    Num(f64),
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PuzzleOptionsIn {
    figures: Vec<FigureNameIn>,
    game_board: Vec<Vec<u8>>,
    puzzle_pieces: Vec<Vec<Vec<u8>>>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct SettingsIn {
    prepare_possible_solution_starts: bool,
}

// ============================================================================
// JS output types
// ============================================================================

#[derive(Serialize, Clone)]
#[serde(untagged)]
enum FigureNameOut {
    Str(String),
    Num(f64),
}

impl From<&FigureNameIn> for FigureNameOut {
    fn from(value: &FigureNameIn) -> Self {
        match value {
            FigureNameIn::Str(s) => FigureNameOut::Str(s.clone()),
            FigureNameIn::Num(n) => FigureNameOut::Num(*n),
        }
    }
}

#[derive(Serialize, Clone)]
struct FigureOut {
    name: FigureNameOut,
    value: u8,
}

#[derive(Serialize, Clone, Copy)]
struct PositionOut {
    x: usize,
    y: usize,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GridOut {
    data: Vec<Vec<u8>>,
    rows: usize,
    cols: usize,
    cells: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    is_solution: Option<bool>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PuzzlePieceOut {
    id: String,
    grid: GridOut,
    cells_influenced: usize,
    possible_positions: Vec<PositionOut>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PossibleSolutionPartOut {
    id: String,
    position: PositionOut,
    grid: GridOut,
    #[serde(skip_serializing_if = "Option::is_none")]
    before: Option<GridOut>,
    #[serde(skip_serializing_if = "Option::is_none")]
    after: Option<GridOut>,
    #[serde(skip_serializing_if = "Option::is_none")]
    part_of_possible_solution_start: Option<usize>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ContinuationInfoOut {
    unused_puzzle_pieces_count: usize,
    unused_puzzle_pieces_possible_combinations: f64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PossibleSolutionOut {
    target_value: u8,
    parts: Vec<PossibleSolutionPartOut>,
    #[serde(skip_serializing_if = "Option::is_none")]
    solution_start_index: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    continuation_info: Option<ContinuationInfoOut>,
}

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
struct MetaOut {
    total_number_of_possible_combinations: f64,
    total_number_of_tried_combinations: f64,
    total_number_of_iterator_placement_attempts: f64,
    returning_max_one_solution: bool,
    skipped_duplicate_situations: f64,
    skipped_impossible_situations: f64,
    max_memory_used: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    reached_max_memory: Option<bool>,
    calculation_duration: f64,
    throughput: f64,
    percentage_of_possible_combinations_tried: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PuzzleOut {
    figures: Vec<FigureOut>,
    target_figure: u8,
    game_board: GridOut,
    puzzle_pieces: IndexMap<String, PuzzlePieceOut>,
    solutions: Vec<PossibleSolutionOut>,
    possible_solution_starts: Vec<PossibleSolutionOut>,
    meta: MetaOut,
}

// ============================================================================
// Internal types
// ============================================================================

#[derive(Clone)]
struct Grid {
    data: Vec<u8>,
    rows: usize,
    cols: usize,
}

impl Grid {
    fn from_2d(d: &[Vec<u8>]) -> Self {
        let rows = d.len();
        let cols = if rows == 0 { 0 } else { d[0].len() };
        let mut data = Vec::with_capacity(rows * cols);
        for row in d {
            data.extend_from_slice(row);
        }
        Grid { data, rows, cols }
    }

    fn empty_like(other: &Grid) -> Self {
        Grid {
            data: vec![0u8; other.rows * other.cols],
            rows: other.rows,
            cols: other.cols,
        }
    }

    #[inline]
    fn cells(&self) -> usize {
        self.rows * self.cols
    }

    #[inline]
    fn at(&self, x: usize, y: usize) -> u8 {
        self.data[y * self.cols + x]
    }

    fn sum(&self) -> usize {
        let mut s = 0usize;
        for &v in &self.data {
            s += v as usize;
        }
        s
    }

    #[allow(dead_code)]
    fn every_is(&self, v: u8) -> bool {
        self.data.iter().all(|&x| x == v)
    }

    fn to_2d(&self) -> Vec<Vec<u8>> {
        let mut v = Vec::with_capacity(self.rows);
        for r in 0..self.rows {
            let start = r * self.cols;
            v.push(self.data[start..start + self.cols].to_vec());
        }
        v
    }

    fn to_output(&self, is_solution: Option<bool>) -> GridOut {
        GridOut {
            data: self.to_2d(),
            rows: self.rows,
            cols: self.cols,
            cells: self.cells(),
            is_solution,
        }
    }

    fn short_string(&self) -> String {
        let mut s = String::with_capacity(self.data.len());
        for &v in &self.data {
            s.push(char::from_digit(v as u32, 10).unwrap_or('?'));
        }
        s
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
struct CornerActive {
    top_left: bool,
    top_right: bool,
    bottom_left: bool,
    bottom_right: bool,
}

#[derive(Clone, Copy, PartialEq, Eq, Hash)]
enum CornerType {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

impl CornerType {
    const ALL: [CornerType; 4] = [
        CornerType::TopLeft,
        CornerType::TopRight,
        CornerType::BottomLeft,
        CornerType::BottomRight,
    ];
}

struct PuzzlePiece {
    id: String,
    grid: Grid,
    cells_influenced: usize,
    active_corners: CornerActive,
    spans_x: bool,
    spans_y: bool,
    #[allow(dead_code)]
    can_avoid_edges: bool,
    can_avoid_affecting_some_corners: bool,
    /// All possible top-left positions of the piece on the game board.
    possible_positions: Vec<PositionOut>,
    /// For each entry in `possible_positions`, flat game-board indices where the piece's
    /// 1-cells land. The brute-force inner loop reads these as a `&[usize]`.
    indices_by_position: Vec<Vec<usize>>,
    /// For each entry in `possible_positions`, an empty-game-board sized grid with the
    /// piece placed at that position. Only used when materializing solution output.
    grid_by_position: Vec<Grid>,
    /// `(0..possible_positions.len()).collect()`. Kept so the inner loop can iterate
    /// the same `&[usize]` regardless of whether we're avoiding corner-touching positions.
    all_position_indices: Vec<usize>,
    /// Indices into `possible_positions` that don't touch any game-board corner.
    corner_safe_position_indices: Vec<usize>,
}

impl PuzzlePiece {
    fn new(grid_2d: &[Vec<u8>], id: String, game_board: &Grid) -> Self {
        let grid = Grid::from_2d(grid_2d);

        let cells_influenced: usize = grid
            .data
            .iter()
            .map(|&v| (v as usize).min(1))
            .sum();

        let top_left = grid.at(0, 0) != 0;
        let top_right = grid.at(grid.cols - 1, 0) != 0;
        let bottom_left = grid.at(0, grid.rows - 1) != 0;
        let bottom_right = grid.at(grid.cols - 1, grid.rows - 1) != 0;
        let active_corners = CornerActive {
            top_left,
            top_right,
            bottom_left,
            bottom_right,
        };

        let spans_x = grid.cols == game_board.cols;
        let spans_y = grid.rows == game_board.rows;
        let can_avoid_edges =
            game_board.rows >= grid.rows + 2 && game_board.cols >= grid.cols + 2;

        let any_corner_inactive = !(active_corners.top_left
            && active_corners.top_right
            && active_corners.bottom_left
            && active_corners.bottom_right);

        let can_avoid_affecting_some_corners = can_avoid_edges
            || (game_board.rows >= grid.rows + 2 || game_board.cols >= grid.cols + 2)
            || (any_corner_inactive && !spans_x && !spans_y)
            || (((!active_corners.top_left && !active_corners.bottom_left)
                || (!active_corners.top_right && !active_corners.bottom_right))
                && !spans_x)
            || (((!active_corners.top_left && !active_corners.top_right)
                || (!active_corners.bottom_left && !active_corners.bottom_right))
                && !spans_y);

        let mut possible_positions = Vec::new();
        let mut indices_by_position: Vec<Vec<usize>> = Vec::new();
        let mut grid_by_position: Vec<Grid> = Vec::new();

        if game_board.rows >= grid.rows && game_board.cols >= grid.cols {
            for y in 0..=(game_board.rows - grid.rows) {
                for x in 0..=(game_board.cols - grid.cols) {
                    possible_positions.push(PositionOut { x, y });

                    let mut indices = Vec::new();
                    let mut placed = Grid::empty_like(game_board);
                    for ry in 0..grid.rows {
                        for rx in 0..grid.cols {
                            let v = grid.at(rx, ry);
                            if v != 0 {
                                let gx = x + rx;
                                let gy = y + ry;
                                let idx = gy * game_board.cols + gx;
                                indices.push(idx);
                                placed.data[idx] = v;
                            }
                        }
                    }
                    indices_by_position.push(indices);
                    grid_by_position.push(placed);
                }
            }
        }

        let mut corner_safe_position_indices = Vec::new();
        let gcols = game_board.cols;
        let grows = game_board.rows;
        for (i, _) in possible_positions.iter().enumerate() {
            let placed = &grid_by_position[i];
            let tl = placed.data[0] == 0;
            let tr = placed.data[gcols - 1] == 0;
            let bl = placed.data[(grows - 1) * gcols] == 0;
            let br = placed.data[grows * gcols - 1] == 0;
            if tl && tr && bl && br {
                corner_safe_position_indices.push(i);
            }
        }

        let all_position_indices: Vec<usize> = (0..possible_positions.len()).collect();

        PuzzlePiece {
            id,
            grid,
            cells_influenced,
            active_corners,
            spans_x,
            spans_y,
            can_avoid_edges,
            can_avoid_affecting_some_corners,
            possible_positions,
            indices_by_position,
            grid_by_position,
            all_position_indices,
            corner_safe_position_indices,
        }
    }

    #[inline]
    fn position_indices(&self, avoid_corners: bool) -> &[usize] {
        if avoid_corners {
            &self.corner_safe_position_indices
        } else {
            &self.all_position_indices
        }
    }

    #[inline]
    fn position_count(&self, avoid_corners: bool) -> usize {
        if avoid_corners {
            self.corner_safe_position_indices.len()
        } else {
            self.possible_positions.len()
        }
    }
}

// ============================================================================
// Corner combinations (prepare possible solution starts)
// ============================================================================

#[derive(Clone)]
struct CombinationPart {
    id: String,
    position: PositionOut,
    affects: Vec<CornerType>,
}

type Combination = Vec<CombinationPart>;

struct CornerInfo {
    #[allow(dead_code)]
    target_value: u8,
    minimum_transforms_needed: u8,
    possible_transforms: Vec<u8>,
    puzzle_pieces_that_can_affect_state: Vec<String>,
    possible_puzzle_piece_combinations: Vec<Combination>,
}

struct CornersInfo {
    top_left: CornerInfo,
    top_right: CornerInfo,
    bottom_left: CornerInfo,
    bottom_right: CornerInfo,
}

impl CornersInfo {
    fn get(&self, t: CornerType) -> &CornerInfo {
        match t {
            CornerType::TopLeft => &self.top_left,
            CornerType::TopRight => &self.top_right,
            CornerType::BottomLeft => &self.bottom_left,
            CornerType::BottomRight => &self.bottom_right,
        }
    }
    fn get_mut(&mut self, t: CornerType) -> &mut CornerInfo {
        match t {
            CornerType::TopLeft => &mut self.top_left,
            CornerType::TopRight => &mut self.top_right,
            CornerType::BottomLeft => &mut self.bottom_left,
            CornerType::BottomRight => &mut self.bottom_right,
        }
    }
}

fn corner_active_for_piece(piece: &PuzzlePiece, corner: CornerType) -> bool {
    match corner {
        CornerType::TopLeft => piece.active_corners.top_left,
        CornerType::TopRight => piece.active_corners.top_right,
        CornerType::BottomLeft => piece.active_corners.bottom_left,
        CornerType::BottomRight => piece.active_corners.bottom_right,
    }
}

// ============================================================================
// Puzzle / brute force
// ============================================================================

struct Puzzle {
    figures: Vec<FigureOut>,
    figures_count: u8,
    target_figure: u8,
    game_board: Grid,
    game_board_completed_sum: usize,
    puzzle_pieces: Vec<PuzzlePiece>,
    puzzle_pieces_that_cannot_avoid_any_corners: Vec<String>,
    corners_info: Option<CornersInfo>,
    possible_solution_starts: Vec<PossibleSolutionOut>,
    solutions: Vec<PossibleSolutionOut>,
    has_prepared_solution_starts: bool,
    unique_situations: HashSet<String>,
    meta: MetaOut,
    t_start: f64,
    t_last_still_thinking: f64,
    status_cb: Function,
    max_one_solution_hit: bool,
    /// `Some` when the run is one slice of a multi-worker split (set by `solve_slice`).
    /// Owned variant of `SliceCtx`; we hand a borrowed view to the recursion.
    slice_ctx: Option<SliceCtxOwned>,
}

struct SliceCtxOwned {
    worker_index: u32,
    num_workers: u32,
    stop_cb: Option<Function>,
}

fn now_ms() -> f64 {
    js_sys::Date::now()
}

impl Puzzle {
    fn new(options: PuzzleOptionsIn, status_cb: Function) -> Self {
        let figures: Vec<FigureOut> = options
            .figures
            .iter()
            .enumerate()
            .map(|(i, name)| FigureOut {
                name: name.into(),
                value: i as u8,
            })
            .collect();

        let figures_count = figures.len() as u8;
        let target_figure = figures.last().expect("figures must not be empty").value;

        let game_board = Grid::from_2d(&options.game_board);
        let game_board_completed_sum = (target_figure as usize) * game_board.cells();

        let mut puzzle_pieces = Vec::with_capacity(options.puzzle_pieces.len());
        for (i, piece_grid) in options.puzzle_pieces.iter().enumerate() {
            let id = char::from_u32(b'A' as u32 + i as u32).unwrap().to_string();
            puzzle_pieces.push(PuzzlePiece::new(piece_grid, id, &game_board));
        }

        let puzzle_pieces_that_cannot_avoid_any_corners: Vec<String> = puzzle_pieces
            .iter()
            .filter(|p| !p.can_avoid_affecting_some_corners)
            .map(|p| p.id.clone())
            .collect();

        let mut total: f64 = 1.0;
        for p in &puzzle_pieces {
            total *= p.possible_positions.len() as f64;
        }

        let returning_max_one_solution = total > 1_000_000.0;

        let mut meta = MetaOut::default();
        meta.total_number_of_possible_combinations = total;
        meta.returning_max_one_solution = returning_max_one_solution;

        let mut puzzle = Puzzle {
            figures,
            figures_count,
            target_figure,
            game_board,
            game_board_completed_sum,
            puzzle_pieces,
            puzzle_pieces_that_cannot_avoid_any_corners,
            corners_info: None,
            possible_solution_starts: Vec::new(),
            solutions: Vec::new(),
            has_prepared_solution_starts: false,
            unique_situations: HashSet::new(),
            meta,
            t_start: now_ms(),
            t_last_still_thinking: now_ms(),
            status_cb,
            max_one_solution_hit: false,
            slice_ctx: None,
        };

        puzzle.init_corners_info();
        puzzle
    }

    fn init_corners_info(&mut self) {
        let target = self.target_figure;
        let make = |corner_value: u8| -> CornerInfo {
            let mut minimum = (target as i32) - (corner_value as i32);
            if minimum < 0 {
                minimum += self.figures_count as i32;
            }
            CornerInfo {
                target_value: target,
                minimum_transforms_needed: minimum as u8,
                possible_transforms: Vec::new(),
                puzzle_pieces_that_can_affect_state: Vec::new(),
                possible_puzzle_piece_combinations: Vec::new(),
            }
        };

        let tl = self.game_board.at(0, 0);
        let tr = self.game_board.at(self.game_board.cols - 1, 0);
        let bl = self.game_board.at(0, self.game_board.rows - 1);
        let br = self
            .game_board
            .at(self.game_board.cols - 1, self.game_board.rows - 1);

        let mut corners = CornersInfo {
            top_left: make(tl),
            top_right: make(tr),
            bottom_left: make(bl),
            bottom_right: make(br),
        };

        // Possible transforms for each corner: 0..=pieceCount, keep those whose % figuresCount == minimum.
        let pieces_count = self.puzzle_pieces.len();
        let figures_count = self.figures_count as usize;
        for corner_type in CornerType::ALL {
            let info = corners.get_mut(corner_type);
            for i in 0..=pieces_count {
                if i % figures_count == info.minimum_transforms_needed as usize {
                    info.possible_transforms.push(i as u8);
                }
            }
        }

        // For each corner, list puzzle pieces that have an active cell on that corner.
        for corner_type in CornerType::ALL {
            let info = corners.get_mut(corner_type);
            info.puzzle_pieces_that_can_affect_state = self
                .puzzle_pieces
                .iter()
                .filter(|p| corner_active_for_piece(p, corner_type))
                .map(|p| p.id.clone())
                .collect();
        }

        // Build combinations per corner using bitmask over affecting pieces.
        for corner_type in CornerType::ALL {
            let ids = corners
                .get(corner_type)
                .puzzle_pieces_that_can_affect_state
                .clone();
            let possible_transforms = corners.get(corner_type).possible_transforms.clone();
            let mut combos: Vec<Combination> = Vec::new();

            let n = ids.len();
            if n <= 32 {
                let total: u64 = 1u64 << n;
                for mask in 0u64..total {
                    let ones = mask.count_ones() as u8;
                    if !possible_transforms.contains(&ones) {
                        continue;
                    }

                    let mut combination: Combination = Vec::new();
                    for nth_bit in 0..n {
                        if (mask >> nth_bit) & 1 == 1 {
                            let id = &ids[nth_bit];
                            let piece = self
                                .puzzle_pieces
                                .iter()
                                .find(|p| p.id == *id)
                                .expect("piece exists");

                            let (position, mut affected) = match corner_type {
                                CornerType::TopLeft => {
                                    let pos = PositionOut { x: 0, y: 0 };
                                    let mut affects = vec![CornerType::TopLeft];
                                    if piece.spans_x && piece.active_corners.top_right {
                                        affects.push(CornerType::TopRight);
                                    }
                                    if piece.spans_y && piece.active_corners.bottom_left {
                                        affects.push(CornerType::BottomLeft);
                                    }
                                    (pos, affects)
                                }
                                CornerType::TopRight => {
                                    let pos = PositionOut {
                                        x: self.game_board.cols - piece.grid.cols,
                                        y: 0,
                                    };
                                    let mut affects = vec![CornerType::TopRight];
                                    if piece.spans_x && piece.active_corners.top_left {
                                        affects.push(CornerType::TopLeft);
                                    }
                                    if piece.spans_y && piece.active_corners.bottom_right {
                                        affects.push(CornerType::BottomRight);
                                    }
                                    (pos, affects)
                                }
                                CornerType::BottomLeft => {
                                    let pos = PositionOut {
                                        x: 0,
                                        y: self.game_board.rows - piece.grid.rows,
                                    };
                                    let mut affects = vec![CornerType::BottomLeft];
                                    if piece.spans_x && piece.active_corners.bottom_right {
                                        affects.push(CornerType::BottomRight);
                                    }
                                    if piece.spans_y && piece.active_corners.top_left {
                                        affects.push(CornerType::TopLeft);
                                    }
                                    (pos, affects)
                                }
                                CornerType::BottomRight => {
                                    let pos = PositionOut {
                                        x: self.game_board.cols - piece.grid.cols,
                                        y: self.game_board.rows - piece.grid.rows,
                                    };
                                    let mut affects = vec![CornerType::BottomRight];
                                    if piece.spans_x && piece.active_corners.bottom_left {
                                        affects.push(CornerType::BottomLeft);
                                    }
                                    if piece.spans_y && piece.active_corners.top_right {
                                        affects.push(CornerType::TopRight);
                                    }
                                    (pos, affects)
                                }
                            };
                            affected.sort_by_key(|c| *c as u8);
                            combination.push(CombinationPart {
                                id: id.clone(),
                                position,
                                affects: affected,
                            });
                        }
                    }

                    combination.sort_by(|a, b| a.id.cmp(&b.id));
                    combos.push(combination);
                }
            }
            corners.get_mut(corner_type).possible_puzzle_piece_combinations = combos;
        }

        self.corners_info = Some(corners);
    }

    fn piece_by_id(&self, id: &str) -> &PuzzlePiece {
        self.puzzle_pieces
            .iter()
            .find(|p| p.id == id)
            .expect("piece exists by id")
    }

    fn stack_into(&self, base: &Grid, addend: &Grid) -> Grid {
        let mut out = base.clone();
        let figures_count = self.figures_count as u32;
        for i in 0..out.data.len() {
            out.data[i] =
                ((out.data[i] as u32 + addend.data[i] as u32) % figures_count) as u8;
        }
        out
    }

    fn prepare_possible_solution_starts(&mut self) {
        // For each (topLeft, topRight, bottomLeft, bottomRight) combination of corner combos,
        // check compatibility and build a possible solution start.
        let corners = self.corners_info.as_ref().expect("corners_info ready");
        let tl_list = corners.top_left.possible_puzzle_piece_combinations.clone();
        let tr_list = corners.top_right.possible_puzzle_piece_combinations.clone();
        let bl_list = corners.bottom_left.possible_puzzle_piece_combinations.clone();
        let br_list = corners.bottom_right.possible_puzzle_piece_combinations.clone();

        for tl in &tl_list {
            for tr in &tr_list {
                if !combos_compatible(tl, tr, CornerType::TopLeft, CornerType::TopRight) {
                    continue;
                }
                for bl in &bl_list {
                    if !combos_compatible(tl, bl, CornerType::TopLeft, CornerType::BottomLeft)
                        || !combos_compatible(tr, bl, CornerType::TopRight, CornerType::BottomLeft)
                    {
                        continue;
                    }
                    for br in &br_list {
                        if !combos_compatible(tl, br, CornerType::TopLeft, CornerType::BottomRight)
                            || !combos_compatible(
                                tr,
                                br,
                                CornerType::TopRight,
                                CornerType::BottomRight,
                            )
                            || !combos_compatible(
                                bl,
                                br,
                                CornerType::BottomLeft,
                                CornerType::BottomRight,
                            )
                        {
                            continue;
                        }

                        // Collect all unique parts from all four combos, dedupe by id.
                        let mut all_parts: Vec<CombinationPart> = Vec::new();
                        for combo in [tl, tr, bl, br] {
                            for part in combo {
                                if !all_parts.iter().any(|p| p.id == part.id) {
                                    all_parts.push(part.clone());
                                }
                            }
                        }

                        // Affected counts per corner across all parts.
                        let mut counts = [0usize; 4];
                        for part in &all_parts {
                            for &c in &part.affects {
                                counts[c as usize] += 1;
                            }
                        }

                        let info = self.corners_info.as_ref().unwrap();
                        let counts_ok = [
                            (&info.top_left, counts[CornerType::TopLeft as usize]),
                            (&info.top_right, counts[CornerType::TopRight as usize]),
                            (&info.bottom_left, counts[CornerType::BottomLeft as usize]),
                            (&info.bottom_right, counts[CornerType::BottomRight as usize]),
                        ]
                        .iter()
                        .all(|(corner_info, count)| {
                            corner_info.possible_transforms.contains(&(*count as u8))
                        });

                        if !counts_ok {
                            continue;
                        }

                        // Build PossibleSolution.
                        let mut parts_sorted = all_parts.clone();
                        parts_sorted.sort_by(|a, b| a.id.cmp(&b.id));

                        // Check that all required pieces (cannot avoid corners) are used.
                        let mut missing_required: Vec<&String> = self
                            .puzzle_pieces_that_cannot_avoid_any_corners
                            .iter()
                            .filter(|id| !parts_sorted.iter().any(|p| &p.id == *id))
                            .collect();
                        if !missing_required.is_empty() {
                            missing_required.clear();
                            continue;
                        }

                        // Build out parts: dedupe duplicates by sequence (id+position equality).
                        let candidate_signature: Vec<(String, usize, usize)> = parts_sorted
                            .iter()
                            .map(|p| (p.id.clone(), p.position.x, p.position.y))
                            .collect();

                        let exists = self.possible_solution_starts.iter().any(|other| {
                            if other.parts.len() != candidate_signature.len() {
                                return false;
                            }
                            other.parts.iter().enumerate().all(|(i, op)| {
                                let s = &candidate_signature[i];
                                op.id == s.0 && op.position.x == s.1 && op.position.y == s.2
                            })
                        });
                        if exists {
                            continue;
                        }

                        // Build before/after game boards by stacking pieces in order.
                        let mut previous_board = self.game_board.clone();
                        let mut parts_out: Vec<PossibleSolutionPartOut> =
                            Vec::with_capacity(parts_sorted.len());
                        for part in &parts_sorted {
                            let piece = self.piece_by_id(&part.id);
                            let pos_idx = piece
                                .possible_positions
                                .iter()
                                .position(|p| p.x == part.position.x && p.y == part.position.y)
                                .expect("position exists");
                            let placed = piece.grid_by_position[pos_idx].clone();
                            let before = previous_board.clone();
                            let after = self.stack_into(&previous_board, &placed);
                            previous_board = after.clone();

                            parts_out.push(PossibleSolutionPartOut {
                                id: part.id.clone(),
                                position: part.position,
                                grid: placed.to_output(None),
                                before: Some(before.to_output(None)),
                                after: Some(after.to_output(None)),
                                part_of_possible_solution_start: None, // set after sort
                            });
                        }

                        self.possible_solution_starts.push(PossibleSolutionOut {
                            target_value: self.target_figure,
                            parts: parts_out,
                            solution_start_index: None,
                            continuation_info: None,
                        });

                        self.post_status(format!(
                            "Added new possible solution start (#{})",
                            self.possible_solution_starts.len()
                        ));
                    }
                }
            }
        }

        // Compute continuation info and sort by combinations ascending.
        let pieces = &self.puzzle_pieces;
        for start in &mut self.possible_solution_starts {
            let used_ids: HashSet<&str> =
                start.parts.iter().map(|p| p.id.as_str()).collect();
            let mut unused: Vec<&PuzzlePiece> = pieces
                .iter()
                .filter(|p| !used_ids.contains(p.id.as_str()))
                .collect();
            unused.sort_by(|a, b| b.cells_influenced.cmp(&a.cells_influenced));
            let mut combos: f64 = 1.0;
            for p in &unused {
                combos *= p.position_count(true) as f64;
            }
            start.continuation_info = Some(ContinuationInfoOut {
                unused_puzzle_pieces_count: unused.len(),
                unused_puzzle_pieces_possible_combinations: combos,
            });
        }

        self.possible_solution_starts.sort_by(|a, b| {
            let ac = a
                .continuation_info
                .as_ref()
                .map(|c| c.unused_puzzle_pieces_possible_combinations)
                .unwrap_or(0.0);
            let bc = b
                .continuation_info
                .as_ref()
                .map(|c| c.unused_puzzle_pieces_possible_combinations)
                .unwrap_or(0.0);
            ac.partial_cmp(&bc).unwrap_or(std::cmp::Ordering::Equal)
        });

        // Assign solutionStartIndex and partOfPossibleSolutionStart.
        for (i, start) in self.possible_solution_starts.iter_mut().enumerate() {
            start.solution_start_index = Some(i);
            for part in &mut start.parts {
                part.part_of_possible_solution_start = Some(i);
            }
        }

        if self.possible_solution_starts.len() > 500 {
            self.meta.returning_max_one_solution = true;
        }

        self.has_prepared_solution_starts = true;
    }

    fn brute_force_solution(&mut self) {
        if !self.has_prepared_solution_starts {
            // Push a blank possible solution start.
            self.possible_solution_starts.push(PossibleSolutionOut {
                target_value: self.target_figure,
                parts: Vec::new(),
                solution_start_index: Some(0),
                continuation_info: None,
            });
        }

        let count = self.possible_solution_starts.len();
        for i in 0..count {
            if self.max_one_solution_hit {
                break;
            }
            self.brute_force_one_start(i);
        }

        self.finalize();
    }

    fn brute_force_one_start(&mut self, start_index: usize) {
        let avoid_corners = self.has_prepared_solution_starts;

        // Compute unused puzzle piece indices (sorted by cellsInfluenced desc).
        let used_ids: HashSet<String> = self.possible_solution_starts[start_index]
            .parts
            .iter()
            .map(|p| p.id.clone())
            .collect();

        let mut unused_indices: Vec<usize> = (0..self.puzzle_pieces.len())
            .filter(|&i| !used_ids.contains(&self.puzzle_pieces[i].id))
            .collect();
        unused_indices.sort_by(|&a, &b| {
            self.puzzle_pieces[b]
                .cells_influenced
                .cmp(&self.puzzle_pieces[a].cells_influenced)
        });

        let mut combos: f64 = 1.0;
        for &i in &unused_indices {
            combos *= self.puzzle_pieces[i].position_count(avoid_corners) as f64;
        }

        // Refresh continuation info on the solution start.
        self.possible_solution_starts[start_index].continuation_info =
            Some(ContinuationInfoOut {
                unused_puzzle_pieces_count: unused_indices.len(),
                unused_puzzle_pieces_possible_combinations: combos,
            });

        // Determine the game board so far (and its sum).
        let initial_board: Grid = match self.possible_solution_starts[start_index].parts.last() {
            Some(p) => {
                let after = p
                    .after
                    .as_ref()
                    .expect("last part should have after grid");
                Grid::from_2d(&after.data)
            }
            None => self.game_board.clone(),
        };
        let initial_board_sum = initial_board.sum();
        let completed_sum = self.game_board_completed_sum;

        // Since 0 <= cell <= target = figures_count - 1, sum <= completed_sum, with equality iff every cell == target.
        // This makes the solution check O(1) once we maintain a running sum.
        let is_solution_already = initial_board_sum == completed_sum;
        if let Some(last) = self.possible_solution_starts[start_index]
            .parts
            .last_mut()
        {
            if let Some(after) = last.after.as_mut() {
                after.is_solution = Some(is_solution_already);
            }
        }

        if unused_indices.is_empty() {
            if is_solution_already {
                let mut sol = self.possible_solution_starts[start_index].clone();
                sol.solution_start_index = Some(start_index);
                self.solutions.push(sol);
                self.meta.total_number_of_tried_combinations += 1.0;

                if self.meta.returning_max_one_solution {
                    self.max_one_solution_hit = true;
                    return;
                }
            }
            return;
        }

        // Duplicate-situation skip.
        let key = {
            let mut s = String::with_capacity(unused_indices.len() + initial_board.data.len());
            for &i in &unused_indices {
                s.push_str(&self.puzzle_pieces[i].id);
            }
            s.push_str(&initial_board.short_string());
            s
        };
        if !self.unique_situations.insert(key) {
            self.meta.skipped_duplicate_situations += combos;
            return;
        }

        // max_cells_influenced[k] = sum of cellsInfluenced over the last k pieces (in placement order).
        let n = unused_indices.len();
        let mut max_cells = vec![0usize; n + 1];
        let mut acc = 0usize;
        for k in 0..n {
            max_cells[k] = acc;
            acc += self.puzzle_pieces[unused_indices[n - 1 - k]].cells_influenced;
        }
        max_cells[n] = acc;

        // suffix_product[k] = product of position counts for pieces at depths k..n. Used when
        // adding to `skippedImpossibleSituations` after an early skip — instead of multiplying
        // through `next.len()` entries on every skip, we just read `suffix_product[depth + 1]`.
        let mut suffix_product: Vec<f64> = vec![1.0; n + 1];
        for k in (0..n).rev() {
            suffix_product[k] = suffix_product[k + 1]
                * (self.puzzle_pieces[unused_indices[k]].position_count(avoid_corners) as f64);
        }

        self.t_last_still_thinking = now_ms();

        // Take disjoint borrows of self so the inner free function can recurse without
        // re-borrowing self each call.
        let pieces: &[PuzzlePiece] = &self.puzzle_pieces;
        let figures_count = self.figures_count;
        let target_figure = self.target_figure;
        let t_start = self.t_start;
        let status_cb = &self.status_cb;
        let meta = &mut self.meta;
        let solutions = &mut self.solutions;
        let max_one_solution_hit = &mut self.max_one_solution_hit;
        let t_last_still_thinking = &mut self.t_last_still_thinking;
        let base_parts: Vec<PossibleSolutionPartOut> =
            self.possible_solution_starts[start_index].parts.clone();

        let mut state = IterState {
            board: initial_board.data.clone(),
            board_sum: initial_board_sum,
            placement_stack: Vec::with_capacity(n),
            iter_check_counter: 0,
        };

        iter_placements_inner(
            &IterCtx {
                pieces,
                figures_count,
                target_figure,
                completed_sum,
                avoid_corners,
                unused: &unused_indices,
                max_cells_per_left: &max_cells,
                suffix_product: &suffix_product,
                status_cb,
                t_start,
                base_parts: &base_parts,
                initial_board: &initial_board,
                start_index,
                returning_max_one_solution: meta.returning_max_one_solution,
                slice: self.slice_ctx.as_ref().map(|s| SliceCtx {
                    worker_index: s.worker_index,
                    num_workers: s.num_workers,
                    stop_cb: s.stop_cb.as_ref(),
                }),
            },
            &mut IterMutState {
                state: &mut state,
                meta,
                solutions,
                max_one_solution_hit,
                t_last_still_thinking,
            },
            0,
            0,
        );
    }

    fn finalize(&mut self) {
        let t_end = now_ms();
        self.meta.calculation_duration = t_end - self.t_start;
        if self.meta.total_number_of_possible_combinations > 0.0 {
            self.meta.percentage_of_possible_combinations_tried =
                self.meta.skipped_impossible_situations
                    / self.meta.total_number_of_possible_combinations
                    * 100.0;
        }
        if self.meta.calculation_duration > 0.0 {
            self.meta.throughput = (self.meta.skipped_impossible_situations
                / (self.meta.calculation_duration / 1000.0))
                .round();
        }
    }

    fn post_status(&self, msg: String) {
        let this = JsValue::NULL;
        let _ = self.status_cb.call1(&this, &JsValue::from_str(&msg));
    }

    fn into_output(self) -> PuzzleOut {
        let mut puzzle_pieces_map = IndexMap::new();
        for piece in &self.puzzle_pieces {
            puzzle_pieces_map.insert(
                piece.id.clone(),
                PuzzlePieceOut {
                    id: piece.id.clone(),
                    grid: piece.grid.to_output(None),
                    cells_influenced: piece.cells_influenced,
                    possible_positions: piece.possible_positions.clone(),
                },
            );
        }

        PuzzleOut {
            figures: self.figures,
            target_figure: self.target_figure,
            game_board: self.game_board.to_output(None),
            puzzle_pieces: puzzle_pieces_map,
            solutions: self.solutions,
            possible_solution_starts: self.possible_solution_starts,
            meta: self.meta,
        }
    }
}

// ============================================================================
// Brute-force inner loop
// ============================================================================

#[derive(Clone, Copy)]
struct Placement {
    piece_idx: usize,
    /// Index into `pieces[piece_idx].possible_positions` / `indices_by_position` /
    /// `grid_by_position`.
    pos_array_idx: usize,
}

/// Immutable context for the recursion.
struct IterCtx<'a> {
    pieces: &'a [PuzzlePiece],
    figures_count: u8,
    target_figure: u8,
    completed_sum: usize,
    avoid_corners: bool,
    unused: &'a [usize],
    max_cells_per_left: &'a [usize],
    suffix_product: &'a [f64],
    status_cb: &'a Function,
    t_start: f64,
    base_parts: &'a [PossibleSolutionPartOut],
    initial_board: &'a Grid,
    start_index: usize,
    returning_max_one_solution: bool,
    /// `Some` when this run is one slice of a multi-worker split. The recursion uses
    /// it (a) to skip depth-1 tasks not assigned to this worker, and (b) to poll the
    /// shared stop flag at the same throttle point as the `now_ms` time check.
    slice: Option<SliceCtx<'a>>,
}

/// Slicing/stop info for a single parallel worker. See `solve_slice`.
struct SliceCtx<'a> {
    worker_index: u32,
    num_workers: u32,
    /// JS callback returning `true` when this worker should stop ASAP (typically backed
    /// by `Atomics.load(sharedStopBuffer, 0) !== 0`). Called every ~65k attempts; the
    /// `wasm → JS` boundary is cheap enough at that rate.
    stop_cb: Option<&'a Function>,
}

/// Per-call state held by value across recursion.
struct IterState {
    /// Working game board (mutated in place + reverted on backtrack).
    board: Vec<u8>,
    /// Running sum of `board`. Maintained incrementally on apply/revert so we never
    /// have to scan the board to compute it, and so the solution check becomes
    /// `board_sum == completed_sum` (since values are bounded by `target_figure`).
    board_sum: usize,
    placement_stack: Vec<Placement>,
    iter_check_counter: u32,
}

/// Mutable references that need to outlive the recursion. Held separately from
/// `IterCtx` so the borrow checker is happy with the disjoint-field borrows.
struct IterMutState<'a> {
    state: &'a mut IterState,
    meta: &'a mut MetaOut,
    solutions: &'a mut Vec<PossibleSolutionOut>,
    max_one_solution_hit: &'a mut bool,
    t_last_still_thinking: &'a mut f64,
}

fn iter_placements_inner(ctx: &IterCtx, m: &mut IterMutState, depth: usize, parent_i_pos: usize) {
    if *m.max_one_solution_hit {
        return;
    }

    let piece_idx = ctx.unused[depth];
    let piece = &ctx.pieces[piece_idx];
    let next_count = ctx.unused.len() - depth - 1;
    let max_cells_at_left = ctx.max_cells_per_left[next_count];
    let skip_product = ctx.suffix_product[depth + 1];
    let figures_count = ctx.figures_count;
    let completed_sum = ctx.completed_sum;
    let avoid_corners = ctx.avoid_corners;

    // Pre-resolve the slice of position indices to iterate. With both the "all" and the
    // "corner-safe" sets stored as `Vec<usize>`, the inner loop body doesn't need to
    // branch on `avoid_corners` per iteration. An indexed loop with `get_unchecked`
    // benchmarked identically to the slice iterator, so we use the cleaner iterator.
    let position_indices = piece.position_indices(avoid_corners);

    // Slicing for multi-worker mode: at the depth where we hand out tasks to workers
    // (depth 1 for "normal" puzzles with >=2 unused pieces, or depth 0 if there's only
    // one unused piece), skip iterations whose `task_idx % num_workers != worker_index`.
    // The task index is built deterministically so every worker enumerates the same
    // tree, just keeps its own slice.
    //
    // `should_count` controls whether this iteration contributes to the meta counters.
    // Above the split depth every worker walks the same nodes (duplicated work), so to
    // make the *summed* counters across workers match the single-thread totals we only
    // let worker 0 count there. At and below the split depth each worker processes a
    // unique slice and all of them count their share.
    let (slice_at_this_depth, num_workers, worker_index, should_count) = match ctx.slice {
        Some(ref s) => {
            let split_depth = if ctx.unused.len() >= 2 { 1usize } else { 0usize };
            let count = depth >= split_depth || s.worker_index == 0;
            (depth == split_depth, s.num_workers as usize, s.worker_index as usize, count)
        }
        None => (false, 1, 0, true),
    };

    for (i_pos, &pos_arr_idx) in position_indices.iter().enumerate() {
        if *m.max_one_solution_hit {
            return;
        }

        // Skip tasks that belong to another worker.
        if slice_at_this_depth {
            let task_idx = parent_i_pos * position_indices.len() + i_pos;
            if task_idx % num_workers != worker_index {
                continue;
            }
        }

        if should_count {
            m.meta.total_number_of_iterator_placement_attempts += 1.0;
        }
        m.state.iter_check_counter += 1;

        // Throttle the JS `Date.now()` call — the wasm→JS call alone is more
        // expensive than dozens of iterations of the actual brute force.
        if m.state.iter_check_counter >= 65_536 {
            m.state.iter_check_counter = 0;
            // While we're already crossing the wasm↔JS boundary for the time check,
            // also poll the shared stop flag. Both are ~50-200ns; cheap at this throttle.
            if let Some(slice) = ctx.slice.as_ref() {
                if let Some(stop_cb) = slice.stop_cb {
                    if let Ok(v) = stop_cb.call0(&JsValue::NULL) {
                        if v.is_truthy() {
                            *m.max_one_solution_hit = true;
                            return;
                        }
                    }
                }
            }
            let now = now_ms();
            if now - *m.t_last_still_thinking > 5000.0 {
                *m.t_last_still_thinking = now;
                let time_passed = now - ctx.t_start;
                let total_possible = m.meta.total_number_of_possible_combinations;
                let attempts = m.meta.total_number_of_iterator_placement_attempts;
                let skipped_imp = m.meta.skipped_impossible_situations;
                let pct = if total_possible > 0.0 {
                    skipped_imp / total_possible * 100.0
                } else {
                    0.0
                };
                let throughput = if time_passed > 0.0 {
                    skipped_imp / (time_passed / 1000.0)
                } else {
                    0.0
                };
                let throughput_pct = if total_possible > 0.0 {
                    throughput / total_possible * 100.0
                } else {
                    0.0
                };
                let msg = format!(
                    "Still thinking...\nNumber of puzzle piece placement attempts so far: {}\nNumber of skipped impossible situations: {}\nTotal possible combinations: {}\nPercentage of all possible combinations tried: {:.2}%\nTime passed: {}\nThroughput: {} situations per second\nThroughput percentage: {}% per second",
                    fmt_num(attempts),
                    fmt_num(skipped_imp),
                    fmt_num(total_possible),
                    pct,
                    fmt_duration(time_passed),
                    fmt_num(throughput.round()),
                    fmt_small_percentage(throughput_pct),
                );
                let _ = ctx.status_cb.call1(&JsValue::NULL, &JsValue::from_str(&msg));
            }
        }

        // Apply the piece (bump each touched cell by +1 mod figures_count) and update the
        // running sum. Going through a separate `#[inline(always)]` helper turned out to
        // produce tighter wasm than inlining the loop body manually (LLVM seems to
        // optimize the smaller function context better; benchmarked +14% when manually
        // inlined).
        let indices: &[usize] =
            unsafe { piece.indices_by_position.get_unchecked(pos_arr_idx) };
        let delta = apply_piece(&mut m.state.board, indices, figures_count);
        m.state.board_sum = (m.state.board_sum as i64 + delta) as usize;

        // Influence-bound early exit.
        let transforms_needed = completed_sum as i64 - m.state.board_sum as i64;
        if transforms_needed > max_cells_at_left as i64 {
            revert_piece(&mut m.state.board, indices, figures_count);
            m.state.board_sum = (m.state.board_sum as i64 - delta) as usize;
            if should_count {
                m.meta.skipped_impossible_situations += skip_product;
            }
            continue;
        }

        m.state.placement_stack.push(Placement {
            piece_idx,
            pos_array_idx: pos_arr_idx,
        });

        if next_count > 0 {
            iter_placements_inner(ctx, m, depth + 1, i_pos);
        } else {
            // Leaf — check for solution. Sum equality is sufficient (see brute_force_one_start comment).
            if should_count {
                m.meta.total_number_of_tried_combinations += 1.0;
            }
            if m.state.board_sum == completed_sum {
                let parts = materialize_solution_parts(
                    ctx.pieces,
                    figures_count,
                    ctx.initial_board,
                    ctx.base_parts,
                    &m.state.placement_stack,
                );
                m.solutions.push(PossibleSolutionOut {
                    target_value: ctx.target_figure,
                    parts,
                    solution_start_index: Some(ctx.start_index),
                    continuation_info: None,
                });
                let _ = ctx
                    .status_cb
                    .call1(&JsValue::NULL, &JsValue::from_str("Found solution!"));
                if ctx.returning_max_one_solution {
                    *m.max_one_solution_hit = true;
                }
            }
        }

        revert_piece(&mut m.state.board, indices, figures_count);
        m.state.board_sum = (m.state.board_sum as i64 - delta) as usize;
        m.state.placement_stack.pop();
    }
}

// Note: benchmarked ~25% slowdown on level34 (5.3M attempts) when these used checked
// indexing. The bounds checks on a tight `u8` loop are clearly not free on wasm.
// Safety: every `idx` was constructed in `PuzzlePiece::new` from board coordinates that
// were bounded by `game_board.rows`/`cols`, so the index is always within the board.
#[inline(always)]
fn apply_piece(board: &mut [u8], indices: &[usize], figures_count: u8) -> i64 {
    let mut delta: i64 = 0;
    for &idx in indices {
        let old = unsafe { *board.get_unchecked(idx) };
        let new = if old + 1 == figures_count { 0 } else { old + 1 };
        delta += new as i64 - old as i64;
        unsafe {
            *board.get_unchecked_mut(idx) = new;
        }
    }
    delta
}

#[inline(always)]
fn revert_piece(board: &mut [u8], indices: &[usize], figures_count: u8) {
    for &idx in indices {
        let v = unsafe { *board.get_unchecked(idx) };
        let nv = if v == 0 { figures_count - 1 } else { v - 1 };
        unsafe {
            *board.get_unchecked_mut(idx) = nv;
        }
    }
}

/// Reconstruct full `parts` for an emitted solution: prefix from the possible-solution-start
/// followed by replayed snapshots for the brute-force-chosen placements. Walking the
/// placements once at success time is much cheaper than cloning before/grid/after snapshots
/// on every recursion step.
fn materialize_solution_parts(
    pieces: &[PuzzlePiece],
    figures_count: u8,
    initial_board: &Grid,
    base_parts: &[PossibleSolutionPartOut],
    placements: &[Placement],
) -> Vec<PossibleSolutionPartOut> {
    let mut parts = Vec::with_capacity(base_parts.len() + placements.len());
    parts.extend_from_slice(base_parts);

    let mut prev: Vec<u8> = initial_board.data.clone();
    let rows = initial_board.rows;
    let cols = initial_board.cols;
    let cells = rows * cols;

    for placement in placements {
        let piece = &pieces[placement.piece_idx];
        let pos = piece.possible_positions[placement.pos_array_idx];
        let placed_grid = &piece.grid_by_position[placement.pos_array_idx];

        let before_data = prev.clone();
        let mut after_data = prev.clone();
        for &idx in &piece.indices_by_position[placement.pos_array_idx] {
            let v = after_data[idx];
            after_data[idx] = if v + 1 == figures_count { 0 } else { v + 1 };
        }

        let before_grid = Grid {
            data: before_data,
            rows,
            cols,
        };
        let after_grid = Grid {
            data: after_data.clone(),
            rows,
            cols,
        };
        let _ = cells;

        parts.push(PossibleSolutionPartOut {
            id: piece.id.clone(),
            position: pos,
            grid: placed_grid.to_output(None),
            before: Some(before_grid.to_output(None)),
            after: Some(after_grid.to_output(None)),
            part_of_possible_solution_start: None,
        });

        prev = after_data;
    }

    if let Some(last) = parts.last_mut() {
        if let Some(after) = last.after.as_mut() {
            after.is_solution = Some(true);
        }
    }

    parts
}

fn combos_compatible(
    combo1: &Combination,
    combo2: &Combination,
    key1: CornerType,
    key2: CornerType,
) -> bool {
    // If combo1 contains a part that affects key2 but combo2 doesn't include that piece -> incompatible.
    for part in combo1 {
        if part.affects.contains(&key2) && !combo2.iter().any(|p| p.id == part.id) {
            return false;
        }
    }
    for part in combo2 {
        if part.affects.contains(&key1) && !combo1.iter().any(|p| p.id == part.id) {
            return false;
        }
    }
    // Shared pieces must be at same position.
    for part1 in combo1 {
        if let Some(part2) = combo2.iter().find(|p| p.id == part1.id) {
            if part1.position.x != part2.position.x || part1.position.y != part2.position.y {
                return false;
            }
        }
    }
    true
}

// ============================================================================
// Number formatting helpers (mostly for status messages)
// ============================================================================

fn fmt_num(n: f64) -> String {
    // nl-NL style grouping with '.'. Format the f64 *directly* — going through
    // `as i64` would saturate at i64::MAX (~9.22e18), which is well within reach for
    // big puzzles. With that cast, "total possible combinations", "skipped impossible
    // situations" and "throughput" would all clamp to the same string mid-solve.
    if !n.is_finite() {
        return n.to_string();
    }
    let sign = if n < 0.0 { "-" } else { "" };
    let s = format!("{:.0}", n.abs());
    let bytes = s.as_bytes();
    let mut grouped = String::with_capacity(s.len() + s.len() / 3);
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (bytes.len() - i) % 3 == 0 {
            grouped.push('.');
        }
        grouped.push(*b as char);
    }
    format!("{}{}", sign, grouped)
}

// Throughput-as-a-percentage of total combinations per second is usually a tiny
// number (e.g. 1e-8 %/s on big puzzles), so format by significant digits instead
// of fixed decimals — `{:.2}` would always render 0.
fn fmt_small_percentage(n: f64) -> String {
    if !n.is_finite() || n == 0.0 {
        return "0".to_string();
    }
    let abs = n.abs();
    if abs >= 0.01 {
        format!("{:.4}", n)
    } else {
        // 4 significant digits, scientific notation for very small values.
        format!("{:.3e}", n)
    }
}

fn fmt_duration(ms: f64) -> String {
    if ms < 1000.0 {
        format!("{} milliseconds", fmt_num(ms))
    } else if ms < 60_000.0 {
        format!("{:.2} seconds", ms / 1000.0)
    } else if ms < 3_600_000.0 {
        format!("{:.2} minutes", ms / 60_000.0)
    } else {
        format!("{:.2} hours", ms / 3_600_000.0)
    }
}

// ============================================================================
// wasm-bindgen entry point
// ============================================================================

#[wasm_bindgen(start)]
pub fn on_start() {
    // Provide a useful panic message in the browser console.
    std::panic::set_hook(Box::new(|info| {
        let msg = info.to_string();
        web_sys_console_error(&msg);
    }));
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console, js_name = error)]
    fn web_sys_console_error(msg: &str);
}

#[wasm_bindgen]
pub fn solve(
    options_js: JsValue,
    settings_js: JsValue,
    status_cb: Function,
) -> Result<JsValue, JsValue> {
    let options: PuzzleOptionsIn = serde_wasm_bindgen::from_value(options_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid PuzzleOptions: {}", e)))?;
    let settings: SettingsIn = serde_wasm_bindgen::from_value(settings_js).unwrap_or_default();

    let mut puzzle = Puzzle::new(options, status_cb);

    if settings.prepare_possible_solution_starts {
        puzzle.prepare_possible_solution_starts();
    }

    puzzle.brute_force_solution();

    let out = puzzle.into_output();
    let serializer = serde_wasm_bindgen::Serializer::new()
        .serialize_maps_as_objects(true)
        .serialize_large_number_types_as_bigints(false);
    out.serialize(&serializer)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// Like `solve`, but processes only the tasks assigned to this worker out of `num_workers`.
///
/// Slicing happens at "task depth": for puzzles with ≥ 2 unused puzzle pieces (the common
/// case) that's depth 1 of the recursion — task index = `root_pos_i * num_depth1_positions
/// + depth1_pos_i`, and worker `w` processes indices where `task_idx % num_workers == w`.
/// For puzzles with exactly one unused piece, slicing falls back to depth 0.
///
/// `stop_cb` is polled every ~65k attempts (same throttle as the time check). Typically
/// backed by an `Atomics.load` on a `SharedArrayBuffer` so the orchestrator can broadcast
/// "first worker found a solution, everyone bail" cheaply.
#[wasm_bindgen]
pub fn solve_slice(
    options_js: JsValue,
    settings_js: JsValue,
    status_cb: Function,
    num_workers: u32,
    worker_index: u32,
    stop_cb: Option<Function>,
) -> Result<JsValue, JsValue> {
    let options: PuzzleOptionsIn = serde_wasm_bindgen::from_value(options_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid PuzzleOptions: {}", e)))?;
    let settings: SettingsIn = serde_wasm_bindgen::from_value(settings_js).unwrap_or_default();

    if num_workers == 0 || worker_index >= num_workers {
        return Err(JsValue::from_str(
            "solve_slice: invalid (num_workers, worker_index) pair",
        ));
    }

    let mut puzzle = Puzzle::new(options, status_cb);
    puzzle.slice_ctx = Some(SliceCtxOwned {
        worker_index,
        num_workers,
        stop_cb,
    });

    if settings.prepare_possible_solution_starts {
        puzzle.prepare_possible_solution_starts();
    }

    puzzle.brute_force_solution();

    let out = puzzle.into_output();
    let serializer = serde_wasm_bindgen::Serializer::new()
        .serialize_maps_as_objects(true)
        .serialize_large_number_types_as_bigints(false);
    out.serialize(&serializer)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[cfg(test)]
mod tests {
    use super::fmt_num;

    #[test]
    fn fmt_num_handles_huge_f64() {
        // ~3.3e19 — comfortably past i64::MAX (~9.22e18). With the old
        // `as i64` cast this would saturate to "9.223.372.036.854.775.807".
        assert_eq!(fmt_num(3.3e19), "33.000.000.000.000.000.000");
        assert_eq!(fmt_num(1.0e20), "100.000.000.000.000.000.000");
        assert_eq!(fmt_num(1234.0), "1.234");
        assert_eq!(fmt_num(0.0), "0");
        assert_eq!(fmt_num(-1234.0), "-1.234");
    }
}
