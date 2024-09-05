<template>
  <table
    class="grid"
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
        :class="{
          'puzzle-piece-active-cell': isPuzzlePieceGrid && colVal,
          [`figure--${colVal}`]: !isPuzzlePieceGrid,
        }"
      >
        <slot :value="colVal">{{ colVal }}</slot>
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
.grid {
  border-collapse: collapse;

  td {
    border: 1px solid black;
    padding: 6px 10px;
  }

  &.grid--puzzle-piece td {
    &.puzzle-piece-active-cell {
      background-color: rgb(62, 62, 62);
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
