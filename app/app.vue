<template>
  <div class="flex flex-col gap-6 py-8">
    <div class="wrapper flex gap-4">
      <Card class="flex-1">
        <CardHeader>
          <CardTitle>Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-4">
            <Textarea rows="4" cols="40" @paste="onPaste" placeholder="Neopets HTML input"/>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            v-if="!pending"
            @click="calculate(puzzleOptions)"
            class="w-full"
            :disabled="!puzzleOptions"
          >Calculate</Button>
          <Button
            v-else
            variant="destructive"
            @click="cancel"
            class="w-full"
          >Cancel</Button>
        </CardFooter>
        <CardContent class="mt-[-1rem] pb-1">
          <Separator class="my-4" label="Or" />
        </CardContent>
        <CardFooter>
          <Button
            v-if="!pending"
            variant="secondary"
            @click="calculate()"
            class="w-full"
          >Calculate fallback</Button>
          <Button
            v-else
            variant="destructive"
            @click="cancel"
            class="w-full"
          >Cancel</Button>
        </CardFooter>
      </Card>

      <Card class="flex-1">
        <CardHeader>
          <CardTitle>Output</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-4">
            <Textarea rows="9" cols="40" readonly v-model="puzzleOptionsStringified" placeholder="Formatted to API input"/>
          </div>
        </CardContent>
      </Card>
    </div>

    <h1 v-if="pending || result" class="h1">
      {{ pending ? 'Loading results...' : 'Results' }}
    </h1>

    <div v-if="result" :key="resultHash" class="wrapper">
      <h2 class="h2">Info</h2>
      <p>{{ result.solutions.length > 0 ? '✅' : '❌' }} <strong>{{ result.solutions.length > 0 ? `${result.solutions.length} solution${result.solutions.length > 1 ? 's' : ''} found` : 'no solution found' }}</strong></p>
      <p>ℹ️ <strong>{{ result.meta.returningMaxOneSolution ? 'Maximum of one solution returned for better performance' : 'Looked for all possible solutions' }}</strong></p>
      <p>⏱️ <strong>{{ formatDuration(result.meta.calculationDuration) }}</strong> to calculate the situation</p>
      <p>🧠 <strong>{{ formatMemory(result.meta.maxMemoryUsed) }}</strong> max memory used</p>
      <br>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfPossibleCombinations) }}</strong> possible puzzle piece combinations in total</p>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfIteratorPlacementAttempts) }}</strong> puzzle piece placement attempts</p>
      <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfTriedCombinations) }}</strong> puzzle piece combinations tested for validity</p>
      <p><strong>{{ numberFormatter.format(result.meta.skippedDuplicateSituations) }}</strong> combinations skipped due to duplicate situations</p>
      <p><strong>{{ numberFormatter.format(result.meta.skippedImpossibleSituations) }}</strong> combinations skipped due to impossible situations</p>

      <h2 class="h2">Game board</h2>
      <div class="f">
        <Grid :grid="result.gameBoard" />
        ➡️
        <Grid :grid="result.gameBoard" :replaceAllWith="result.targetFigure.value" />
      </div>

      <details>
        <summary>
          <h2 class="h2">
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
          <h2 class="h2">
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
          <h2 class="h2">Phase 2: solutions ({{ numberFormatter.format(result.solutions.length) }}{{ result.meta.returningMaxOneSolution ? ' — maximized at one' : '' }})</h2>
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

      <Button
        size="lg"
        @click="print"
        class="my-8 w-full"
      >Print results</Button>
    </div>
    <div v-else-if="error">
      <h2>Error</h2>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Puzzle } from '#build/types/nitro-imports';
import type { PuzzleOptions } from '~~/server/utils/PuzzleLibrary';

const result = ref<Puzzle>();
const resultHash = ref<string>();
const pending = ref(false);
const error = ref<string>();

const showPossibleSolutionStarts = ref(false);

const puzzleOptions = ref<PuzzleOptions>();
const puzzleOptionsStringified = usePuzzleOptionsStringified(puzzleOptions);

function onPaste (event: ClipboardEvent) {
  const html = event.clipboardData?.getData('text/plain');

  if (!html) {
    throw new Error('No HTML found in clipboard');
  }

  puzzleOptions.value = parseNeopetsHtml(html);
  calculate(puzzleOptions.value);
}

let controller: AbortController;

async function calculate (payload?: PuzzleOptions) {
  error.value = undefined;
  pending.value = true;

  // NOTE: Unfortunately, canceling a request does not stop the calculation in the backend.
  // You can't solve it at all, even with WebSockets/SSE. What a great day.
  controller = new AbortController();
  controller.signal.addEventListener('abort', () => {
    pending.value = false;
  });

  try {
    const response = await $fetch<Puzzle>('/api/calculate-solutions', {
      method: 'POST',
      timeout: 0,
      retry: 0,
      retryDelay: 0,
      signal: controller.signal,
      ...(payload ? { body: payload } : {}),
    });

    resultHash.value = await hashObject(response);
    result.value = response;
    pending.value = false;
  }
  catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error.value = JSON.stringify((err as any).data.data, null, 2);
    result.value = undefined;
    throw err;
  }
}

function cancel() {
  controller?.abort('User canceled');
}

function print() {
  window.print();
}
</script>

<style lang="scss">
@import '@/assets/css/tailwind.css';

// html {
//   font-size: 14px;
//   font-family: system-ui;
// }

// details summary :is(h2, h3) {
//   display: inline-block;
// }

// ul {
//   list-style-position: inside;
//   padding-left: 0;
// }

.h1 {
  @apply wrapper text-3xl font-bold leading-10;
}

.h2 {
  @apply text-xl font-bold leading-8;
}

.wrapper {
  @apply mx-auto w-[calc(100%-4rem)] max-w-screen-xl;
}

.g {
  @apply grid grid-flow-col auto-cols-max gap-x-8 gap-y-4;
}

.f {
  @apply flex items-center gap-x-3;
}
</style>
