<template>
  <details>
    <summary>
      <h3>Solution #{{ nth }} — based on possible solution start #{{ solution.solutionStartIndex! + 1 }}</h3>
    </summary>

    <h4>Puzzle pieces (before — placement — after):</h4>
    <p v-if="!solution.parts.length">None.</p>
    <template v-else>
      <input type="checkbox" :id="sortCheckboxId" v-model="showSorted" /> <label :for="sortCheckboxId">Sort by original order</label>
      <template
        v-for="(part, index) of parts"
        :key="part.id"
      >
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
          <Grid :grid="part.after!" />
          <span v-if="index === parts.length - 1" style="font-size: 1.5rem; margin-left: 0.5rem">✅</span>
        </div>
      </template>
    </template>
  </details>
</template>

<script setup lang="ts">
import type { PossibleSolution } from '#build/types/nitro-imports';

const {
  nth,
  solution,
} = defineProps<{
  nth: number;
  solution: PossibleSolution;
}>();

const showSorted = ref(false);
const sortCheckboxId = computed(() => `solution-${nth}-sort`);
const parts = computed(() => showSorted.value ? solution.parts.toSorted((a, b) => a.id.localeCompare(b.id, 'nl-NL')) : solution.parts);
</script>
