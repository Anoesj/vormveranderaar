<template>
  <div class="flex flex-col gap-6 py-8">
    <div class="wrapper flex gap-4">
      <Card class="flex-1 bg-[#f8fafc]">
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
            v-if="pending !== 'input'"
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
          <Separator class="my-4" label="Or" labelClass="bg-[#f8fafc]" />
        </CardContent>
        <CardFooter>
          <Button
            v-if="pending !== 'fallback'"
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

      <Card class="flex-1 bg-[#f8fafc]">
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

    <h1 v-if="pending || result">
      <template v-if="pending">
        Loading results<div class="loader"></div>
      </template>
      <template v-else>
        Results
      </template>
    </h1>

    <div
      v-if="result"
      :key="resultHash"
      class="wrapper"
      :class="{
        'opacity-50': pending,
      }"
    >
      <div class="flex gap-8">
        <div class="flex-1">
          <h2>Info</h2>
          <p>{{ result.solutions.length > 0 ? '✅' : '❌' }} <strong>{{ result.solutions.length > 0 ? `${result.solutions.length} solution${result.solutions.length > 1 ? 's' : ''} found` : 'no solution found' }}</strong></p>
          <p>ℹ️ <strong>{{ result.meta.returningMaxOneSolution ? 'Maximum of one solution returned for better performance' : 'Looked for all possible solutions' }}</strong></p>
          <p>⏱️ <strong>{{ formatDuration(result.meta.calculationDuration) }}</strong> to calculate the situation</p>
          <p>🧠 <strong>{{ formatMemory(result.meta.maxMemoryUsed) }}</strong> max memory used</p>
          <br>
          <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfPossibleCombinations) }}</strong> possible puzzle piece combinations in total</p>
          <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfIteratorPlacementAttempts) }}</strong> puzzle piece placement attempts</p>
          <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfTriedCombinations) }}</strong> puzzle piece combinations validated</p>
          <p><strong>{{ numberFormatter.format(result.meta.skippedDuplicateSituations) }}</strong> combinations skipped due to duplicate situations</p>
          <p><strong>{{ numberFormatter.format(result.meta.skippedImpossibleSituations) }}</strong> combinations skipped due to impossible situations</p>
        </div>
        <div class="flex-1">
          <h2>Game board</h2>
          <div class="f mt-4">
            <div>
              <div>Current</div>
              <Grid :grid="result.gameBoard" />
            </div>
            <div>
              <div>&nbsp;</div>
              ➡️
            </div>
            <div>
              <div>Goal</div>
              <Grid :grid="result.gameBoard" :replaceAllWith="result.targetFigure.value" />
            </div>
          </div>
        </div>
      </div>

      <Details class="mt-8">
        <template #summary>
          <h2>
            Puzzle pieces ({{ Object.keys(result.puzzlePieces).length }})
          </h2>
        </template>
        <div class="g overflow-x-auto">
          <div
            v-for="puzzlePiece of result.puzzlePieces"
            :key="puzzlePiece.id"
          >
            <h3>{{ puzzlePiece.id }}</h3>
            <p>{{ puzzlePiece.possiblePositions.length }} possible positions</p>
            <Grid :grid="puzzlePiece.grid" isPuzzlePieceGrid />
          </div>
        </div>
      </Details>

      <Details @toggle="showPossibleSolutionStarts = $event">
        <template #summary>
          <h2>
            Phase 1: possible solution starts based on correct corner outputs ({{ numberFormatter.format(result.possibleSolutionStarts.length) }})
          </h2>
        </template>

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
      </Details>

      <Details open>
        <template #summary>
          <h2>Phase 2: solutions ({{ numberFormatter.format(result.solutions.length) }}{{ result.meta.returningMaxOneSolution ? ' — maximized at one' : '' }})</h2>
        </template>
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
      </Details>

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
const pending = ref<false | 'input' | 'fallback'>(false);
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
  pending.value = payload ? 'input' : 'fallback';

  // NOTE: Unfortunately, canceling a request does not stop the calculation in the backend.
  // You can't solve it at all, even with WebSockets/SSE. What a great day.
  controller = new AbortController();
  controller.signal.addEventListener('abort', () => {
    pending.value = false;
  });

  let response: Puzzle | undefined;
  try {
    response = await $fetch<Puzzle>('/api/calculate-solutions', {
      method: 'POST',
      timeout: 0,
      retry: 0,
      retryDelay: 0,
      signal: controller.signal,
      ...(payload ? { body: payload } : {}),
    });
  }
  catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error.value = JSON.stringify((err as any).data.data, null, 2);
    result.value = undefined;
    throw err;
  }

  resultHash.value = await hashObject(response);
  result.value = response;
  pending.value = false;
}

function cancel() {
  controller?.abort('User canceled');
}

function print() {
  window.print();
}

// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
// <link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet">

useHead({
  title: 'Neopets Shapeshifter Solver',
  meta: [
    { name: 'description', content: 'Solve puzzles' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { href: 'https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,100..900;1,100..900&display=swap', rel: 'stylesheet' },
  ],
});
</script>

<style lang="scss">
@import '@/assets/css/tailwind.css';

html {
  font-family: "Urbanist", sans-serif;
  font-optical-sizing: auto;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.8;

  background-image:
    radial-gradient(circle at center, #0000, Canvas),
    radial-gradient(
      circle at 1px 1px,
      hsl(var(--primary)) 1px,
      #0000 0
    );
  background-size: 200px 200px, 20px 20px;
  background-repeat: repeat;
}

body {
  background: none;
}

// details summary :is(h2, h3) {
//   display: inline-block;
// }

// ul {
//   list-style-position: inside;
//   padding-left: 0;
// }

h1 {
  @apply wrapper text-3xl font-bold leading-10;
}

h2 {
  @apply text-xl font-bold leading-8;

  &:not(:first-child) {
    @apply mt-6;
  }
}

h3 {
  @apply text-lg font-bold leading-8;
}

details summary h3 {
  @apply text-base font-normal;
}

h4 {
  @apply text-base font-bold leading-8;
}

h5 {
  @apply text-base font-bold leading-8;
}

.wrapper {
  @apply mx-auto w-[calc(100%-4rem)] max-w-screen-xl;
}

.g {
  @apply grid grid-flow-col auto-cols-max gap-x-8 gap-y-4;
}

.f {
  @apply flex items-center gap-x-4;
}

.loader {
  margin-left: 0.3ch;
  display: inline-block;
  width: 1.2ch;
  aspect-ratio: 2;
  --_g: no-repeat radial-gradient(circle closest-side,#000 90%,#0000);
  background:
    var(--_g) 0%   50%,
    var(--_g) 50%  50%,
    var(--_g) 100% 50%;
  background-size: calc(100%/3) 50%;
  animation: l3 1s infinite linear;
}

@keyframes l3 {
  20%{background-position:0%   0%, 50%  50%,100%  50%}
  40%{background-position:0% 100%, 50%   0%,100%  50%}
  60%{background-position:0%  50%, 50% 100%,100%   0%}
  80%{background-position:0%  50%, 50%  50%,100% 100%}
}
</style>
