export default defineEventHandler(async (event) => {
  // Get event data, which is in the form of PuzzleOptions.
  const body = await readBody<PuzzleOptions>(event);

  const puzzleOptions = body || PuzzleLibrary.level10;

  let puzzle: InstanceType<typeof Puzzle>;

  try {
    puzzle = new Puzzle(puzzleOptions);
    // await puzzle.preparePossibleSolutionStarts();
    await puzzle.bruteForceSolution();
    // await puzzle.bruteForceSolution({ from: 747, to: 748 });
    // await puzzle.bruteForceSolution({ from: 387, to: 388 });
  }
  catch (err) {
    throw createError({
      statusCode: 400,
      data: err,
    });
  }

  // TODO: Temporary. If not doing this, complex puzzles take way to long to stringify.
  // puzzle.possibleSolutionStarts.length = 0;

  return puzzle;
});
