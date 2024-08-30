<template>
  <table
    :class="{
      'puzzle-piece': puzzlePiece,
    }"
  >
    <tr v-for="row of grid">
      <td
        v-for="colVal of row"
        :class="{
          'puzzle-piece--active': puzzlePiece && colVal,
        }"
      >
        <slot :value="colVal">{{ colVal }}</slot>
      </td>
    </tr>
  </table>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    grid: unknown[][];
    puzzlePiece?: boolean;
  }>(),
  {
    puzzlePiece: false,
  }
);
</script>

<style>
table {
  border-collapse: collapse;
}

td {
  border: 1px solid black;
  padding: 6px 10px;
}

table.puzzle-piece td.puzzle-piece--active {
  background-color: coral;
}
</style>
