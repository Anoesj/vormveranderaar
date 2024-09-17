export function parseNeopetsHtml (html: string): PuzzleOptions {
  const parser = new DOMParser;
  const parsed = parser.parseFromString(html, 'text/html');

  const figuresTable = Array.from(parsed.querySelectorAll('table[border="1"]')).at(-1);

  if (!figuresTable) {
    throw new Error('No figures table found');
  }

  const figures = Array.from(figuresTable.querySelectorAll('img'))
    .map(img => img.src)
    .filter(src => src.split('/').at(-1)!.split('.gif').at(0)! !== 'arrow');

  // Remove last, as it's always the same as the first
  figures.pop();

  const gameBoard = Array.from(parsed.querySelector('#content .content table:not([border="1"])')!.querySelectorAll('tr')!)
    .map(tr => Array.from(tr.querySelectorAll('td')!)
      .map(td => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        return figures.indexOf(td.querySelector('img')?.src!);
      })
    );

  const puzzlePieces = Array.from(parsed.querySelectorAll('table[cellpadding="15"] > tbody > tr > td'))
    .map(td => {
      // An empty cell's td has attribute height="10"
      // A filled cell has no properties
      // Empty cell should become 0
      // Filled cell should become 1
      return Array.from(td.querySelectorAll('tr'))
        .map(tr => Array.from(tr.querySelectorAll('td'))
          .map(td => (td.hasAttribute('height') ? 0 : 1))
        );
    });

  return {
    figures,
    gameBoard,
    puzzlePieces,
  };
}
