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
        class="grid-cell"
        :class="[
          {
            'grid-cell--puzzle-piece-active': isPuzzlePieceGrid && colVal,
            [`grid-cell--figure--${colVal}`]: !isPuzzlePieceGrid && !doShowFigures,
            'grid-cell--highlighted': highlightedPosition && colIndex === highlightedPosition.x && rowIndex === highlightedPosition.y,
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
    highlightedPosition = undefined,
    replaceAllWith = undefined,
  } = defineProps<{
    grid: {
      data: unknown[][];
    };
    isPuzzlePieceGrid?: boolean;
    highlightedPosition?: InstanceType<typeof Position>;
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
      return grid.data.map((row) => row.map((_cell) => replaceAllWith));
    }
  });
</script>

<style lang="scss" scoped>
table {
  &.grid--puzzle-piece .grid-cell {
    &--puzzle-piece-active {
      background-color: #c41a1e;
      color: white;

      &.grid-cell--highlighted {
        background-color: #a00003;

        &::before {
          background-color: transparent;
        }
      }
    }
  }

  &:not(.grid--puzzle-piece) .grid-cell {
    &--figure--0 {
      background-color: white;
    }
    &--figure--1 {
      background-color: hsl(91deg 97% 86%);
    }
    &--figure--2 {
      background-color: hsl(206deg 63% 79%);
    }
  }

  .grid-cell {
    &--highlighted {
      position: relative;

      &::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 10000;
        background-color: hsl(91deg 97% 86% / 15%);
        outline: 3px solid hsl(91deg 97% 40%);
      }
    }
  }
}
</style>
