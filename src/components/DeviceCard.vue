<template>
  <div
    class="bg-white rounded-lg p-4 border transition-all duration-200 hover:shadow-md flex flex-col justify-between"
    :class="cardClasses"
  >
    <div>
      <!-- Device Header -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1 min-w-0">
          <div class="font-mono text-sm font-semibold text-gray-800 truncate">
            {{ device.serialNumber }}
          </div>
        </div>
        <el-tag :type="statusTagType" size="small" effect="dark">
          {{ statusLabel }}
        </el-tag>
      </div>

      <!-- Device Metrics -->
      <div class="grid grid-cols-2 gap-3">
        <div class="text-center">
          <div class="text-lg font-bold mb-1" :class="usageClasses">
            {{ dailyUsageDisplay }}
          </div>
          <div class="text-xs text-gray-600">Daily Usage</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-gray-700 mb-1">
            {{ device.readings.length }}
          </div>
          <div class="text-xs text-gray-600">Data Points</div>
        </div>
      </div>

      <!-- Additional Info for Critical Devices -->
      <div v-if="device.status === 'critical'" class="mt-3 pt-3 border-t border-gray-200">
        <div class="text-xs text-gray-600 space-y-1">
          <div>
            <span class="font-medium">Last Reading:</span>
            {{ lastReadingTime }}
          </div>
          <div>
            <span class="font-medium">Battery Level:</span>
            {{ batteryStore.formatPercentage(device.lastReading?.batteryLevel || 0) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Device Details Popover -->
    <el-popover placement="top" :width="300" trigger="hover" v-if="device.status !== 'unknown'">
      <template #reference>
        <el-button text size="small" class="w-full mt-2" :icon="Info"> View Details </el-button>
      </template>

      <div class="space-y-2">
        <div class="font-semibold text-gray-800">Device Analysis</div>
        <div class="text-sm space-y-1">
          <div>
            <span class="font-medium">Serial:</span>
            <span class="font-mono">{{ device.serialNumber }}</span>
          </div>
          <div>
            <span class="font-medium">Academy:</span>
            {{ device.academyId }}
          </div>
          <div>
            <span class="font-medium">Daily Usage:</span>
            {{ batteryStore.formatPercentage(device.dailyUsageRate) }}
          </div>
          <div>
            <span class="font-medium">Last Reading:</span>
            {{ lastReadingTime }}
          </div>
          <div>
            <span class="font-medium">Battery Level:</span>
            {{ batteryStore.formatPercentage(device.lastReading?.batteryLevel || 0) }}
          </div>
          <div>
            <span class="font-medium">Data Points:</span>
            {{ device.readings.length }}
          </div>
          <div>
            <span class="font-medium">Status:</span>
            <el-tag :type="statusTagType" size="small">{{ statusLabel }}</el-tag>
          </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import { useBatteryStore } from '@/stores/batteryStore';
import type { DeviceAnalysis } from '@/types/battery';

interface Props {
  device: DeviceAnalysis;
}

const props = defineProps<Props>();
const batteryStore = useBatteryStore();

const cardClasses = computed(() => {
  switch (props.device.status) {
    case 'critical':
      return 'border-red-200 bg-gradient-to-br from-red-50 to-white';
    case 'warning':
      return 'border-orange-200 bg-gradient-to-br from-orange-50 to-white';
    case 'healthy':
      return 'border-green-200 bg-gradient-to-br from-green-50 to-white';
    case 'unknown':
      return 'border-gray-200 bg-gradient-to-br from-gray-50 to-white';
    default:
      return 'border-gray-200';
  }
});

const statusTagType = computed(() => {
  switch (props.device.status) {
    case 'critical':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'healthy':
      return 'success';
    case 'unknown':
      return 'info';
    default:
      return 'info';
  }
});

const statusLabel = computed(() => {
  return props.device.status.toUpperCase();
});

const usageClasses = computed(() => {
  switch (props.device.status) {
    case 'critical':
      return 'text-red-600';
    case 'warning':
      return 'text-orange-600';
    case 'healthy':
      return 'text-green-600';
    case 'unknown':
      return 'text-gray-600';
    default:
      return 'text-gray-600';
  }
});

const dailyUsageDisplay = computed(() => {
  if (props.device.status === 'unknown') {
    return 'N/A';
  }
  return batteryStore.formatPercentage(props.device.dailyUsageRate);
});

const lastReadingTime = computed(() => {
  if (!props.device.lastReading) return 'N/A';
  return batteryStore.formatDate(new Date(props.device.lastReading.timestamp));
});
</script>
