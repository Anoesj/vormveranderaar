<template>
  <Details>
    <template #summary>
      <h3>Possible solution start #{{ nth }} — {{ puzzlePiecesUsedCount }}/{{ totalPuzzlePiecesCount }} puzzle pieces — {{ state.emoji }} {{ state.explanation }}{{ state.type === 'incomplete' && possibleSolutionStart.continuationInfo ? ` — ${numberFormatter.format(possibleSolutionStart.continuationInfo.unusedPuzzlePiecesPossibleCombinations)} possible combinations` : '' }}</h3>
    </template>

    <h4>Summary:</h4>
    <ul>
      <li><strong>State:</strong> {{ state.emoji }} {{ state.explanation }}</li>
      <li><strong>{{ puzzlePiecesUsedCount }}/{{ totalPuzzlePiecesCount }}</strong> puzzle pieces used</li>
      <template v-if="possibleSolutionStart.continuationInfo">
        <li><strong>{{ possibleSolutionStart.continuationInfo.unusedPuzzlePiecesCount }}/{{ totalPuzzlePiecesCount }}</strong> puzzle pieces unused</li>
        <li><strong>{{ numberFormatter.format(possibleSolutionStart.continuationInfo.unusedPuzzlePiecesPossibleCombinations) }}</strong> possible combinations</li>
      </template>
    </ul>

    <h4>Puzzle pieces (before — placement — after):</h4>
    <p v-if="!puzzlePiecesUsedCount">None.</p>
    <template v-else>
      <template
        v-for="part of possibleSolutionStart.parts"
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
            >{{ state.emoji }}</span
          >
        </div>
      </template>
    </template>
  </Details>
</template>

<script setup lang="ts">
import type { PossibleSolution } from '#build/types/nitro-imports';

const {
  possibleSolutionStart,
  totalPuzzlePiecesCount,
} = defineProps<{
  nth: number;
  possibleSolutionStart: PossibleSolution;
  totalPuzzlePiecesCount: number;
}>();

const puzzlePiecesUsedCount = computed(() => possibleSolutionStart.parts.length);

const state = computed(() => {
  if (puzzlePiecesUsedCount.value !== totalPuzzlePiecesCount) {
    return {
      type: 'incomplete',
      emoji: '⏳',
      explanation: 'incomplete, needs brute force',
    };
  }

  if (puzzlePiecesUsedCount.value === 0) {
    return {
      type: 'unknown',
      emoji: '❓',
      explanation: 'state unknown',
    };
  }

  if (possibleSolutionStart.parts.at(-1)!.after!.isSolution) {
    return {
      type: 'solution',
      emoji: '✅',
      explanation: 'solution',
    };
  }

  return {
    type: 'no-solution',
    emoji: '❌',
    explanation: 'no solutions possible',
  };
});
</script>
