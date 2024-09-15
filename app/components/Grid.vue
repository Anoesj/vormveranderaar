<template>
  <table
    class="border-collapse table-fixed"
    :class="{
      'grid--puzzle-piece': isPuzzlePieceGrid,
    }"
  >
    <tr
      v-for="(row, rowIndex) of gridData"
      :key="rowIndex"
    >
      <td
        v-for="(colVal, colIndex) of row"
        :key="colIndex"
        :class="[
          {
            'puzzle-piece-active-cell': isPuzzlePieceGrid && colVal,
            [`figure--${colVal}`]: !isPuzzlePieceGrid && !doShowFigures,
          },
          `${doShowFigures && !isPuzzlePieceGrid ? 'border-transparent' : 'border-foreground'} border leading-none relative text-center`,
        ]"
      >
        <div class="w-8 h-8 flex items-center justify-center">
          <slot :value="colVal">
            <img
              v-if="!isPuzzlePieceGrid && doShowFigures"
              :src="imgSrc(colVal as number)"
              class="w-full h-full"
            >
            <template v-else>{{ colVal }}</template>
          </slot>
        </div>
      </td>
    </tr>
  </table>
</template>

<script setup lang="ts">
const {
  grid,
  isPuzzlePieceGrid = false,
  replaceAllWith = undefined,
} = defineProps<{
  grid: {
    data: unknown[][];
  };
  isPuzzlePieceGrid?: boolean;
  replaceAllWith?: unknown;
}>();

const result = inject(resultKey)!;
const doShowFigures = inject(doShowFiguresKey)!;

function imgSrc (value: number) {
  return result.value!.figures[value]!.name as string;
}

const gridData = computed(() => {
  if (replaceAllWith === undefined) {
    return grid.data;
  }
  else {
    return grid.data.map(row => row.map((_cell) => replaceAllWith));
  }
});
</script>

<style>
table {
  &.grid--puzzle-piece td {
    &.puzzle-piece-active-cell {
      background-color: #c41a1e;
      color: white;
    }
  }

  &:not(.grid--puzzle-piece) td {
    &.figure--0 {
      background-color: white;
    }
    &.figure--1 {
      background-color: rgb(219, 254, 186);
    }

    &.figure--2 {
      background-color: rgb(167, 205, 235);
    }
  }
}
</style>
