<template>
  <div
    class="bg-white/95 backdrop-blur-sm rounded-xl p-6 text-center shadow-lg border border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    :class="cardClasses"
  >
    <div class="text-3xl mb-2">{{ icon }}</div>
    <div class="text-3xl font-bold mb-2" :class="valueClasses">
      {{ value }}
    </div>
    <div class="text-sm text-gray-600 uppercase tracking-wide font-medium">
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: number;
  label: string;
  type: 'critical' | 'warning' | 'healthy' | 'info';
  icon: string;
}

const props = defineProps<Props>();

const cardClasses = computed(() => {
  switch (props.type) {
    case 'critical':
      return 'hover:border-red-200';
    case 'warning':
      return 'hover:border-orange-200';
    case 'healthy':
      return 'hover:border-green-200';
    case 'info':
      return 'hover:border-blue-200';
    default:
      return 'hover:border-gray-200';
  }
});

const valueClasses = computed(() => {
  switch (props.type) {
    case 'critical':
      return 'text-red-600';
    case 'warning':
      return 'text-orange-600';
    case 'healthy':
      return 'text-green-600';
    case 'info':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
});
</script>
