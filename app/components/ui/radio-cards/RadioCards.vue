<template>
  <div class="space-y-3">
    <label
      v-for="option of options"
      :key="option.value"
      class="block cursor-pointer"
    >
      <input
        v-model="modelValue"
        type="radio"
        :value="option.value"
        class="sr-only"
      >

      <div
        class="flex items-center p-4 rounded-lg border-2 transition-all duration-200"
        :class="[
          modelValue === option.value
            ? 'border-primary bg-primary/5'
            : 'border-border bg-background hover:bg-accent hover:text-accent-foreground'
        ]"
      >
        <div
          class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mr-4 transition-all duration-200"
          :class="[
            modelValue === option.value
              ? 'border-primary'
              : 'border-muted-foreground'
          ]"
        >
          <div
            class="w-3 h-3 rounded-full bg-primary transition-all duration-200"
            :class="[
              modelValue === option.value
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-0'
            ]"
          ></div>
        </div>
        <div class="flex-grow">
          <div><strong class="font-medium">{{ option.label }}</strong></div>
          <p v-if="option.description !== undefined" class="text-sm text-muted-foreground">{{ option.description }}</p>
        </div>
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
interface Option {
  value: string;
  label: string;
  description?: string;
}

defineProps<{
  options: Option[];
}>();

const modelValue = defineModel<string>({ required: true });
</script>