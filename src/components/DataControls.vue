<template>
  <div class="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-800">📊 Data Management</h3>
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <span>Total Records: {{ totalRecords }}</span>
        <span>•</span>
        <span>
          Showing: {{ currentPage * pageSize - pageSize + 1 }} -
          {{ Math.min(currentPage * pageSize, totalRecords) }}
        </span>
      </div>
    </div>

    <!-- Controls Row -->
    <div class="flex items-center justify-between">
      <!-- Left: Page Size and Pagination -->
      <div class="flex items-center gap-8">
        <!-- Page Size Selector -->
        <div class="flex items-center gap-2">
          <div class="w-20">
            <el-select
              :model-value="pageSize"
              size="small"
              @update:model-value="handlePageSizeChange"
            >
              <el-option :value="50" label="50" />
              <el-option :value="100" label="100" />
              <el-option :value="200" label="200" />
              <el-option :value="500" label="500" />
            </el-select>
          </div>
          <span class="text-sm text-gray-700">per page</span>
        </div>

        <!-- Pagination -->
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="totalRecords"
          :pager-count="5"
          layout="prev, pager, next"
          size="small"
          @current-change="handlePageChange"
        />
      </div>

      <!-- Right: Action Buttons -->
      <div class="flex items-center gap-2">
        <el-button @click="exportData" size="small" :disabled="!hasData"> Export </el-button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div v-if="hasData" class="mt-4 pt-4 border-t border-gray-200">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="text-center">
          <div class="font-semibold text-blue-600">{{ filteredStats.totalDevices }}</div>
          <div class="text-gray-600">Devices</div>
        </div>
        <div class="text-center">
          <div class="font-semibold text-red-600">{{ filteredStats.totalCritical }}</div>
          <div class="text-gray-600">Critical</div>
        </div>
        <div class="text-center">
          <div class="font-semibold text-orange-600">{{ filteredStats.totalWarning }}</div>
          <div class="text-gray-600">Warning</div>
        </div>
        <div class="text-center">
          <div class="font-semibold text-green-600">{{ filteredStats.totalHealthy }}</div>
          <div class="text-gray-600">Healthy</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface FilteredStats {
  totalDevices: number;
  totalCritical: number;
  totalWarning: number;
  totalHealthy: number;
  totalUnknown: number;
}

const props = defineProps<{
  loading?: boolean;
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  hasData: boolean;
  filteredStats: FilteredStats;
}>();

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [pageSize: number];
  export: [];
}>();

// Methods
function handlePageChange(page: number) {
  emit('update:page', page);
}

function handlePageSizeChange(size: number) {
  emit('update:pageSize', size);
}

function exportData() {
  emit('export');
}
</script>
