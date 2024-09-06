<template>
  <div>
    <button v-if="!pending" @click="calculate">Calculate</button>
    <button v-else @click="cancel">Cancel</button>
    <button @click="print">Print</button>

    <div>
      <p>Paste Neopets HTML:</p>
      <div class="f">
        <textarea rows="6" cols="40" @paste="onPaste" placeholder="Neopets HTML input"></textarea>
        <textarea rows="6" cols="40" readonly v-model="puzzleOptionsStringified" placeholder="Formatted to API input"></textarea>
      </div>
    </div>

    <h1>{{ !result ? 'Paste Neopets HTML or click Calculate to get started with a fallback' : pending ? 'Loading results...' : 'Results' }}</h1>

    <div v-if="result" :key="resultHash">
      <h2>Info</h2>
      <p>{{ result.solutions.length > 0 ? '✅' : '❌' }} <strong>{{ result.solutions.length > 0 ? `${result.solutions.length} solution${result.solutions.length > 1 ? 's' : ''} found` : 'no solution found' }}</strong></p>
      <p>ℹ️ <strong>{{ result.meta.returningMaxOneSolution ? 'Maximum of one solution returned for better performance' : 'Looked for all possible solutions' }}</strong></p>
      <p>⏱️ <strong>{{ formatDuration(result.meta.calculationDuration) }}</strong> to calculate the situation</p>
      <p>🧠 <strong>{{ formatMemory(result.meta.maxMemoryUsed) }}</strong> max memory used</p>
      <br>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfPossibleCombinations) }}</strong> possible puzzle piece combinations in total</p>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfTriedCombinations) }}</strong> puzzle piece combinations tried</p>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfIteratorPlacementAttempts) }}</strong> puzzle piece placement attempts</p>
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

      <details @toggle="showPossibleSolutionStarts = $event.newState === 'open'">
        <summary>
          <h2>
            Phase 1: possible solution starts based on correct corner outputs ({{ numberFormatter.format(result.possibleSolutionStarts.length) }})
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
            />
          </template>
        </template>
      </details>

      <details open>
        <summary>
          <h2>Phase 2: solutions ({{ numberFormatter.format(result.solutions.length) }}{{ result.meta.returningMaxOneSolution ? ' — maximized at one' : '' }})</h2>
        </summary>
        <p v-if="!result.solutions.length">No solutions possible.</p>
        <template v-else>
          <Solution
            v-for="(solution, index) of result.solutions"
            :key="index"
            :nth="index + 1"
            :only="result.solutions.length === 1"
            :solution="solution"
          />
        </template>
      </details>
    </div>
    <div v-else-if="error">
      <h2>Error</h2>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
// import { useWebSocket } from '@vueuse/core';
import type { Puzzle } from '#build/types/nitro-imports';

const result = ref<Puzzle>();
const resultHash = ref<string>();
const pending = ref(false);
const error = ref<string>();

const showPossibleSolutionStarts = ref(false);

const puzzleOptions = ref<PuzzleOptions>();

const puzzleOptionsStringified = computed(() => {
  if (!puzzleOptions.value) return '';

  const { figures, gameBoard, puzzlePieces } = puzzleOptions.value;

  return `{
  figures: ${JSON.stringify(figures).replaceAll('"', "'")},
  gameBoard: [
    ${gameBoard.map(row => `[${row.join(', ')}]`).join(',\n    ')},
  ],
  puzzlePieces: [
    ${puzzlePieces.map(piece => `[
      ${piece.map(row => `[${row.join(', ')}],`).join('\n      ')}
    ]`).join(',\n    ')},
  ],
}`;
});

// NOTE: Websockets are not working in Bun somehow. Status keeps being 'CONNECTING'.
// const {
//   status,
//   data,
//   send,
// } = useWebSocket(`ws://${location.host}/api/ws`);

// watch(status, (newVal) => {
//   console.log('WebSocket status:', newVal); // Log WebSocket state
// }, { immediate: true });

// watch(data, (newVal) => {
//   console.log(newVal);
// });

function onPaste (event: ClipboardEvent) {
  const html = event.clipboardData?.getData('text/plain');

  if (!html) {
    throw new Error('No HTML found in clipboard');
  }

  puzzleOptions.value = parseNeopetsHtml(html);
  calculate();
}

let controller: AbortController;

async function calculate () {
  error.value = undefined;
  pending.value = true;

  // NOTE: Unfortunately, canceling a request does not stop the calculation in the backend yet.
  // This may be solved by using web sockets, but those aren't working in Bun yet. What a great day.
  controller = new AbortController();
  controller.signal.addEventListener('abort', () => {
    pending.value = false;
  });

  // const success = send(JSON.stringify(puzzleOptions.value));

  // if (!success) {
  //   throw new Error('Failed to send data to WebSocket');
  // }

  const response = await $fetch<Puzzle>('/api/calculate-solutions', {
    method: 'POST',
    timeout: 0,
    retry: 0,
    retryDelay: 0,
    signal: controller.signal,
    ...(puzzleOptions.value ? { body: puzzleOptions.value } : {}),
  }).catch((e) => {
    error.value = JSON.stringify(e.data.data, null, 2);
    result.value = undefined;
    throw e;
  });

  resultHash.value = await hashObject(response);
  result.value = response;

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
  controller?.abort('User canceled');
}

function print() {
  window.print();
}
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
