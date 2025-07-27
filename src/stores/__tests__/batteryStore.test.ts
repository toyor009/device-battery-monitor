import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBatteryStore } from '../batteryStore';
import { DataService } from '../../services/dataService';
import { BatteryAnalysisService } from '../../services/batteryService';
import type { BatteryReading, BatteryAnalysisResult } from '../../types/battery';

// Mock the services
vi.mock('../../services/dataService');
vi.mock('../../services/batteryService');

describe('BatteryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Mock utility functions
    vi.mocked(BatteryAnalysisService.formatPercentage).mockImplementation((value: number) => {
      return `${(value * 100).toFixed(1)}%`;
    });

    vi.mocked(BatteryAnalysisService.formatDate).mockImplementation((date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });
  });

  const mockBatteryData: BatteryReading[] = [
    {
      academyId: 30006,
      batteryLevel: 1.0,
      employeeId: 'EMP001',
      serialNumber: 'DEVICE001',
      timestamp: '2019-05-17T08:00:00.000+01:00'
    },
    {
      academyId: 30006,
      batteryLevel: 0.9,
      employeeId: 'EMP001',
      serialNumber: 'DEVICE001',
      timestamp: '2019-05-17T20:00:00.000+01:00'
    }
  ];

  const mockAnalysisResult: BatteryAnalysisResult = {
    schools: [
      {
        academyId: 30006,
        devices: [],
        criticalDevices: 1,
        warningDevices: 0,
        healthyDevices: 0,
        unknownDevices: 0,
        priority: 'high'
      }
    ],
    totalDevices: 1,
    totalCritical: 1,
    totalWarning: 0,
    totalHealthy: 0,
    totalUnknown: 0
  };

  describe('loadBatteryData', () => {
    it('should load battery data successfully', async () => {
      const store = useBatteryStore();

      // Mock the data service to return complete dataset for analysis
      vi.mocked(DataService.fetchBatteryData).mockResolvedValue({
        data: mockBatteryData,
        total: mockBatteryData.length,
        page: 1,
        limit: 10000,
        hasMore: false
      });

      // Mock the analysis service
      vi.mocked(BatteryAnalysisService.analyzeBatteryData).mockReturnValue(mockAnalysisResult);

      await store.loadBatteryData();

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.analysisResult).toEqual(mockAnalysisResult);
      expect(store.totalRecords).toBe(mockBatteryData.length);
      expect(store.hasMore).toBe(false);
    });

    it('should handle loading errors gracefully', async () => {
      const store = useBatteryStore();
      const errorMessage = 'Failed to load data';

      vi.mocked(DataService.fetchBatteryData).mockRejectedValue(new Error(errorMessage));

      await store.loadBatteryData();

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.analysisResult).toBeNull();
    });

    it('should load complete dataset for analysis and paginated data for display', async () => {
      const store = useBatteryStore();

      // Mock complete dataset call
      vi.mocked(DataService.fetchBatteryData).mockResolvedValueOnce({
        data: mockBatteryData,
        total: mockBatteryData.length,
        page: 1,
        limit: 10000,
        hasMore: false
      });

      // Mock paginated data call
      vi.mocked(DataService.fetchBatteryData).mockResolvedValueOnce({
        data: mockBatteryData.slice(0, 1),
        total: mockBatteryData.length,
        page: 1,
        limit: 100,
        hasMore: true
      });

      vi.mocked(BatteryAnalysisService.analyzeBatteryData).mockReturnValue(mockAnalysisResult);

      await store.loadBatteryData();

      // Should call fetchBatteryData twice - once for analysis, once for pagination
      expect(DataService.fetchBatteryData).toHaveBeenCalledTimes(2);

      // First call should be for complete dataset analysis
      expect(DataService.fetchBatteryData).toHaveBeenCalledWith({ limit: 10000 });

      // Second call should be for paginated display
      expect(DataService.fetchBatteryData).toHaveBeenCalledWith({
        page: 1,
        limit: 100
      });
    });
  });

  describe('pagination', () => {
    it('should update page and reload data', async () => {
      const store = useBatteryStore();

      vi.mocked(DataService.fetchBatteryData).mockResolvedValue({
        data: mockBatteryData,
        total: mockBatteryData.length,
        page: 2,
        limit: 100,
        hasMore: false
      });

      vi.mocked(BatteryAnalysisService.analyzeBatteryData).mockReturnValue(mockAnalysisResult);

      await store.setPage(2);

      expect(store.currentPage).toBe(2);
      expect(DataService.fetchBatteryData).toHaveBeenCalledWith({
        page: 2,
        limit: 100
      });
    });

    it('should update page size and reload data', async () => {
      const store = useBatteryStore();

      vi.mocked(DataService.fetchBatteryData).mockResolvedValue({
        data: mockBatteryData,
        total: mockBatteryData.length,
        page: 1,
        limit: 200,
        hasMore: false
      });

      vi.mocked(BatteryAnalysisService.analyzeBatteryData).mockReturnValue(mockAnalysisResult);

      await store.setPageSize(200);

      expect(store.pageSize).toBe(200);
      expect(store.currentPage).toBe(1); // Should reset to first page
      expect(DataService.fetchBatteryData).toHaveBeenCalledWith({
        page: 1,
        limit: 200
      });
    });
  });

  describe('computed properties', () => {
    it('should calculate total stats correctly', () => {
      const store = useBatteryStore();
      store.analysisResult = mockAnalysisResult;

      expect(store.totalStats.totalDevices).toBe(1);
      expect(store.totalStats.totalCritical).toBe(1);
      expect(store.totalStats.totalWarning).toBe(0);
      expect(store.totalStats.totalHealthy).toBe(0);
      expect(store.totalStats.totalUnknown).toBe(0);
    });

    it('should determine if data is available', () => {
      const store = useBatteryStore();

      // No data initially
      expect(store.hasData).toBe(false);

      // With analysis result
      store.analysisResult = mockAnalysisResult;
      expect(store.hasData).toBe(true);
    });

    it('should get schools needing visits', () => {
      const store = useBatteryStore();
      store.analysisResult = mockAnalysisResult;

      const schoolsNeedingVisits = store.schoolsNeedingVisits;
      expect(schoolsNeedingVisits).toHaveLength(1);
      expect(schoolsNeedingVisits[0].priority).toBe('high');
    });
  });

  describe('school expansion', () => {
    it('should toggle school expansion state', () => {
      const store = useBatteryStore();
      const academyId = 30006;

      // Initially not expanded
      expect(store.isSchoolExpanded(academyId)).toBe(false);

      // Toggle to expanded
      store.toggleSchoolExpansion(academyId);
      expect(store.isSchoolExpanded(academyId)).toBe(true);

      // Toggle back to collapsed
      store.toggleSchoolExpansion(academyId);
      expect(store.isSchoolExpanded(academyId)).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should format percentage correctly', () => {
      const store = useBatteryStore();

      expect(store.formatPercentage(0.25)).toBe('25.0%');
      expect(store.formatPercentage(0.333)).toBe('33.3%');
      expect(store.formatPercentage(0)).toBe('0.0%');
    });

    it('should format date correctly', () => {
      const store = useBatteryStore();
      const date = new Date('2019-05-17T08:00:00.000+01:00');

      const formatted = store.formatDate(date);
      expect(formatted).toContain('May 17');
      expect(formatted).toContain('08:00');
    });
  });
});
