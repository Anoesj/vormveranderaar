<template>
  <Details nested>
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

    <h4 class="mt-4">Puzzle pieces (before — placement — after):</h4>
    <template v-if="!puzzlePiecesUsedCount">
      <p>None used.</p>
      <p class="mt-4">ℹ️ <em>If this is the only displayed possible solution start, the preparation phase based on correct corner outputs is most likely disabled, and we just brute forced the puzzle from scratch.</em></p>
    </template>
    <template v-else>
      <div
        v-for="part of possibleSolutionStart.parts"
        :key="part.id"
        class="pl-[2px]"
      >
        <h5>{{ part.id }} at (x: {{ part.position.x }}, y: {{ part.position.y }})</h5>

        <div class="f">
          <Grid :grid="part.before!"/>
          <Plus/>
          <Grid
            :grid="part.grid"
            isPuzzlePieceGrid
            :highlightedPosition="part.position"
          />
          <Equal/>
          <Grid :grid="part.after!"/>
          <span
            v-if="part.after!.isSolution !== undefined"
            style="font-size: 1.5rem; margin-left: 0.5rem"
          >
            {{ state.emoji }}
          </span>
        </div>
      </div>
    </template>
  </Details>
</template>

<script setup lang="ts">
  import type { PossibleSolution } from '#build/types/nitro-imports';
  import { Plus, Equal } from 'lucide-vue-next';

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
