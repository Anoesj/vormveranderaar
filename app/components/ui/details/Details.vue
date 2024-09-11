<template>
  <details
    class="lazy-details bg-[#ffffff] overflow-hidden"
    :open="isOpen"
    @toggle="handleToggle"
  >
    <summary class="lazy-details__summary">
      <slot name="summary">
        Details
      </slot>
      <span class="lazy-details__icon" aria-hidden="true">
        {{ isOpen ? '-' : '+' }}
      </span>
    </summary>
    <div v-if="isOpen" class="lazy-details__content">
      <slot/>
    </div>
  </details>
</template>

<script setup lang="ts">
const {
  open = false,
} = defineProps<{
  open?: boolean;
}>();

const emit = defineEmits<{
  toggle: [newState: boolean];
}>();

const isOpen = ref(open);

function handleToggle (event: ToggleEvent) {
  isOpen.value = event.newState === 'open';
  emit('toggle', isOpen.value);
}

watch(() => open, (newValue) => {
  isOpen.value = newValue;
});
</script>

<style scoped>
.lazy-details {
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.lazy-details__summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-weight: 500;
  background-color: #f8fafc;
}

.lazy-details__summary::-webkit-details-marker {
  display: none;
}

/* .lazy-details__icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  margin-left: 0.5rem;
  flex-shrink: 0;
}

.lazy-details[open] .lazy-details__icon {
  transform: rotate(180deg);
} */

.lazy-details__content {
  padding: 1rem;
}

/* Ensure the summary slot content and icon are aligned properly */
.lazy-details__summary ::v-slotted(*) {
  flex-grow: 1;
  margin-right: 0.5rem;
}
</style>