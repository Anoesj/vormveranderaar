<template>
  <Details :open="only" nested>
    <template #summary>
      <h3>Solution #{{ nth }} — based on possible solution start #{{ solution.solutionStartIndex! + 1 }}</h3>
    </template>

    <h4>Puzzle pieces{{ showSorted ? '' : ' (before — placement — after)' }}:</h4>
    <p v-if="!solution.parts.length">None.</p>
    <div v-else class="overflow-x-auto">
      <div class="grid grid-cols-[auto_1fr] items-center gap-2 my-4">
        <Switch :id="sortCheckboxId" v-model:checked="showSorted"/>
        <Label :for="sortCheckboxId" class="leading-5">
          Sort by puzzle piece order
          <br>
          <span class="text-gray-400">
            Before and after situations will be hidden if turned on, because the stacking of puzzle
            pieces is not recalculated upon changing sort order.
          </span>
        </Label>

        <Switch :id="autoScrollCheckboxId" v-model:checked="autoScroll"/>
        <Label :for="autoScrollCheckboxId" class="leading-5">
          Auto-scroll
          <br>
          <span class="text-gray-400">
            Press Escape or scroll manually to stop auto-scrolling.
          </span>
        </Label>
      </div>

      <div
        v-for="(part, index) of parts"
        :key="part.id"
        class="pl-[2px]"
      >
        <h5 class="mt-4">
          {{ part.id }} at (x: {{ part.position.x }}, y: {{ part.position.y }}){{
            part.partOfPossibleSolutionStart !== undefined
              ? ` (part of possible solution start #${part.partOfPossibleSolutionStart + 1})`
              : ''
          }}
        </h5>

        <div class="f">
          <template v-if="!isPrinting && !showSorted">
            <Grid :grid="part.before!"/>
            <Plus/>
          </template>
          <Grid
            :grid="part.grid"
            isPuzzlePieceGrid
            :highlightedPosition="part.position"
          />
          <template v-if="!isPrinting && !showSorted">
            <Equal/>
            <Grid :grid="part.after!"/>
            <span v-if="index === parts.length - 1" style="font-size: 1.5rem; margin-left: 0.5rem">✅</span>
          </template>
        </div>
      </div>
    </div>
  </Details>
</template>

<script setup lang="ts">
  import { Plus, Equal } from 'lucide-vue-next';

  const {
    nth,
    solution,
  } = defineProps<{
    nth: number;
    only: boolean;
    solution: InstanceType<typeof PossibleSolution>;
  }>();

  const isPrinting = inject(isPrintingKey)!;

  const showSorted = ref(true);
  const autoScroll = useAutoScroll(40);

  const sortCheckboxId = computed(() => useId());
  const autoScrollCheckboxId = computed(() => useId());

  const parts = computed(() => (showSorted.value
    ? solution.parts.toSorted((a, b) => a.id.localeCompare(b.id, 'nl-NL'))
    : solution.parts));
</script>
