<template>
  <Details :open="only">
    <template #summary>
      <h3>Solution #{{ nth }} — based on possible solution start #{{ solution.solutionStartIndex! + 1 }}</h3>
    </template>

    <h4>Puzzle pieces (before — placement — after):</h4>
    <p v-if="!solution.parts.length">None.</p>
    <template v-else>
      <div class="flex items-center gap-2 my-4">
        <Switch v-model:checked="showSorted" :id="sortCheckboxId"/>
        <Label :for="sortCheckboxId" class="leading-5">Sort by puzzle piece order <br><span class="text-gray-400">“After” will be greyed out if turned on, because the stacking of puzzle pieces is not recalculated upon changing sort order.</span></Label>
      </div>

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
          <Grid :grid="part.after!" :class="{ 'opacity-50': showSorted }" />
          <span v-if="index === parts.length - 1" style="font-size: 1.5rem; margin-left: 0.5rem">✅</span>
        </div>
      </template>
    </template>
  </Details>
</template>

<script setup lang="ts">
import type { PossibleSolution } from '#build/types/nitro-imports';

const {
  nth,
  solution,
} = defineProps<{
  nth: number;
  only: boolean;
  solution: PossibleSolution;
}>();

const sortOrder = ref<'solution' | 'id'>('solution');
const showSorted = ref(true);

const sortCheckboxId = computed(() => useId());
// const sortCheckboxId = computed(() => `solution-${nth}-sort`);

const parts = computed(() => showSorted.value
  ? solution.parts.toSorted((a, b) => a.id.localeCompare(b.id, 'nl-NL'))
  : solution.parts);
</script>
