<template>
  <div class="flex flex-col gap-6 py-8">
    <div class="wrapper flex flex-wrap gap-4">
      <Card class="grow shrink-0 basis-[400px] bg-[#f8fafc]">
        <CardHeader>
          <CardTitle>Input</CardTitle>
        </CardHeader>

        <CardContent>
          <Button
            v-if="pending !== 'html'"
            :disabled="pending"
            class="w-full gap-1"
            @click="getClipboardContents('html')"
          >
            <ClipboardPaste/>
            Paste Neopets HTML
          </Button>
          <Button
            v-else
            variant="destructive"
            @click="cancel"
            class="w-full gap-1"
          >
            <X/>
            Cancel
          </Button>
        </CardContent>

        <CardContent class="mt-[-1rem] pb-1">
          <Separator class="my-4" label="Or" labelClass="bg-[#f8fafc]" />
        </CardContent>

        <CardContent>
          <Button
            v-if="pending !== 'input'"
            :disabled="pending"
            class="w-full gap-1"
            @click="getClipboardContents('input')"
          >
            <ClipboardPaste/>
            Paste API input
          </Button>
          <Button
            v-else
            variant="destructive"
            @click="cancel"
            class="w-full gap-1"
          >
            <X/>
            Cancel
          </Button>
        </CardContent>

        <CardContent class="mt-[-1rem] pb-1">
          <Separator class="my-4" label="Or" labelClass="bg-[#f8fafc]" />
        </CardContent>

        <CardFooter>
          <Button
            v-if="pending !== 'example'"
            variant="secondary"
            :disabled="pending"
            class="w-full gap-1"
            @click="calculate('example')"
          >
            <Calculator/>
            Calculate example
          </Button>
          <Button
            v-else
            variant="destructive"
            @click="cancel"
            class="w-full gap-1"
          >
            <X/>
            Cancel
          </Button>
        </CardFooter>
      </Card>

      <Card class="grow shrink-0 basis-[400px] bg-[#f8fafc] flex flex-col">
        <CardHeader>
          <CardTitle>Formatted</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4 grow">
          <Textarea
            v-model="puzzleOptionsStringified"
            rows="2"
            cols="40"
            readonly
            placeholder="When pasting Neopets HTML using the button on the left, the formatted API input will appear here..."
            class="grow min-h-0"
          />
          <Button
            variant="secondary"
            :disabled="!puzzleOptionsStringified"
            class="w-full gap-1"
            @click="copyToClipboard()"
          >
            <Copy/>
            Copy API input
          </Button>
        </CardContent>
      </Card>

      <Card class="grow shrink-0 basis-[min(600px,100%-4rem)] bg-[#f8fafc]">
        <CardHeader class="flex flex-row items-center justify-between gap-4">
          <div class="flex gap-4">
            <div class="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-4">
              <Switch id="show-figures" v-model:checked="showFigures"/>
              <Label for="show-figures" class="leading-5">Show original figures on game boards (if available)<br><span class="text-gray-400">If turned off, a numeric representation will be shown.</span></Label>

              <Switch
                id="calculate-in-browser"
                v-model:checked="calculateInBrowser"
                :disabled="runtimeConfig.public.calculateInBrowserOnly"
              />
              <Label for="calculate-in-browser" class="leading-5">Calculate in-browser (experimental)<br><span class="text-gray-400">This will run the calculation in your browser instead of in the Bun-powered server.</span></Label>
            </div>
          </div>

          <Settings class="text-[#c1c4c7] grow-0 shrink-0"/>
        </CardHeader>
      </Card>
    </div>

    <Transition name="fade" mode="out-in">
      <div v-if="pending && calculateInBrowser">
        <h1>Cracking the puzzle (this can take a while)<div class="loader"></div></h1>

        <Transition name="fade">
          <pre v-if="status" class="wrapper font-[inherit]">{{ status }}</pre>
        </Transition>
      </div>
      <h1 v-else-if="pending">
        Loading results<div class="loader"></div>
      </h1>
      <div v-else-if="error">
        <h1>Error</h1>
        <pre class="wrapper font-[inherit]">{{ error }}</pre>
      </div>
      <div v-else-if="result">
        <h1>Results</h1>
        <div
          :key="resultHash"
          class="wrapper"
          :class="{
            'opacity-50': pending,
          }"
        >
          <div class="flex gap-8 flex-wrap">
            <div class="grow shrink-0 basis-[400px]">
              <h2>Info</h2>
              <p>{{ result.solutions.length > 0 ? '✅' : '❌' }} <strong>{{ result.solutions.length > 0 ? `${result.solutions.length} solution${result.solutions.length > 1 ? 's' : ''} found` : 'no solution found' }}</strong></p>
              <p>ℹ️ <strong>{{ result.meta.returningMaxOneSolution ? 'Maximum of one solution returned for better performance' : 'Looked for all possible solutions' }}</strong></p>
              <p>⏱️ <strong>{{ formatDuration(result.meta.calculationDuration) }}</strong> to calculate the situation</p>
              <p v-if="calculateInBrowser">🧠 <em>Max memory cannot be measured when calculating in-browser</em></p>
              <p v-else>🧠 <strong>{{ formatMemory(result.meta.maxMemoryUsed) }}</strong> max memory used</p>
              <br>
              <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfPossibleCombinations) }}</strong> possible puzzle piece combinations in total</p>
              <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfIteratorPlacementAttempts) }}</strong> puzzle piece placement attempts</p>
              <p><strong>{{ numberFormatter.format(result.meta.totalNumberOfTriedCombinations) }}</strong> probable solutions validated</p>
              <p><strong>{{ numberFormatter.format(result.meta.skippedDuplicateSituations) }}</strong> combinations skipped due to duplicate situations</p>
              <p><strong>{{ numberFormatter.format(result.meta.skippedImpossibleSituations) }}</strong> combinations skipped due to impossible situations</p>
            </div>
            <div class="grow shrink-0 basis-[400px] overflow-x-auto">
              <h2>Game board</h2>
              <div class="f flex-wrap gap-y-4 mt-4">
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

          <Details class="mt-8" forceOpenOnPrint>
            <template #summary>
              <h2 class="flex items-center gap-2">
                <PuzzleIcon class="grow-0 shrink-0"/>
                Puzzle pieces ({{ Object.keys(result.puzzlePieces).length }})
              </h2>
            </template>
            <div class="flex items-start gap-4 flex-wrap overflow-x-auto">
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

          <Details>
            <template #summary>
              <h2 class="flex items-center gap-2">
                <CircleDashed class="grow-0 shrink-0"/>
                Phase 1: prepare possible solution starts based on correct corner outputs ({{ numberFormatter.format(result.possibleSolutionStarts.length) }})
              </h2>
            </template>

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
          </Details>

          <Details open forceOpenOnPrint>
            <template #summary>
              <h2 class="flex items-center gap-2">
                <BadgeCheck class="grow-0 shrink-0"/>
                Phase 2: solutions ({{ numberFormatter.format(result.solutions.length) }}{{ result.meta.returningMaxOneSolution ? ' — maximized at one' : '' }})
              </h2>
            </template>
            <p v-if="!result.solutions.length">No solutions possible.</p>
            <template v-else>
              <Solution
                v-for="(solution, index) of result.solutions"
                :key="index"
                :nth="index + 1"
                :only="result.solutions.length === 1"
                :forceOpenOnPrint="result.solutions.length === 1"
                :solution="solution"
              />
            </template>
          </Details>

          <Button
            size="lg"
            @click="print"
            class="my-8 w-full gap-1"
          ><Printer/> Print results</Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import {
  BadgeCheck,
  Calculator,
  CircleDashed,
  ClipboardPaste,
  Copy,
  Printer,
  Puzzle as PuzzleIcon,
  Settings,
  X,
} from 'lucide-vue-next';
import ShapeshifterWorker from '@/utils/shapeshifter-worker?worker';

const runtimeConfig = useRuntimeConfig();

type InputType = 'html' | 'input' | 'example';

const result = ref<InstanceType<typeof Puzzle>>();
const resultHash = ref<string>();
const pending = ref<false | InputType>(false);
const error = ref<string>();
const status = ref<string>();

const isPrinting = shallowRef(false);

const showFigures = useLocalStorage('showFigures', true);
const calculateInBrowser = useLocalStorage('calculateInBrowser', runtimeConfig.public.calculateInBrowserOnly);

const puzzleOptions = shallowRef<PuzzleOptions>();
const puzzleOptionsStringified = usePuzzleOptionsStringified(puzzleOptions);

provide(showFiguresKey, showFigures);
provide(resultKey, result);
provide(isPrintingKey, isPrinting);

async function getClipboardContents (inputType: Exclude<InputType, 'example'>) {
  try {
    const text = await navigator.clipboard.readText();

    puzzleOptions.value = inputType === 'html'
      ? parseNeopetsHtml(text)
      : Function('"use strict"; return (' + (text.endsWith(',') ? text.slice(0, -1) : text) + ')')() as PuzzleOptions;

    calculate(inputType, puzzleOptions.value);
  }
  catch (err) {
    console.error('Failed to calculate from clipboard contents', err);
  }
}

async function copyToClipboard () {
  try {
    await navigator.clipboard.writeText(puzzleOptionsStringified.value)
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
  }
}

let shapeshifterWorker: InstanceType<typeof ShapeshifterWorker>;

watch(calculateInBrowser, (value) => {
  if (value) {
    shapeshifterWorker = new ShapeshifterWorker();
  }
  else {
    shapeshifterWorker?.terminate();
  }
}, { immediate: true });

function restartShapeshifterWorker() {
  shapeshifterWorker?.terminate();
  shapeshifterWorker = new ShapeshifterWorker();
}

let controller: AbortController;

// const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function calculate (inputType: 'example'): Promise<void>;
async function calculate (inputType: 'input' | 'html', payload: PuzzleOptions): Promise<void>;
async function calculate (inputType: InputType, payload?: PuzzleOptions) {
  error.value = undefined;
  pending.value = inputType;

  // NOTE: Unfortunately, canceling a request does not stop the calculation in the backend.
  // You can't solve it at all, even with WebSockets/SSE. What a great day.
  controller = new AbortController();
  controller.signal.addEventListener('abort', () => {
    pending.value = false;

    if (calculateInBrowser.value) {
      restartShapeshifterWorker();
    }
  });

  let response: InstanceType<typeof Puzzle> | undefined;

  if (calculateInBrowser.value) {
    try {
      response = await new Promise<InstanceType<typeof Puzzle>>((resolve, reject) => {
        shapeshifterWorker.onmessage = ({ data }) => {
          const { event, payload } = data as {
            event: 'status-update',
            payload: string;
          } | {
            event: 'finished',
            payload: InstanceType<typeof Puzzle>;
          };

          if (event === 'finished') {
            resolve(payload);
            status.value = undefined;
          }
          else {
            status.value = payload;
          }
        };

        shapeshifterWorker.onerror = (event) => {
          status.value = undefined;
          reject(event);
        };

        shapeshifterWorker.postMessage(payload ?? PuzzleLibrary.level30);
      });
    }
    catch (err) {
      error.value = (err as Error).toString();
      result.value = undefined;
      throw err;
    }
  }
  else {
    try {
      response = await $fetch<InstanceType<typeof Puzzle>>('/api/calculate-solutions', {
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
  }

  resultHash.value = await hashObject(response!);
  result.value = response;
  pending.value = false;
}

function cancel() {
  controller?.abort('User canceled');
}

async function print() {
  isPrinting.value = true;
  await nextTick();
  window.print();
  isPrinting.value = false;
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
  --easing-cubic: cubic-bezier(0.4, 0, 0.2, 1);
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
  @apply text-base font-semibold;
}

h4 {
  @apply text-base font-bold leading-8;
}

h5 {
  @apply text-base font-bold leading-8;
}

ul {
  list-style: disc;
  list-style-position: inside;
  @apply leading-6;
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

.fade-enter-active,
.fade-leave-active {
  transition-property: opacity;
  transition-duration: 0.15s;
  transition-timing-function: var(--easing-cubic);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
