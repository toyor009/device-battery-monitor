<template>
  <div class="flex items-center gap-2">
    <div class="w-3 h-3 rounded-full" :class="color"></div>
    <span class="text-sm text-gray-700">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  color: string;
  label: string;
}

defineProps<Props>();
</script>
