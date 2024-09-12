onmessage = async (e) => {
  console.log('Web Worker about to calculate the following situation:', e.data);

  const puzzle = new Puzzle(e.data);
  await puzzle.bruteForceSolution();
  postMessage(puzzle);
};