<template>
  <div class="flex flex-col gap-6 py-8">
    <div class="wrapper flex flex-wrap gap-4">
      <Card class="grow shrink-0 w-[min(400px,100%-4rem)] bg-[#f8fafc]">
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
            <ClipboardPaste class="shrink-0"/>
            Paste Neopets HTML
          </Button>
          <Button
            v-else
            variant="destructive"
            class="w-full gap-1"
            @click="cancel()"
          >
            <X class="shrink-0"/>
            Cancel
          </Button>
        </CardContent>

        <CardContent class="-mt-4 pb-1">
          <Separator
            class="my-4"
            label="Or"
            labelClass="bg-[#f8fafc]"
          />
        </CardContent>

        <CardContent>
          <Button
            v-if="pending !== 'input'"
            :disabled="pending"
            class="w-full gap-1"
            @click="getClipboardContents('input')"
          >
            <ClipboardPaste class="shrink-0"/>
            Paste API input
          </Button>
          <Button
            v-else
            variant="destructive"
            class="w-full gap-1"
            @click="cancel()"
          >
            <X class="shrink-0"/>
            Cancel
          </Button>
        </CardContent>

        <CardContent class="-mt-4 pb-1">
          <Separator
            class="my-4"
            label="Or"
            labelClass="bg-[#f8fafc]"
          />
        </CardContent>

        <CardFooter>
          <PuzzleBrowser @submit="puzzleOptions = $event; calculate('example', $event)">
            <template #trigger>
              <Button
                v-if="pending !== 'example'"
                variant="secondary"
                :disabled="pending"
                class="w-full gap-1"
              >
                <Dices class="shrink-0"/>
                Browse examples
              </Button>
              <Button
                v-else
                variant="destructive"
                class="w-full gap-1"
                @click.prevent.capture="cancel()"
              >
                <X class="shrink-0"/>
                Cancel
              </Button>
            </template>
          </PuzzleBrowser>
        </CardFooter>
      </Card>

      <Card class="grow shrink-0 w-[min(400px,100%-4rem)] bg-[#f8fafc] flex flex-col">
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
            <Copy class="shrink-0"/>
            Copy API input
          </Button>
        </CardContent>
      </Card>

      <Card class="grow shrink-0 w-[min(600px,100%-4rem)] bg-[#f8fafc]">
        <CardHeader class="flex flex-row items-start justify-between gap-4">
          <div class="flex gap-4">
            <div class="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-4">
              <Switch
                id="show-figures"
                v-model:checked="showFigures"
              />
              <Label for="show-figures" class="leading-5">
                Show original figures on game boards (if available)
                <br>
                <span class="text-gray-400">
                  If turned off, a numeric representation will be shown.
                </span>
              </Label>

              <Switch
                id="calculate-in-browser"
                v-model:checked="calculateInBrowser"
                :disabled="runtimeConfig.public.calculateInBrowserOnly"
              />
              <Label for="calculate-in-browser" class="leading-5">
                Calculate in-browser
                <br>
                <span class="text-gray-400">
                  This will run the calculation in your browser instead of in the Bun-powered server.
                </span>
              </Label>

              <Switch
                id="prepare-possible-solution-starts"
                v-model:checked="preparePossibleSolutionStarts"
              />
              <Label for="prepare-possible-solution-starts" class="leading-5">
                Prepare possible solution starts
                <br>
                <span class="text-gray-400">
                  When enabled, we won't just brute force the puzzle, but prepare some
                  possible solution starts based on correct corner outputs.
                </span>
              </Label>
            </div>
          </div>

          <Settings
            class="text-[#dcdee0] grow-0 shrink-0"
            :width="30"
            :height="30"
          />
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
            <div class="grow shrink-0 w-[min(400px,100%-4rem)]">
              <h2>Info</h2>
              <!-- eslint-disable-next-line vue/max-len -->
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
              <p>
                <strong>{{
                  result.meta.percentageOfPossibleCombinationsTried < 0.01
                    ? '< 0.01'
                    : numberFormatter.format(result.meta.percentageOfPossibleCombinationsTried)
                }}%</strong> of all possible combinations tried until solution was found{{
                  result.meta.percentageOfPossibleCombinationsTried < 1
                    ? ' 🍀'
                    : (result.meta.percentageOfPossibleCombinationsTried > 85 && result.meta.calculationDuration > 60_000 * 2)
                      ? ' 🤕'
                      : ''
                }}
              </p>
              <p>Throughput: <strong>{{ numberFormatter.format(result.meta.throughput) }} Hz</strong> (combinations per second)</p>
            </div>
            <div class="grow shrink-0 w-[min(400px,100%-4rem)] overflow-x-auto">
              <h2>Game board</h2>
              <div class="f flex-wrap gap-y-4 mt-4">
                <div>
                  <div>Current</div>
                  <Grid :grid="result.gameBoard"/>
                </div>
                <div>
                  <div>&nbsp;</div>
                  <ArrowRight/>
                </div>
                <div>
                  <div>Goal</div>
                  <Grid :grid="result.gameBoard" :replaceAllWith="result.targetFigure"/>
                </div>
              </div>

              <template v-if="figuresNamesAreUrls">
                <h2>Symbols</h2>
                <div class="f flex-wrap gap-y-4 mt-4">
                  <template
                    v-for="(figure, index) in result.figures"
                    :key="figure.name"
                  >
                    <img
                      :src="(figure.name as string)"
                      alt=""
                      class="w-8 h-8"
                    >
                    <template v-if="index !== result.figures.length - 1"> <ArrowRight/> </template>
                  </template>
                </div>
              </template>
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
                <Grid :grid="puzzlePiece.grid" isPuzzlePieceGrid/>
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
            class="my-8 w-full gap-1"
            @click="print()"
          >
            <Printer class="shrink-0"/>
            Print results
          </Button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
  import { useLocalStorage } from '@vueuse/core';
  import {
    ArrowRight,
    BadgeCheck,
    CircleDashed,
    ClipboardPaste,
    Copy,
    Dices,
    Printer,
    Puzzle as PuzzleIcon,
    Settings,
    X,
  } from 'lucide-vue-next';
  import ShapeshifterWorker from '@/utils/shapeshifterWorker?worker';

  const runtimeConfig = useRuntimeConfig();

  type InputType = 'html' | 'input' | 'example';

  const result = ref<InstanceType<typeof Puzzle>>();
  const resultHash = ref<string>();
  const pending = ref<false | InputType>(false);
  const error = ref<string>();
  const status = ref<string>();

  const isPrinting = shallowRef(false);

  const showFigures = useLocalStorage('showFigures', true);
  const calculateInBrowser = useLocalStorage('calculateInBrowser', true);
  const preparePossibleSolutionStarts = useLocalStorage('preparePossibleSolutionStarts', false);

  const puzzleOptions = shallowRef<PuzzleOptions>();
  const puzzleOptionsStringified = usePuzzleOptionsStringified(puzzleOptions);

  const figuresNamesAreUrls = computed(() => result.value?.figures
    .every((figure) => typeof figure.name === 'string' && figure.name.startsWith('http')) ?? false);

  const doShowFigures = computed(() => showFigures.value && figuresNamesAreUrls.value);

  provide(showFiguresKey, showFigures);
  provide(doShowFiguresKey, doShowFigures);
  provide(resultKey, result);
  provide(isPrintingKey, isPrinting);

  async function getClipboardContents (inputType: Exclude<InputType, 'example'>) {
    try {
      const text = await navigator.clipboard.readText();

      puzzleOptions.value = inputType === 'html'
        ? parseNeopetsHtml(text)
        : Function(`"use strict"; return (${text.endsWith(',') ? text.slice(0, -1) : text})`)() as PuzzleOptions;

      calculate(inputType, puzzleOptions.value);
    }
    catch (err) {
      console.error('Failed to calculate from clipboard contents', err);
    }
  }

  async function copyToClipboard () {
    try {
      await navigator.clipboard.writeText(puzzleOptionsStringified.value);
    }
    catch (err) {
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

  function restartShapeshifterWorker () {
    shapeshifterWorker?.terminate();
    shapeshifterWorker = new ShapeshifterWorker();
  }

  let controller: AbortController;

  let wakeLock: WakeLockSentinel | null = null;

  function logWakeLockState () {
    console.log(`Screen Wake Lock ${wakeLock!.released ? 'released' : 'active'}`);
  }

  async function calculate (inputType: InputType, payload: PuzzleOptions) {
    error.value = undefined;
    pending.value = inputType;

    wakeLock = await navigator.wakeLock.request();
    wakeLock.addEventListener('release', logWakeLockState, { once: true });
    logWakeLockState();

    const cleanUp = () => {
      wakeLock?.release();
      wakeLock = null;
    };

    // NOTE: Unfortunately, canceling a request does not stop the calculation in the backend.
    // You can't solve it at all, even with WebSockets/SSE. What a great day.
    controller = new AbortController();
    controller.signal.addEventListener('abort', () => {
      pending.value = false;
      cleanUp();

      if (calculateInBrowser.value) {
        restartShapeshifterWorker();
      }
    });

    let response: InstanceType<typeof Puzzle> | undefined;

    if (calculateInBrowser.value) {
      try {
        response = await new Promise<InstanceType<typeof Puzzle>>((resolve, reject) => {
          shapeshifterWorker.onmessage = (event) => {
            const { type, payload } = event.data as {
              type: 'status-update';
              payload: string;
            } | {
              type: 'finished';
              payload: InstanceType<typeof Puzzle>;
            };

            if (type === 'finished') {
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

          shapeshifterWorker.postMessage({
            type: 'calculate',
            payload: payload,
            settings: {
              preparePossibleSolutionStarts: preparePossibleSolutionStarts.value,
            },
          });
        });
      }
      catch (err) {
        error.value = (err as Error).toString();
        result.value = undefined;
        cleanUp();
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
        cleanUp();
        throw err;
      }
    }

    resultHash.value = await hashObject(response!);
    result.value = response;
    pending.value = false;
    cleanUp();
  }

  function cancel () {
    console.log('Canceling calculation');
    controller?.abort('User canceled');
  }

  async function print () {
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
    htmlAttrs: {
      lang: 'en',
    },
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
html {
  --easing-cubic: cubic-bezier(0.4, 0, 0.2, 1);
  font-family: "Urbanist", sans-serif;
  font-optical-sizing: auto;
  // font-size: 20px;
  @apply max-sm:text-[16px] sm:max-md:text-[18px] md:text-[20px];
  font-weight: 500;
  line-height: 1.8;
  // background-color: hsl(37.82deg 95.8% 53.1% / 9%);
  background-image:
    radial-gradient(circle at center, transparent, white),
    radial-gradient(
      circle at 1px 1px,
      hsl(var(--primary)) 1px,
      #0000 0
    );
  background-size: 400px 400px, 18px 18px;
  background-repeat: round, space;

  overflow-wrap: anywhere;

  /// If browsers support configuring `hyphenate-limit-chars`, we enable hyphenation.
  /// This is because by default, hyphens are added way too often, even in the middle
  /// 6-letter words. In browsers where `hyphenate-limit-chars` is not supported, we
  /// just disable hyphenation so words are not broken up in the middle, unless they
  /// are broken up by `overflow-wrap: anywhere`, which is a little more conservative
  /// than `hyphens: auto`.
  @supports (hyphenate-limit-chars: 10 6 4) {
    hyphens: auto;
    hyphenate-limit-chars: 10 6 4;
  }
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
  @apply mx-auto max-sm:w-[calc(100%-3rem)] sm:w-[calc(100%-4rem)] max-w-screen-xl;
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
