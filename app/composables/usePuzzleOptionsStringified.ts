export function usePuzzleOptionsStringified (puzzleOptionsRef: Ref<PuzzleOptions | undefined>) {
  return computed(() => {
    if (!puzzleOptionsRef.value) {
      return '';
    }

    const { figures, gameBoard, puzzlePieces } = puzzleOptionsRef.value;

    return `{
  figures: [${figures.map(f => `'${f}'`).join(', ')}],
  gameBoard: [
    ${gameBoard.map(row => `[${row.join(', ')}]`).join(',\n    ')},
  ],
  puzzlePieces: [
    ${puzzlePieces.map(piece => `[
      ${piece.map(row => `[${row.join(', ')}],`).join('\n      ')}
    ]`).join(',\n    ')},
  ],
},`;
  });
}