<template>
  <div>
    <button v-if="!pending" @click="calculate">Calculate</button>
    <button v-else @click="cancel">Cancel</button>
    <button @click="print">Print</button>

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

      <details>
        <summary>
          <h2>
            Phase 1: possible solution starts based on correct corner outputs ({{ result.possibleSolutionStarts.length }})
          </h2>
        </summary>
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

      <!-- <details>
        <summary>
          <h2>
            Debug: non-solutions ({{ result.nonSolutions.length }})
          </h2>
        </summary>

        <p v-if="!result.nonSolutions.length">-</p>
        <template
          v-else
          v-for="(nonSolution, index) of result.nonSolutions"
        >
          <h3>#{{ index + 1 }}</h3>
          <h4>Puzzle pieces</h4>
          <template v-for="part of nonSolution">
            <h5>
              {{ part.id }}{{
                part.partOfPossibleSolutionStart !== undefined
                  ? ` (part of possible solution start #${part.partOfPossibleSolutionStart + 1})`
                  : ''
              }}
            </h5>

            <div class="f">
              <Grid :grid="part.before!" />
              ➕
              <Grid :grid="part.grid" isPuzzlePieceGrid />
              🟰
              <Grid :grid="part.before!" />
              <span style="font-size: 1.5rem; margin-left: 0.5rem">❌</span>
            </div>
          </template>
        </template>
      </details> -->

      <!-- <details>
        <summary><h2>Debug: original data</h2></summary>
        <pre>{{ result }}</pre>
      </details> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Puzzle } from '#build/types/nitro-imports';

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

let controller: AbortController;

async function calculate () {
  pending.value = true;

  controller = new AbortController();

  controller.signal.addEventListener('abort', () => {
    pending.value = false;
  });

  const res = await $fetch('/api/calculate-solutions', {
    timeout: 0,
    retry: 0,
    retryDelay: 0,
    signal: controller.signal,
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
