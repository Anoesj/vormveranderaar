<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot name="trigger"/>
    </DialogTrigger>
    <DialogContent class="w-[calc(100dvw-6rem)] max-w-[1200px] max-h-[calc(100dvh-6rem)] p-0 grid-rows-[auto_minmax(0,1fr)_auto]">
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
            <Calculator/>
            Calculate
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
import { Calculator } from 'lucide-vue-next';

defineEmits<{
  submit: [payload: PuzzleOptions];
}>();

const selectedPuzzle = shallowRef<keyof typeof SelectablePuzzleLibrary>(keys(SelectablePuzzleLibrary)[0]!);
</script>
