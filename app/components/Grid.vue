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
          `${!doShowFigures ? 'border-foreground border-[0.5px]' : ''} leading-none relative text-center`,
        ]"
      >
        <div class="w-9 h-9 flex items-center justify-center">
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

const showFigures = inject(showFiguresKey)!;
const result = inject(resultKey)!;

const figuresNamesAreUrls = computed(() => result.value!.figures
  .every(figure => typeof figure.name === 'string' && figure.name.startsWith('http')));

const doShowFigures = computed(() => showFigures.value && figuresNamesAreUrls.value);

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
