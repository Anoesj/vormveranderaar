<template>
  <Details :open="only" nested>
    <template #summary>
      <h3>Solution #{{ nth }} — based on possible solution start #{{ solution.solutionStartIndex! + 1 }}</h3>
    </template>

    <h4>Puzzle pieces (before — placement — after):</h4>
    <p v-if="!solution.parts.length">None.</p>
    <div v-else class="overflow-x-auto">
      <div class="grid grid-cols-[auto_1fr] items-center gap-2 my-4">
        <Switch v-model:checked="showSorted" :id="sortCheckboxId"/>
        <Label :for="sortCheckboxId" class="leading-5">Sort by puzzle piece order<br><span class="text-gray-400">Before and after situations will be greyed out if turned on, because the stacking of puzzle pieces is not recalculated upon changing sort order.</span></Label>

        <Switch v-model:checked="autoScroll" :id="autoScrollCheckboxId"/>
        <Label :for="autoScrollCheckboxId" class="leading-5">Auto-scroll<br><span class="text-gray-400">Press ESC to stop auto-scrolling.</span></Label>
      </div>

      <template
        v-for="(part, index) of parts"
        :key="part.id"
      >
        <h5 class="mt-4">
          {{ part.id }}{{
            part.partOfPossibleSolutionStart !== undefined
              ? ` (part of possible solution start #${part.partOfPossibleSolutionStart + 1})`
              : ''
          }}
        </h5>

        <div class="f">
          <Grid :grid="part.before!" :class="{ 'opacity-30': showSorted }" />
          ➕
          <Grid :grid="part.grid" isPuzzlePieceGrid />
          🟰
          <Grid :grid="part.after!" :class="{ 'opacity-30': showSorted }" />
          <span v-if="index === parts.length - 1" style="font-size: 1.5rem; margin-left: 0.5rem">✅</span>
        </div>
      </template>
    </div>
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

const showSorted = ref(true);
const autoScroll = useAutoScroll(40);

const sortCheckboxId = computed(() => useId());
const autoScrollCheckboxId = computed(() => useId());

const parts = computed(() => showSorted.value
  ? solution.parts.toSorted((a, b) => a.id.localeCompare(b.id, 'nl-NL'))
  : solution.parts);
</script>
