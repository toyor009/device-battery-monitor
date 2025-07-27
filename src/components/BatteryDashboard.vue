<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto px-4 py-6 max-w-7xl">
      <!-- Header -->
      <header
        class="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg border border-white/20"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">📱 Battery Monitor Dashboard</h1>
          <p class="text-gray-600 ml-2">Field Support Tool for Device Battery Health Monitoring</p>
        </div>
      </header>

      <!-- Loading State -->
      <div v-if="batteryStore.loading" class="text-center py-12">
        <div
          v-loading="true"
          element-loading-text="Analyzing battery data..."
          class="min-h-[200px] flex items-center justify-center"
        >
          <div class="text-gray-500">Loading battery data...</div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="batteryStore.error" class="text-center py-12">
        <el-alert :title="batteryStore.error" type="error" show-icon />
        <el-button @click="batteryStore.refreshData()" type="primary" class="mt-4">
          Try Again
        </el-button>
      </div>

      <!-- Main Content -->
      <div v-else-if="batteryStore.analysisResult">
        <!-- Statistics Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            :value="batteryStore.totalStats.schoolsNeedingVisits"
            label="Schools Needing Visits"
            type="critical"
            icon="🏫"
          />
          <StatsCard
            :value="batteryStore.totalStats.totalCritical"
            label="Devices Need Replacement"
            type="critical"
            icon="🔋"
          />
          <StatsCard
            :value="batteryStore.totalStats.totalHealthy"
            label="Healthy Devices"
            type="healthy"
            icon="✅"
          />
          <StatsCard
            :value="batteryStore.totalStats.totalUnknown"
            label="Unknown Status"
            type="info"
            icon="❓"
          />
        </div>

        <!-- Schools Section -->
        <div class="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h2 class="text-2xl font-semibold text-gray-800">🏫 Schools Priority List</h2>
            <div class="flex items-center gap-3">
              <el-button-group>
                <el-button
                  :type="batteryStore.selectedFilter === 'all' ? 'primary' : 'default'"
                  @click="batteryStore.setFilter('all')"
                  size="small"
                >
                  All Schools
                </el-button>
                <el-button
                  :type="batteryStore.selectedFilter === 'critical' ? 'primary' : 'default'"
                  @click="batteryStore.setFilter('critical')"
                  size="small"
                >
                  Critical Only
                </el-button>
                <el-button
                  :type="batteryStore.selectedFilter === 'needs-visits' ? 'primary' : 'default'"
                  @click="batteryStore.setFilter('needs-visits')"
                  size="small"
                >
                  Need Visits
                </el-button>
              </el-button-group>

              <el-divider direction="vertical" />

              <el-button @click="batteryStore.expandAllSchools()" size="small" text>
                Expand All
              </el-button>
              <el-button @click="batteryStore.collapseAllSchools()" size="small" text>
                Collapse All
              </el-button>
            </div>
          </div>

          <!-- Schools List -->
          <div class="space-y-4">
            <SchoolCard
              v-for="school in batteryStore.filteredSchools"
              :key="school.academyId"
              :school="school"
            />
          </div>

          <!-- Empty State -->
          <div v-if="batteryStore.filteredSchools.length === 0" class="text-center py-12">
            <p class="text-gray-500 text-lg">No schools match the current filter</p>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-6 bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md">
          <div class="flex justify-center items-center gap-6 flex-wrap">
            <LegendItem color="bg-red-500" label="Critical (>30% daily usage)" />
            <LegendItem color="bg-orange-500" label="Warning (25-30% daily usage)" />
            <LegendItem color="bg-green-500" label="Healthy (<25% daily usage)" />
            <LegendItem color="bg-gray-500" label="Unknown (insufficient data)" />
          </div>
        </div>

        <!-- Summary Section -->
        <div
          class="mt-6 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20"
        >
          <div class="flex items-center justify-center gap-8 text-center">
            <div class="flex items-center gap-3">
              <div class="text-3xl">🏫</div>
              <div class="text-2xl font-bold text-gray-800">
                {{ batteryStore.totalStats.schoolsNeedingVisits }}
              </div>
              <div class="text-sm text-gray-600">Total Schools</div>
            </div>

            <div class="w-px h-12 bg-gray-300"></div>

            <div class="flex items-center gap-3">
              <div class="text-3xl">📱</div>
              <div class="text-2xl font-bold text-gray-800">
                {{ batteryStore.totalStats.totalDevices }}
              </div>
              <div class="text-sm text-gray-600">Total Devices</div>
            </div>
          </div>
        </div>

        <!-- Data Management Controls -->
        <DataControls
          class="mt-10"
          :loading="batteryStore.loading"
          :total-records="batteryStore.totalRecords"
          :current-page="batteryStore.currentPage"
          :page-size="batteryStore.pageSize"
          :has-data="batteryStore.analysisResult !== null"
          :filtered-stats="batteryStore.filteredStats"
          @update:page="handlePageUpdate"
          @update:page-size="handlePageSizeUpdate"
          @export="handleExport"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBatteryStore } from '@/stores/batteryStore';

import StatsCard from './StatsCard.vue';
import SchoolCard from './SchoolCard.vue';
import LegendItem from './LegendItem.vue';
import DataControls from './DataControls.vue';

const batteryStore = useBatteryStore();

function handlePageUpdate(page: number) {
  batteryStore.setPage(page);
}

function handlePageSizeUpdate(pageSize: number) {
  batteryStore.setPageSize(pageSize);
}

function handleExport() {
  batteryStore.exportData();
}

onMounted(() => {
  batteryStore.loadBatteryData();
});
</script>
