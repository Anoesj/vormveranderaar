onmessage = async (event: MessageEvent<{
  event: 'calculate';
  payload: PuzzleOptions;
  settings: {
    preparePossibleSolutionStarts: boolean;
  };
}>) => {
  console.log('Web Worker about to calculate the following situation:', event.data);

  const puzzle = new Puzzle(event.data.payload);

  if (event.data.settings.preparePossibleSolutionStarts) {
    await puzzle.preparePossibleSolutionStarts();
  }

  await puzzle.bruteForceSolution();

  postMessage({
    event: 'finished',
    payload: puzzle,
  });
};