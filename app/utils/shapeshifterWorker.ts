onmessage = async (event: MessageEvent<{
  type: 'calculate';
  payload: PuzzleOptions;
  settings: {
    preparePossibleSolutionStarts: boolean;
  };
}>) => {
  if (event.data.type === 'calculate') {
    console.log('Web Worker about to calculate the following situation:', event.data.payload);

    const puzzle = new Puzzle(event.data.payload);

    if (event.data.settings.preparePossibleSolutionStarts) {
      await puzzle.preparePossibleSolutionStarts();
    }

    await puzzle.bruteForceSolution();

    postMessage({
      type: 'finished',
      payload: puzzle,
    });
  }
  else {
    throw new TypeError('Unknown message event type');
  }
};
