<template>
  <div>
    <button @click="run">Run</button>
    <button @click="print">Print</button>

    <h1>{{ pending ? 'Loading new results...' : 'Results' }}</h1>

    <div v-if="result" :key="result">
      <h2>Info</h2>
      <p><strong>Found solution:</strong> {{ result.puzzle.solutions.length > 0 ? '✅' : '❌' }}</p>
      <p><strong>Calculation duration:</strong> {{ numberFormatter.format(result.calculationDuration / 1000) }} s</p>
      <p><strong>Max memory used:</strong> {{ numberFormatter.format(result.puzzle.meta.maxMemoryUsed / 1_000_000) }} MB</p>
      <br>
      <p><strong>Total skipped duplicate situations:</strong> {{ numberFormatter.format(result.puzzle.meta.skippedDuplicateSituations) }}</p>
      <p><strong>Total number of possible puzzle piece combinations:</strong> {{ numberFormatter.format(result.puzzle.meta.totalNumberOfPossibleCombinations) }}</p>
      <p><strong>Total number of tried puzzle piece combinations:</strong> {{ numberFormatter.format(result.puzzle.meta.totalNumberOfTriedCombinations) }}</p>
      <p><strong>Max one solution returned:</strong> {{ result.puzzle.meta.returningMaxOneSolution ? 'yes' : 'no' }}</p>

      <h2>Game board</h2>
      <div class="f">
        <Grid :grid="result.puzzle.gameBoard" />
        ➡️
        <Grid :grid="result.puzzle.gameBoard" :replaceAllWith="result.puzzle.targetFigure.value" />
      </div>

      <details>
        <summary>
          <h2>
            Puzzle pieces ({{ Object.keys(result.puzzle.puzzlePieces).length }})
          </h2>
        </summary>
        <div class="g">
          <div
            v-for="puzzlePiece of result.puzzle.puzzlePieces"
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
            Phase 1: possible solution starts based on correct corner outputs ({{ result.puzzle.possibleSolutionStarts.length }})
          </h2>
        </summary>
        <p v-if="!result.puzzle.possibleSolutionStarts.length">
          No solutions for corners possible.
        </p>
        <template
          v-else
          v-for="(possibleSolutionStart, index) of result.puzzle.possibleSolutionStarts"
          :key="index"
        >
          <h3>#{{ index + 1 }}</h3>
          <h4>
            Puzzle pieces ({{ possibleSolutionStart.length }}/{{ Object.keys(result.puzzle.puzzlePieces).length }}
            used ­—
            {{
              possibleSolutionStart.length ===
              Object.keys(result.puzzle.puzzlePieces).length
                ? possibleSolutionStart.length
                  ? possibleSolutionStart.at(-1)!.after!.isSolution
                    ? '✅ solution'
                    : '❌ no solution'
                  : 'state unknown'
                : '⏳ incomplete, needs brute force'
            }})
          </h4>
          <p v-if="!possibleSolutionStart.length">None.</p>
          <template
            v-else
            v-for="part of possibleSolutionStart"
            :key="part.id"
          >
            <h5>{{ part.id }}</h5>

            <div class="f">
              <Grid :grid="part.before!" />
              ➕
              <Grid :grid="part.grid" isPuzzlePieceGrid />
              🟰
              <Grid :grid="part.after!" />
              <span
                v-if="part.after!.isSolution !== undefined"
                style="font-size: 1.5rem; margin-left: 0.5rem"
                >{{ part.after!.isSolution ? '✅' : '❌' }}</span
              >
            </div>
          </template>
        </template>
      </details>

      <details open>
        <summary>
          <h2>Phase 2: solutions ({{ result.puzzle.solutions.length }}{{ result.puzzle.meta.returningMaxOneSolution ? ' — maximized at one' : '' }})</h2>
        </summary>
        <p v-if="!result.puzzle.solutions.length">No solutions possible.</p>
        <template
          v-else
          v-for="(solution, index) of result.puzzle.solutions"
          :key="index"
        >
          <h3>#{{ index + 1 }}</h3>
          <h4>Puzzle pieces</h4>
          <p v-if="!solution.length">None.</p>
          <template
            v-else
            v-for="part of solution"
            :key="part.id"
          >
            <h5>
              {{ part.id }}{{
                part.partOfPossibleSolution !== undefined
                  ? ` (part of possible solution start #${part.partOfPossibleSolution + 1})`
                  : ''
              }}
            </h5>

            <div class="f">
              <Grid :grid="part.before!" />
              ➕
              <Grid :grid="part.grid" isPuzzlePieceGrid />
              🟰
              <Grid :grid="part.after!" />
              <span
                v-if="part.after!.isSolution"
                style="font-size: 1.5rem; margin-left: 0.5rem"
                >✅</span
              >
            </div>
          </template>
        </template>
      </details>

      <!-- <details>
        <summary>
          <h2>
            Debug: non-solutions ({{ result.puzzle.nonSolutions.length }})
          </h2>
        </summary>

        <p v-if="!result.puzzle.nonSolutions.length">-</p>
        <template
          v-else
          v-for="(nonSolution, index) of result.puzzle.nonSolutions"
        >
          <h3>#{{ index + 1 }}</h3>
          <h4>Puzzle pieces</h4>
          <template v-for="part of nonSolution">
            <h5>
              {{ part.id }}{{
                part.partOfPossibleSolution !== undefined
                  ? ` (part of possible solution start #${part.partOfPossibleSolution + 1})`
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
// import { useLocalStorage } from '@vueuse/core';

// const matrixSource = useLocalStorage('matrix');

// type MatrixSource = number[][];

// const rowCount = useLocalStorage('rowCount', 6);
// const colCount = useLocalStorage('colCount', 6);

const result = ref<Awaited<ReturnType<typeof calculate>>>();
const pending = ref(false);
// const resultStatus = ref<string>('idle');

const lang = 'nl-NL';
const numberFormatter = new Intl.NumberFormat(lang, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  // minimumSignificantDigits: 2,
  // maximumSignificantDigits: 2,
});

function calculate () {
  return $fetch('/api/calculate-solutions', {
    timeout: 0,
    retry: 0,
  });
}

async function run() {
  pending.value = true;
  result.value = await calculate();
  pending.value = false;
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

details summary h2 {
  display: inline-block;
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
