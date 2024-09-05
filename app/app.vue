<template>
  <div>
    <button v-if="!pending" @click="calculate">Calculate</button>
    <button v-else @click="cancel">Cancel</button>
    <button @click="print">Print</button>

    <div>
      <p>Enter Neopets HTML:</p>
      <textarea @paste="parseHtml"></textarea>
    </div>

    <h1>{{ !result ? 'Click calculate to get started' : pending ? 'Loading results...' : 'Results' }}</h1>

    <div v-if="result" :key="resultHash">
      <h2>Info</h2>
      <p>{{ result.solutions.length > 0 ? '✅' : '❌' }} <strong>{{ result.solutions.length > 0 ? `${result.solutions.length} solution${result.solutions.length > 1 ? 's' : ''} found` : 'no solution found' }}</strong></p>
      <p>ℹ️ <strong>{{ result.meta.returningMaxOneSolution ? 'Maximum of one solution returned for better performance' : 'Looked for all possible solutions' }}</strong></p>
      <p>⏱️ <strong>{{ formatDuration(result.meta.calculationDuration) }}</strong> to calculate the situation</p>
      <p>🧠 <strong>{{ formatMemory(result.meta.maxMemoryUsed) }}</strong> max memory used</p>
      <br>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfPossibleCombinations) }}</strong> possible puzzle piece combinations in total</p>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfTriedCombinations) }}</strong> puzzle piece combinations tried</p>
      <p><strong>{{ numberFormatter.format(result.meta.skippedDuplicateSituations) }}</strong> combinations skipped due to duplicate situations</p>
      <p><strong>{{ numberFormatter.format(result.meta.skippedImpossibleSituations) }}</strong> combinations skipped due to impossible situations</p>

      <h2>Game board</h2>
      <div class="f">
        <Grid :grid="result.gameBoard" />
        ➡️
        <Grid :grid="result.gameBoard" :replaceAllWith="result.targetFigure.value" />
      </div>

      <details>
        <summary>
          <h2>
            Puzzle pieces ({{ Object.keys(result.puzzlePieces).length }})
          </h2>
        </summary>
        <div class="g">
          <div
            v-for="puzzlePiece of result.puzzlePieces"
            :key="puzzlePiece.id"
          >
            <h3>{{ puzzlePiece.id }}</h3>
            <p>{{ puzzlePiece.possiblePositions.length }} possible positions</p>
            <Grid :grid="puzzlePiece.grid" isPuzzlePieceGrid />
          </div>
        </div>
      </details>

      <details @toggle="showPossibleSolutionStarts = $event.newState">
        <summary>
          <h2>
            Phase 1: possible solution starts based on correct corner outputs ({{ result.possibleSolutionStarts.length }})
          </h2>
        </summary>

        <template v-if="showPossibleSolutionStarts">
          <p v-if="!result.possibleSolutionStarts.length">
            No solutions for corners possible.
          </p>
          <template v-else>
            <PossibleSolutionStart
              v-for="(possibleSolutionStart, index) of result.possibleSolutionStarts"
              :key="index"
              :nth="index + 1"
              :possibleSolutionStart="possibleSolutionStart"
              :totalPuzzlePiecesCount="Object.keys(result.puzzlePieces).length"
              :numberFormatter="numberFormatter"
            />
          </template>
        </template>
      </details>

      <details open>
        <summary>
          <h2>Phase 2: solutions ({{ result.solutions.length }}{{ result.meta.returningMaxOneSolution ? ' — maximized at one' : '' }})</h2>
        </summary>
        <p v-if="!result.solutions.length">No solutions possible.</p>
        <template v-else>
          <Solution
            v-for="(solution, index) of result.solutions"
            :key="index"
            :nth="index + 1"
            :solution="solution"
          />
        </template>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Puzzle } from '#build/types/nitro-imports';
import type { PuzzleOptions } from '~~/server/utils/PuzzleLibrary';

// import { useLocalStorage } from '@vueuse/core';

// const matrixSource = useLocalStorage('matrix');

// type MatrixSource = number[][];

// const rowCount = useLocalStorage('rowCount', 6);
// const colCount = useLocalStorage('colCount', 6);

const result = ref<Puzzle>();
const resultHash = ref<string>();
const pending = ref(false);

const lang = 'nl-NL';
const numberFormatter = new Intl.NumberFormat(lang, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const showPossibleSolutionStarts = ref(false);

const puzzleOptions = ref<PuzzleOptions>();

function formatDuration (ms: number) {
  // Log seconds, minutes or hours depending on the duration
  if (ms < 1000) {
    return `${numberFormatter.format(ms)} milliseconds`;
  }
  else if (ms < 60_000) {
    return `${numberFormatter.format(ms / 1000)} seconds`;
  }
  else if (ms < 3_600_000) {
    return `${numberFormatter.format(ms / 60_000)} minutes`;
  }
  else {
    return `${numberFormatter.format(ms / 3_600_000)} hours`;
  }
}

function formatMemory (memory: number) {
  // B -> kB -> MB
  memory /= 1024 ** 2;

  const unit = memory > 1024 ? 'GB' : 'MB';
  return `${numberFormatter.format(unit === 'GB' ? memory / 1024 : memory)} ${unit}`;
}

function parseHtml (event: ClipboardEvent) {
  const parser = new DOMParser;
  const html = event.clipboardData?.getData('text/plain');

  if (!html) {
    console.log('No HTML found in clipboard');
    return;
  }

  const parsed = parser.parseFromString(html, 'text/html');

  const figuresTable = parsed.querySelector('table[border="1"]');

  if (!figuresTable) {
    console.log('No figures table found');
    return;
  }

  const figures = Array.from(figuresTable.querySelectorAll('img'))
    .map(img => img.src.split('/').at(-1)!.split('.gif').at(0)!)
    .filter(name => name !== 'arrow');

  // Remove last
  figures.pop();

  const targetFigure = figures.at(-1);

  console.log('Figures:', figures);
  console.log('Target figure:', targetFigure);

  const gameBoard = Array.from(parsed.querySelector('#content .content table')!.querySelectorAll('tr')!)
    .map(tr => Array.from(tr.querySelectorAll('td')!)
      .map(td => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        const figure = td.querySelector('img')?.src.split('/').at(-1)!.split('.gif').at(0)!;
        return figures.indexOf(figure);
      })
    );

  console.log('Game board:', gameBoard);

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

  console.log('Puzzle pieces:', puzzlePieces);

  // for (const table of allTables) {
  //   console.log(table.border);
  // }

  puzzleOptions.value = {
    figures,
    gameBoard,
    puzzlePieces,
  };

  calculate();
}

let controller: AbortController;

async function calculate () {
  pending.value = true;

  controller = new AbortController();

  controller.signal.addEventListener('abort', () => {
    pending.value = false;
  });

  const res = await $fetch('/api/calculate-solutions', {
    method: 'POST',
    timeout: 0,
    retry: 0,
    retryDelay: 0,
    signal: controller.signal,
    body: puzzleOptions.value,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  resultHash.value = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(result.value)))
    .then((hash) => Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''));

  result.value = res;

  // for await (const chunk of streamingFetch(() => fetch('/api/calculate-solutions', {
  //   signal: controller.signal,
  // }))) {
  //   const lastPart = chunk.split('___PUZZLE___').at(-1);

  //   if (lastPart) {
  //     result.value = JSON.parse(lastPart);
  //   }
  // }

  pending.value = false;
}

function cancel() {
  controller?.abort();
}

function print() {
  window.print();
}

// await run();
</script>

<style>
html {
  font-size: 14px;
  font-family: system-ui;
}

details summary :is(h2, h3) {
  display: inline-block;
}

ul {
  list-style-position: inside;
  padding-left: 0;
}

.g {
  display: grid;
  /* grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); */
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  column-gap: 1.8rem;
  row-gap: 1rem;
}

.f {
  display: flex;
  align-items: center;
  column-gap: 0.6rem;
}
</style>
