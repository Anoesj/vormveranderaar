<template>
  <div>
    <button @click="run">Run</button>
    <button @click="print">Print</button>

    <h1>Result:</h1>

    <NuxtErrorBoundary>
      <template v-if="result">
        <h2>Calculation duration</h2>
        <p>{{ result.calculationDuration.toFixed(2) }} ms</p>

        <h2>Game board</h2>
        <Grid :grid="result.puzzle.gameBoard.grid.grid" />

        <h2>
          Puzzle pieces ({{ Object.keys(result.puzzle.puzzlePieces).length }})
        </h2>
        <template v-for="puzzlePiece of result.puzzle.puzzlePieces">
          <h3>{{ puzzlePiece.id }}</h3>
          <Grid :grid="puzzlePiece.grid.grid" puzzlePiece />
        </template>

        <details open>
          <summary>
            <h2>
              Phase 1: possible solutions for corners only ({{
                result.puzzle.possibleSolutionStarts.length
              }})
            </h2>
          </summary>
          <p v-if="!result.puzzle.possibleSolutionStarts.length">
            No solutions for corners possible.
          </p>
          <template
            v-else
            v-for="(possibleSolutionStart, index) of result.puzzle
              .possibleSolutionStarts"
          >
            <h3>#{{ index + 1 }}</h3>
            <h4>
              Puzzle pieces ({{ possibleSolutionStart.length }}/{{
                Object.keys(result.puzzle.puzzlePieces).length
              }}
              used ­—
              {{
                possibleSolutionStart.length ===
                Object.keys(result.puzzle.puzzlePieces).length
                  ? possibleSolutionStart.length
                    ? possibleSolutionStart.at(-1)!.after.isSolution
                      ? '✅ solution'
                      : '❌ no solution'
                    : 'state unknown'
                  : '⏳ incomplete, needs brute force'
              }})
            </h4>
            <p v-if="!possibleSolutionStart.length">None.</p>
            <template v-else v-for="part of possibleSolutionStart">
              <h5>{{ part.id }}</h5>

              <div class="f">
                <Grid :grid="part.before.grid" />
                ➕
                <Grid :grid="part.grid.grid" puzzlePiece />
                ➡️
                <Grid :grid="part.after.grid" />
                <span
                  v-if="part.after.isSolution !== undefined"
                  style="font-size: 1.5rem; margin-left: 0.5rem"
                  >{{ part.after.isSolution ? '✅' : '❌' }}</span
                >
              </div>
            </template>
          </template>
        </details>

        <details open>
          <summary>
            <h2>Phase 2: solutions ({{ result.puzzle.solutions.length }})</h2>
          </summary>
          <p v-if="!result.puzzle.solutions.length">No solutions possible.</p>
          <template v-else v-for="(solution, index) of result.puzzle.solutions">
            <h3>#{{ index + 1 }}</h3>
            <h4>Puzzle pieces</h4>
            <p v-if="!solution.length">None.</p>
            <template v-else v-for="part of solution">
              <h5>
                {{ part.id
                }}{{
                  part.partOfPossibleSolution !== undefined
                    ? ` (part of possible solution #${
                        part.partOfPossibleSolution + 1
                      })`
                    : ''
                }}
              </h5>

              <div class="f">
                <Grid :grid="part.before.grid" />
                ➕
                <Grid :grid="part.grid.grid" puzzlePiece />
                ➡️
                <Grid :grid="part.after.grid" />
                <span
                  v-if="part.after.isSolution"
                  style="font-size: 1.5rem; margin-left: 0.5rem"
                  >✅</span
                >
              </div>
            </template>
          </template>
        </details>

        <details>
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
                {{ part.id
                }}{{
                  part.partOfCornerCombination
                    ? ' (part of corner combination)'
                    : ''
                }}
              </h5>

              <div class="f">
                <Grid :grid="part.before.grid" />
                ➕
                <Grid :grid="part.grid.grid" puzzlePiece />
                ➡️
                <Grid :grid="part.before.grid" />
                <span style="font-size: 1.5rem; margin-left: 0.5rem">❌</span>
              </div>
            </template>
          </template>
        </details>

        <!-- <details>
          <summary><h2>Debug: original data</h2></summary>
          <pre>{{ result }}</pre>
        </details> -->
      </template>
    </NuxtErrorBoundary>
  </div>
</template>

<script setup lang="ts">
// import { useLocalStorage } from '@vueuse/core';

// const matrixSource = useLocalStorage('matrix');

// type MatrixSource = number[][];

// const rowCount = useLocalStorage('rowCount', 6);
// const colCount = useLocalStorage('colCount', 6);

const result = ref<string>(undefined);
const resultStatus = ref<string>('idle');

async function run() {
  result.value = await $fetch('/api/calculate-solutions');
}

function print() {
  window.print();
}

await run();
</script>

<style>
html {
  font-size: 14px;
  font-family: system-ui;
}

details summary h2 {
  display: inline-block;
}

.f {
  display: flex;
  align-items: center;
  column-gap: 0.6rem;
}
</style>
