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
    possible_positions: Vec<PositionOut>,
    possible_positions_where_corners_not_affected: Vec<PositionOut>,
    /// For each possible position, flat indices in game-board where the piece's 1-cells land.
    indices_by_position_index: Vec<Vec<usize>>,
    /// For each possible position, an empty-game-board sized grid with the piece placed.
    grid_by_position_index: Vec<Grid>,
    /// Position -> index in `possible_positions` (and the vecs above).
    position_index_by_xy: std::collections::HashMap<(usize, usize), usize>,
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
        let mut indices_by_position_index = Vec::new();
        let mut grid_by_position_index = Vec::new();
        let mut position_index_by_xy = std::collections::HashMap::new();

        if game_board.rows >= grid.rows && game_board.cols >= grid.cols {
            for y in 0..=(game_board.rows - grid.rows) {
                for x in 0..=(game_board.cols - grid.cols) {
                    let pos_idx = possible_positions.len();
                    possible_positions.push(PositionOut { x, y });
                    position_index_by_xy.insert((x, y), pos_idx);

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
                    indices_by_position_index.push(indices);
                    grid_by_position_index.push(placed);
                }
            }
        }

        let mut possible_positions_where_corners_not_affected = Vec::new();
        let gcols = game_board.cols;
        let grows = game_board.rows;
        for (i, p) in possible_positions.iter().enumerate() {
            let placed = &grid_by_position_index[i];
            let tl = placed.data[0] == 0;
            let tr = placed.data[gcols - 1] == 0;
            let bl = placed.data[(grows - 1) * gcols] == 0;
            let br = placed.data[grows * gcols - 1] == 0;
            if tl && tr && bl && br {
                possible_positions_where_corners_not_affected.push(*p);
            }
        }

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
            possible_positions_where_corners_not_affected,
            indices_by_position_index,
            grid_by_position_index,
            position_index_by_xy,
        }
    }

    fn get_possible_positions(&self, avoid_corners: bool) -> &[PositionOut] {
        if avoid_corners {
            &self.possible_positions_where_corners_not_affected
        } else {
            &self.possible_positions
        }
    }

    /// Returns the empty-board-sized grid with the piece placed at `pos`.
    fn placed_grid(&self, pos: PositionOut) -> &Grid {
        let idx = self.position_index_by_xy[&(pos.x, pos.y)];
        &self.grid_by_position_index[idx]
    }

    fn placed_indices(&self, pos: PositionOut) -> &[usize] {
        let idx = self.position_index_by_xy[&(pos.x, pos.y)];
        &self.indices_by_position_index[idx]
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
    /// For brute force: max_cells_influenced[puzzle_pieces_left_after_current] = sum of next pieces' cellsInfluenced.
    /// Sized to current solution start's unused puzzle pieces count + 1.
    max_cells_influenced_per_left: Vec<usize>,
    meta: MetaOut,
    t_start: f64,
    t_last_still_thinking: f64,
    status_cb: Function,
    max_one_solution_hit: bool,
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
            max_cells_influenced_per_left: Vec::new(),
            meta,
            t_start: now_ms(),
            t_last_still_thinking: now_ms(),
            status_cb,
            max_one_solution_hit: false,
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

    fn stack_indices(&self, base: &Grid, indices: &[usize]) -> Grid {
        let mut out = base.clone();
        let figures_count = self.figures_count;
        for &idx in indices {
            out.data[idx] = (out.data[idx] + 1) % figures_count;
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
                            let placed = piece.placed_grid(part.position).clone();
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
                combos *= p.get_possible_positions(true).len() as f64;
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
            combos *= self.puzzle_pieces[i]
                .get_possible_positions(avoid_corners)
                .len() as f64;
        }

        // Refresh continuation info on the solution start.
        self.possible_solution_starts[start_index].continuation_info =
            Some(ContinuationInfoOut {
                unused_puzzle_pieces_count: unused_indices.len(),
                unused_puzzle_pieces_possible_combinations: combos,
            });

        // Determine the game board so far.
        let game_board_so_far = match self.possible_solution_starts[start_index].parts.last() {
            Some(p) => {
                let after = p
                    .after
                    .as_ref()
                    .expect("last part should have after grid");
                Grid::from_2d(&after.data)
            }
            None => self.game_board.clone(),
        };

        let is_solution_already = game_board_so_far.every_is(self.target_figure);
        // Set isSolution on the last part's `after` grid (matches JS behavior).
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

        // Check duplicate-situation skip.
        let key = {
            let mut s = String::new();
            for &i in &unused_indices {
                s.push_str(&self.puzzle_pieces[i].id);
            }
            s.push_str(&game_board_so_far.short_string());
            s
        };
        if self.unique_situations.contains(&key) {
            self.meta.skipped_duplicate_situations += combos;
            return;
        }
        self.unique_situations.insert(key);

        // Build max_cells_influenced_per_left vector.
        // index = puzzle_pieces_left_after_current = next.len()
        // max_cells_influenced_per_left[k] = sum of cellsInfluenced over the last k pieces (in placement order)
        let n = unused_indices.len();
        let mut max_cells = vec![0usize; n + 1];
        let mut acc = 0usize;
        for k in 0..n {
            max_cells[k] = acc;
            let piece_idx = unused_indices[n - 1 - k];
            acc += self.puzzle_pieces[piece_idx].cells_influenced;
        }
        max_cells[n] = acc;
        self.max_cells_influenced_per_left = max_cells;

        self.t_last_still_thinking = now_ms();

        // Iterate placements recursively.
        let base_parts = self.possible_solution_starts[start_index].parts.clone();
        let mut accumulated = base_parts;
        self.iter_placements(
            &game_board_so_far,
            &mut accumulated,
            &unused_indices,
            0,
            start_index,
            avoid_corners,
        );
    }

    fn iter_placements(
        &mut self,
        game_board: &Grid,
        accumulated: &mut Vec<PossibleSolutionPartOut>,
        unused: &[usize],
        depth: usize,
        start_index: usize,
        avoid_corners: bool,
    ) {
        let current_piece_idx = unused[depth];
        let next_count = unused.len() - depth - 1;

        // Clone positions out so we can borrow self mutably below.
        let positions: Vec<PositionOut> = self.puzzle_pieces[current_piece_idx]
            .get_possible_positions(avoid_corners)
            .to_vec();

        let position_count = positions.len();
        for i in 0..position_count {
            if self.max_one_solution_hit {
                return;
            }

            self.meta.total_number_of_iterator_placement_attempts += 1.0;

            // Status update every ~5s.
            let now = now_ms();
            if now - self.t_last_still_thinking > 5000.0 {
                self.t_last_still_thinking = now;
                let time_passed = now - self.t_start;
                let total_possible = self.meta.total_number_of_possible_combinations;
                let attempts = self.meta.total_number_of_iterator_placement_attempts;
                let skipped_imp = self.meta.skipped_impossible_situations;
                let pct = if total_possible > 0.0 {
                    skipped_imp / total_possible * 100.0
                } else {
                    0.0
                };
                let throughput = if time_passed > 0.0 {
                    (skipped_imp / (time_passed / 1000.0)).round()
                } else {
                    0.0
                };
                let msg = format!(
                    "Still thinking...\nNumber of puzzle piece placement attempts so far: {}\nNumber of skipped impossible situations: {}\nTotal possible combinations: {}\nPercentage of all possible combinations tried: {:.2}%\nTime passed: {}\nThroughput: {} situations per second",
                    fmt_num(attempts),
                    fmt_num(skipped_imp),
                    fmt_num(total_possible),
                    pct,
                    fmt_duration(time_passed),
                    fmt_num(throughput),
                );
                self.post_status(msg);
            }

            let pos = positions[i];
            let placed_grid;
            let placed_indices;
            {
                let piece = &self.puzzle_pieces[current_piece_idx];
                placed_grid = piece.placed_grid(pos).clone();
                placed_indices = piece.placed_indices(pos).to_vec();
            }

            let before = game_board.clone();
            let after = self.stack_indices(game_board, &placed_indices);

            // Heuristic skip.
            let after_sum = after.sum();
            let transforms_needed =
                self.game_board_completed_sum as i64 - after_sum as i64;
            let next_max = self.max_cells_influenced_per_left[next_count];
            let can_be_solved_from_here = transforms_needed <= next_max as i64;

            if !can_be_solved_from_here {
                let mut skipped: f64 = 1.0;
                for k in (depth + 1)..unused.len() {
                    let p_idx = unused[k];
                    skipped *=
                        self.puzzle_pieces[p_idx].get_possible_positions(avoid_corners).len()
                            as f64;
                }
                self.meta.skipped_impossible_situations += skipped;
                continue;
            }

            let piece_id = self.puzzle_pieces[current_piece_idx].id.clone();
            accumulated.push(PossibleSolutionPartOut {
                id: piece_id,
                position: pos,
                grid: placed_grid.to_output(None),
                before: Some(before.to_output(None)),
                after: Some(after.to_output(None)),
                part_of_possible_solution_start: None,
            });

            if next_count > 0 {
                self.iter_placements(
                    &after,
                    accumulated,
                    unused,
                    depth + 1,
                    start_index,
                    avoid_corners,
                );
            } else {
                // Leaf: check solution.
                self.meta.total_number_of_tried_combinations += 1.0;
                let is_sol = after.every_is(self.target_figure);
                if is_sol {
                    // Mark last part's `after.isSolution = true`.
                    if let Some(last) = accumulated.last_mut() {
                        if let Some(a) = last.after.as_mut() {
                            a.is_solution = Some(true);
                        }
                    }
                    let sol = PossibleSolutionOut {
                        target_value: self.target_figure,
                        parts: accumulated.clone(),
                        solution_start_index: Some(start_index),
                        continuation_info: None,
                    };
                    self.solutions.push(sol);
                    self.post_status("Found solution!".to_string());

                    if self.meta.returning_max_one_solution {
                        self.max_one_solution_hit = true;
                        accumulated.pop();
                        return;
                    }
                }
            }

            accumulated.pop();
        }
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
    // nl-NL style grouping with '.': just use a simple implementation.
    let rounded = n.round() as i64;
    let abs = rounded.abs();
    let s = abs.to_string();
    let bytes = s.as_bytes();
    let mut grouped = String::new();
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (bytes.len() - i) % 3 == 0 {
            grouped.push('.');
        }
        grouped.push(*b as char);
    }
    if rounded < 0 {
        format!("-{}", grouped)
    } else {
        grouped
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
