<template>
  <Dialog>
    <DialogTrigger asChild>
      <slot name="trigger"></slot>
    </DialogTrigger>
    <DialogContent class="max-w-[1200px] p-0 grid-rows-[auto_minmax(0,1fr)_auto] max-sm:w-[calc(100dvw-3rem)] max-sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100dvw-6rem)] sm:max-h-[calc(100dvh-6rem)]">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle>Browse puzzles</DialogTitle>
        <DialogDescription>
          Pick a puzzle to calculate.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4 overflow-y-auto px-6">
        <RadioCards
          v-model="selectedPuzzle"
          :options="entries(SelectablePuzzleLibrary).map(([key, puzzle]) => ({
            value: key,
            label: 'name' in puzzle ? (puzzle.name as string) : key,
            description: `${puzzle.gameBoard[0]!.length}x${puzzle.gameBoard.length} game board • ${puzzle.figures.length} symbols • ${puzzle.puzzlePieces.length} puzzle pieces`,
          }))"
        />
      </div>
      <DialogFooter class="p-6 pt-0">
        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
          >Cancel</Button>
        </DialogClose>

        <DialogClose asChild>
          <Button
            type="close"
            class="gap-1"
            @click="$emit('submit', SelectablePuzzleLibrary[selectedPuzzle])"
          >
            <Calculator class="shrink-0"/>
            Calculate
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core';
import { Calculator } from 'lucide-vue-next';

defineEmits<{
  submit: [payload: PuzzleOptions];
}>();

const selectablePuzzleIds = keys(SelectablePuzzleLibrary);
const defaultSelectedPuzzle = selectablePuzzleIds[0]!;

const selectedPuzzle = useLocalStorage<typeof selectablePuzzleIds[number]>('puzzleBrowserSelectedPuzzle', defaultSelectedPuzzle);

if (!selectablePuzzleIds.includes(selectedPuzzle.value)) {
  selectedPuzzle.value = defaultSelectedPuzzle;
}
</script>
