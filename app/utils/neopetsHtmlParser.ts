export function parseNeopetsHtml (html: string): PuzzleOptions {
  const parser = new DOMParser;
  const parsed = parser.parseFromString(html, 'text/html');

  const figuresTable = Array.from(parsed.querySelectorAll('table[border="1"]')).at(-1);

  if (!figuresTable) {
    throw new Error('No figures table found');
  }

  const figures = Array.from(figuresTable.querySelectorAll('img'))
    .map(img => img.src.split('/').at(-1)!.split('.gif').at(0)!)
    .filter(name => name !== 'arrow');

  // Remove last
  figures.pop();

  // const targetFigure = figures.at(-1);

  // console.log('Figures:', figures);
  // console.log('Target figure:', targetFigure);

  const gameBoard = Array.from(parsed.querySelector('#content .content table')!.querySelectorAll('tr')!)
    .map(tr => Array.from(tr.querySelectorAll('td')!)
      .map(td => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        const figure = td.querySelector('img')?.src.split('/').at(-1)!.split('.gif').at(0)!;
        return figures.indexOf(figure);
      })
    );

  // console.log('Game board:', gameBoard);

  const puzzlePieces = Array.from(parsed.querySelectorAll('table[cellpadding="15"] > tbody > tr > td'))
    .map(td => {
      // An empty cell's td has attribute height="10"
      // A filled cell has no properties
      // Empty cell should become 0
      // Filled cell should become 1
      return Array.from(td.querySelectorAll('tr'))
        .map(tr => Array.from(tr.querySelectorAll('td'))
          .map(td => td.hasAttribute('height') ? 0 : 1)
        );
    });

  // console.log('Puzzle pieces:', puzzlePieces);

  return {
    figures,
    gameBoard,
    puzzlePieces,
  };
}
