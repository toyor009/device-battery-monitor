<template>
  <div
    class="rounded-xl p-5 border-l-4 transition-all duration-300 hover:translate-x-1 hover:shadow-lg"
    :class="cardClasses"
  >
    <!-- School Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <h3 class="text-xl font-semibold text-gray-800">Academy {{ school.academyId }}</h3>
        <span class="ml-3 text-sm text-gray-500"> ID: {{ school.academyId }} </span>
      </div>
      <div class="flex items-center gap-3">
        <el-tag :type="priorityTagType" effect="dark" size="small">
          {{ priorityLabel }} Priority
        </el-tag>
      </div>
    </div>

    <!-- School Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div class="text-center p-3 bg-white rounded-lg shadow-sm">
        <div class="text-xl font-bold text-red-600">{{ school.criticalDevices }}</div>
        <div class="text-xs text-gray-600">Critical</div>
      </div>
      <div class="text-center p-3 bg-white rounded-lg shadow-sm">
        <div class="text-xl font-bold text-orange-600">{{ school.warningDevices }}</div>
        <div class="text-xs text-gray-600">Warning</div>
      </div>
      <div class="text-center p-3 bg-white rounded-lg shadow-sm">
        <div class="text-xl font-bold text-green-600">{{ school.healthyDevices }}</div>
        <div class="text-xs text-gray-600">Healthy</div>
      </div>
      <div class="text-center p-3 bg-white rounded-lg shadow-sm">
        <div class="text-xl font-bold text-gray-600">{{ school.unknownDevices }}</div>
        <div class="text-xs text-gray-600">Unknown</div>
      </div>
    </div>

    <!-- Devices Section -->
    <div v-if="school.criticalDevices > 0 || school.warningDevices > 0">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-lg font-medium text-gray-700 flex items-center gap-2">
          🔋 Priority Devices
          <span class="text-sm text-gray-500">
            ({{ school.criticalDevices + school.warningDevices }})
          </span>
        </h4>
        <el-button
          @click="batteryStore.toggleSchoolExpansion(school.academyId)"
          text
          size="small"
          :icon="isExpanded ? ChevronUp : ChevronDown"
        >
          {{ isExpanded ? 'Hide' : 'Show' }} Details
        </el-button>
      </div>

      <!-- Expanded Device Details -->
      <el-collapse-transition>
        <div v-show="isExpanded" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <DeviceCard
            v-for="device in priorityDevices"
            :key="device.serialNumber"
            :device="device"
          />
        </div>
      </el-collapse-transition>
    </div>

    <!-- All Healthy Devices -->
    <div v-else-if="school.healthyDevices > 0" class="text-center py-4 text-green-600">
      <div class="text-2xl mb-2">✅</div>
      <div class="font-medium">All devices are healthy!</div>
      <div class="text-sm text-gray-600">{{ school.devices.length }} devices monitored</div>
    </div>

    <!-- Unknown Status Only -->
    <div v-else-if="school.unknownDevices > 0" class="text-center py-4 text-gray-600">
      <div class="text-2xl mb-2">❓</div>
      <div class="font-medium">Status unknown</div>
      <div class="text-sm text-gray-600">{{ school.unknownDevices }} devices need more data</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import { useBatteryStore } from '@/stores/batteryStore';
import type { SchoolAnalysis } from '@/types/battery';
import DeviceCard from './DeviceCard.vue';

interface Props {
  school: SchoolAnalysis;
}

const props = defineProps<Props>();
const batteryStore = useBatteryStore();

const isExpanded = computed(() => batteryStore.isSchoolExpanded(props.school.academyId));

const cardClasses = computed(() => {
  const baseClasses = 'bg-gray-50';

  switch (props.school.priority) {
    case 'high':
      return `${baseClasses} border-red-500 bg-gradient-to-r from-red-50 to-gray-50`;
    case 'medium':
      return `${baseClasses} border-orange-500 bg-gradient-to-r from-orange-50 to-gray-50`;
    case 'low':
      return `${baseClasses} border-green-500 bg-gradient-to-r from-green-50 to-gray-50`;
    default:
      return `${baseClasses} border-gray-300`;
  }
});

const priorityTagType = computed(() => {
  switch (props.school.priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
});

const priorityLabel = computed(() => {
  return props.school.priority.charAt(0).toUpperCase() + props.school.priority.slice(1);
});

const priorityDevices = computed(() => {
  return props.school.devices.filter(
    (device) => device.status === 'critical' || device.status === 'warning'
  );
});
</script>
