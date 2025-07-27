import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { BatteryAnalysisResult, DeviceAnalysis, BatteryReading } from '@/types/battery';
import { BatteryAnalysisService } from '@/services/batteryService';
import { DataService, type FetchOptions, type FetchResult } from '@/services/dataService';
import { ExportService } from '@/services/exportService';

export const useBatteryStore = defineStore('battery', () => {
  // State
  const analysisResult = ref<BatteryAnalysisResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedFilter = ref<'all' | 'critical' | 'needs-visits'>('all');
  const expandedSchools = ref<Set<number>>(new Set());

  // Data management state
  const currentPage = ref(1);
  const pageSize = ref(100);
  const totalRecords = ref(0);
  const hasMore = ref(false);
  const filteredStats = ref({
    totalDevices: 0,
    totalCritical: 0,
    totalWarning: 0,
    totalHealthy: 0,
    totalUnknown: 0
  });

  // Getters
  const filteredSchools = computed(() => {
    if (!analysisResult.value) return [];

    switch (selectedFilter.value) {
      case 'critical':
        return analysisResult.value.schools.filter((school) => school.criticalDevices > 0);
      case 'needs-visits':
        return analysisResult.value.schools.filter(
          (school) => school.priority === 'high' || school.criticalDevices >= 2
        );
      default:
        return analysisResult.value.schools;
    }
  });

  const totalStats = computed(() => {
    if (!analysisResult.value) {
      return {
        totalDevices: 0,
        totalCritical: 0,
        totalWarning: 0,
        totalHealthy: 0,
        totalUnknown: 0,
        schoolsNeedingVisits: 0
      };
    }

    const schoolsNeedingVisits = analysisResult.value.schools.filter(
      (school) => school.priority === 'high' || school.criticalDevices >= 2
    ).length;

    return {
      ...analysisResult.value,
      schoolsNeedingVisits
    };
  });

  const isSchoolExpanded = computed(() => (schoolId: number) => {
    return expandedSchools.value.has(schoolId);
  });

  const schoolsNeedingVisits = computed(() => {
    if (!analysisResult.value) return [];

    return analysisResult.value.schools.filter(
      (school) => school.priority === 'high' || school.criticalDevices >= 2
    );
  });

  const hasData = computed(() => {
    return analysisResult.value !== null;
  });

  // Actions
  async function loadBatteryData() {
    loading.value = true;
    error.value = null;

    try {
      // Load ALL data for analysis (complete dataset)
      const allDataResult = await DataService.fetchBatteryData({
        limit: 10000 // Get all data for analysis
      });

      // Load paginated data for display
      const pageResult = await DataService.fetchBatteryData({
        page: currentPage.value,
        limit: pageSize.value
      });

      // Analyze ALL data for accurate statistics
      analysisResult.value = BatteryAnalysisService.analyzeBatteryData(allDataResult.data);

      // Update pagination state
      totalRecords.value = allDataResult.total;
      hasMore.value = pageResult.hasMore;

      // Update page-specific stats
      updateFilteredStats(pageResult.data);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load battery data';
      console.error('Battery data loading error:', err);
    } finally {
      loading.value = false;
    }
  }

  async function loadBatteryStats() {
    try {
      const stats = await DataService.fetchBatteryStats();
      return stats;
    } catch (err) {
      console.error('Error loading battery stats:', err);
      return null;
    }
  }

  async function loadLatestReadings(limit: number = 50) {
    try {
      return await DataService.fetchLatestReadings(limit);
    } catch (err) {
      console.error('Error loading latest readings:', err);
      return [];
    }
  }

  // Update filtered stats for current page
  function updateFilteredStats(pageData: BatteryReading[]) {
    if (!pageData || pageData.length === 0) {
      filteredStats.value = {
        totalDevices: 0,
        totalCritical: 0,
        totalWarning: 0,
        totalHealthy: 0,
        totalUnknown: 0
      };
      return;
    }

    // Group page data by device (serialNumber) for device-level analysis
    const deviceGroups: Record<string, BatteryReading[]> = {};
    pageData.forEach((reading) => {
      if (!deviceGroups[reading.serialNumber]) {
        deviceGroups[reading.serialNumber] = [];
      }
      deviceGroups[reading.serialNumber].push(reading);
    });

    // Analyze each device in the current page
    let criticalDevices = 0;
    let warningDevices = 0;
    let healthyDevices = 0;
    let unknownDevices = 0;

    Object.entries(deviceGroups).forEach(([serialNumber, readings]) => {
      if (readings.length < 2) {
        unknownDevices++;
        return;
      }

      // Sort readings by timestamp
      const sortedReadings = readings.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let totalConsumption = 0;
      let totalHours = 0;

      // Calculate consumption between consecutive readings
      for (let i = 0; i < sortedReadings.length - 1; i++) {
        const current = sortedReadings[i];
        const next = sortedReadings[i + 1];

        const consumption = current.batteryLevel - next.batteryLevel;

        // Skip if battery level increased (charging)
        if (consumption <= 0) continue;

        const duration =
          (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) /
          (1000 * 60 * 60);

        totalConsumption += consumption;
        totalHours += duration;
      }

      // Calculate daily usage rate
      const dailyUsageRate = totalHours > 0 ? (totalConsumption / totalHours) * 24 : 0;

      // Classify device status
      if (dailyUsageRate === 0) {
        unknownDevices++;
      } else if (dailyUsageRate > 0.3) {
        criticalDevices++;
      } else if (dailyUsageRate > 0.25) {
        warningDevices++;
      } else {
        healthyDevices++;
      }
    });

    filteredStats.value = {
      totalDevices: Object.keys(deviceGroups).length, // Unique devices in this page
      totalCritical: criticalDevices, // Devices with critical status
      totalWarning: warningDevices, // Devices with warning status
      totalHealthy: healthyDevices, // Devices with healthy status
      totalUnknown: unknownDevices // Devices with unknown status
    };
  }

  function setFilter(filter: 'all' | 'critical' | 'needs-visits') {
    selectedFilter.value = filter;
  }

  function setPage(page: number) {
    currentPage.value = page;
    loadBatteryData();
  }

  function setPageSize(size: number) {
    pageSize.value = size;
    currentPage.value = 1; // Reset to first page
    loadBatteryData();
  }

  async function exportData() {
    try {
      await ExportService.exportFilteredData({});
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  function toggleSchoolExpansion(schoolId: number) {
    if (expandedSchools.value.has(schoolId)) {
      expandedSchools.value.delete(schoolId);
    } else {
      expandedSchools.value.add(schoolId);
    }
  }

  function expandAllSchools() {
    if (!analysisResult.value) return;

    analysisResult.value.schools.forEach((school) => {
      expandedSchools.value.add(school.academyId);
    });
  }

  function collapseAllSchools() {
    expandedSchools.value.clear();
  }

  function getDevicesByStatus(
    schoolId: number,
    status: 'critical' | 'warning' | 'healthy' | 'unknown'
  ): DeviceAnalysis[] {
    const school = analysisResult.value?.schools.find((s) => s.academyId === schoolId);
    return school?.devices.filter((device) => device.status === status) || [];
  }

  function refreshData() {
    return loadBatteryData();
  }

  // Utility functions
  function formatPercentage(value: number): string {
    return BatteryAnalysisService.formatPercentage(value);
  }

  function formatDate(date: Date): string {
    return BatteryAnalysisService.formatDate(date);
  }

  return {
    // State
    analysisResult,
    loading,
    error,
    selectedFilter,
    expandedSchools,
    currentPage,
    pageSize,
    totalRecords,
    hasMore,
    filteredStats,

    // Getters
    filteredSchools,
    totalStats,
    isSchoolExpanded,
    schoolsNeedingVisits,
    hasData,

    // Actions
    loadBatteryData,
    loadBatteryStats,
    loadLatestReadings,
    setFilter,
    setPage,
    setPageSize,
    exportData,
    toggleSchoolExpansion,
    expandAllSchools,
    collapseAllSchools,
    getDevicesByStatus,
    refreshData,
    formatPercentage,
    formatDate
  };
});
