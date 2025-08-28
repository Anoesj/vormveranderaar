<template>
  <details
    class="overflow-hidden rounded-lg border text-card-foreground shadow-sm mb-4"
    :class="nested ? 'bg-white' : 'bg-[#f8fafc]'"
    :open="isOpen"
    @toggle="handleToggle"
  >
    <summary class="flex justify-between items-center gap-4 px-4 py-3 cursor-pointer font-semibold">
      <slot name="summary">
        Details
      </slot>
      <span aria-hidden="true" class="details__icon shrink-0 w-[24px] h-[24px] relative">
        <!-- NOTE: in-out, but do not add that, because then it doesn't work properly anymore?! :/ -->
        <Transition
          name="fade"
          type="transition"
        >
          <component
            :is="isOpen ? Minus : Plus"
            :size="24"
            class="absolute inset-0"
          />
        </Transition>
      </span>
    </summary>

    <Transition
      name="height-auto"
      mode="out-in"
      type="transition"
    >
      <div v-if="isOpen" class="p-4">
        <slot></slot>
      </div>
    </Transition>
  </details>
</template>

<script setup lang="ts">
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

  const isPrinting = inject(isPrintingKey)!;

  function handleToggle (event: ToggleEvent) {
    isOpen.value = event.newState === 'open';
    emit('toggle', isOpen.value);
  }

  watch(() => open, (newValue) => {
    isOpen.value = newValue;
  });

  if (import.meta.client && forceOpenOnPrint) {
    let wasOpen: boolean | undefined;

    watch(isPrinting, (newValue) => {
      if (newValue) {
        wasOpen = isOpen.value;
        isOpen.value = true;
      }
      else {
        isOpen.value = wasOpen as boolean;
        wasOpen = undefined;
      }
    }, { flush: 'sync' });
  }
</script>

<style lang="scss" scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition-timing-function: linear;
  }

  .details__icon {
    transition-property: rotate;
    transition-duration: 0.3s;
    transition-timing-function: var(--easing-cubic);
  }

  details:not([open]) .details__icon {
    rotate: -0.25turn;
  }

  // Without this, the height-auto out-transition will not work,
  // because the <details> element is not in open state anymore.
  details::details-content {
    content-visibility: visible;
  }

  // If we ever decide not to use v-if on the default slot, we can use the following:
  // details {
  //   &::details-content {
  //     transition-property: opacity, height, content-visibility;
  //     transition-duration: 0.3s;
  //     transition-timing-function: var(--easing-cubic);
  //     transition-behavior: allow-discrete;
  //     overflow: clip;
  //   }

  //   &:not([open])::details-content {
  //     height: 0;
  //     opacity: 0;
  //     content-visibility: hidden;
  //   }

  //   &[open]::details-content {
  //     height: auto;
  //     opacity: 1;
  //   }
  // }
</style>
