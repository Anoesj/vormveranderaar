<template>
  <details
    class="overflow-hidden rounded-lg border text-card-foreground shadow-sm mb-4"
    :class="nested ? 'bg-white' : 'bg-[#f8fafc]'"
    :open="isOpen"
    @toggle="handleToggle"
  >
    <summary class="flex justify-between items-center px-4 py-3 cursor-pointer font-semibold">
      <slot name="summary">
        Details
      </slot>
      <span aria-hidden="true">
        <Minus v-if="isOpen"/>
        <Plus v-else/>
      </span>
    </summary>
    <div v-if="isOpen" class="p-4">
      <slot/>
    </div>
  </details>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { Minus, Plus } from 'lucide-vue-next';

const {
  open = false,
  nested = false,
  forceOpenOnPrint = false,
} = defineProps<{
  open?: boolean;
  nested?: boolean;
  forceOpenOnPrint?: boolean;
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

onMounted(() => {
  if (!forceOpenOnPrint) {
    return;
  }

  let wasOpen: boolean | undefined;

  useEventListener(window, 'custombeforeprint', () => {
    wasOpen = isOpen.value;
    isOpen.value = true;
  });

  useEventListener(window, 'customafterprint', () => {
    isOpen.value = wasOpen as boolean;
    wasOpen = undefined;
  });
});
</script>
