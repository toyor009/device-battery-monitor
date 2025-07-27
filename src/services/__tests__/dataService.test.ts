import { describe, it, expect, vi } from 'vitest';
import { DataService } from '../dataService';

describe('DataService', () => {
  describe('fetchBatteryData', () => {
    it('should fetch battery data successfully', async () => {
      const result = await DataService.fetchBatteryData();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // Check first item structure
      const firstItem = result.data[0];
      expect(firstItem).toHaveProperty('academyId');
      expect(firstItem).toHaveProperty('batteryLevel');
      expect(firstItem).toHaveProperty('employeeId');
      expect(firstItem).toHaveProperty('serialNumber');
      expect(firstItem).toHaveProperty('timestamp');
    });

    it('should simulate network delay', async () => {
      // Clear cache to force fresh load
      (DataService as any).batteryDataCache = null;
      (DataService as any).lastFetchTime = 0;

      const startTime = Date.now();
      await DataService.fetchBatteryData();
      const endTime = Date.now();

      // Should take at least 500ms due to simulated delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });

    it('should support pagination', async () => {
      const result1 = await DataService.fetchBatteryData({ page: 1, limit: 10 });
      const result2 = await DataService.fetchBatteryData({ page: 2, limit: 10 });

      expect(result1.page).toBe(1);
      expect(result2.page).toBe(2);

      // Check that we have data and pages are different
      if (result1.data.length > 0 && result2.data.length > 0) {
        expect(result1.data).not.toEqual(result2.data);
      }

      // Check that page sizes are respected
      expect(result1.data.length).toBeLessThanOrEqual(10);
      expect(result2.data.length).toBeLessThanOrEqual(10);
    });

    it('should support filtering', async () => {
      const result = await DataService.fetchBatteryData({
        academyId: 30006,
        minBatteryLevel: 0.5
      });

      expect(result.data.every((item) => item.academyId === 30006)).toBe(true);
      expect(result.data.every((item) => item.batteryLevel >= 0.5)).toBe(true);
    });
  });

  describe('validateBatteryReading', () => {
    it('should validate correct battery reading', () => {
      const validReading = {
        academyId: 30006,
        batteryLevel: 0.75,
        employeeId: 'T1001',
        serialNumber: 'TEST001',
        timestamp: '2019-05-17T09:00:00.000Z'
      };

      expect(DataService.validateBatteryReading(validReading)).toBe(true);
    });

    it('should reject invalid battery readings', () => {
      const invalidReadings = [
        // Missing academyId
        {
          batteryLevel: 0.75,
          employeeId: 'T1001',
          serialNumber: 'TEST001',
          timestamp: '2019-05-17T09:00:00.000Z'
        },
        // Invalid battery level (> 1.0)
        {
          academyId: 30006,
          batteryLevel: 1.5,
          employeeId: 'T1001',
          serialNumber: 'TEST001',
          timestamp: '2019-05-17T09:00:00.000Z'
        },
        // Invalid battery level (< 0)
        {
          academyId: 30006,
          batteryLevel: -0.1,
          employeeId: 'T1001',
          serialNumber: 'TEST001',
          timestamp: '2019-05-17T09:00:00.000Z'
        },
        // Wrong data types
        {
          academyId: '30006', // Should be number
          batteryLevel: 0.75,
          employeeId: 'T1001',
          serialNumber: 'TEST001',
          timestamp: '2019-05-17T09:00:00.000Z'
        },
        // Null/undefined
        null,
        undefined,
        // Empty object
        {}
      ];

      invalidReadings.forEach((reading, index) => {
        const result = DataService.validateBatteryReading(reading);
        expect(result).toBe(false);
      });
    });
  });

  describe('sanitizeBatteryData', () => {
    it('should filter out invalid readings', () => {
      const mixedData = [
        // Valid reading
        {
          academyId: 30006,
          batteryLevel: 0.75,
          employeeId: 'T1001',
          serialNumber: 'TEST001',
          timestamp: '2019-05-17T09:00:00.000Z'
        },
        // Invalid reading (missing field)
        {
          academyId: 30006,
          batteryLevel: 0.75,
          employeeId: 'T1001',
          timestamp: '2019-05-17T09:00:00.000Z'
          // Missing serialNumber
        },
        // Another valid reading
        {
          academyId: 30007,
          batteryLevel: 0.5,
          employeeId: 'T1002',
          serialNumber: 'TEST002',
          timestamp: '2019-05-17T10:00:00.000Z'
        },
        // Invalid reading (bad battery level)
        {
          academyId: 30008,
          batteryLevel: 2.0, // Invalid
          employeeId: 'T1003',
          serialNumber: 'TEST003',
          timestamp: '2019-05-17T11:00:00.000Z'
        }
      ];

      const sanitized = DataService.sanitizeBatteryData(mixedData);

      expect(sanitized).toHaveLength(2);
      expect(sanitized[0].serialNumber).toBe('TEST001');
      expect(sanitized[1].serialNumber).toBe('TEST002');
    });

    it('should handle empty array', () => {
      const sanitized = DataService.sanitizeBatteryData([]);
      expect(sanitized).toHaveLength(0);
    });

    it('should handle all invalid data', () => {
      const invalidData = [null, undefined, { invalid: 'data' }, 'not an object'];

      const sanitized = DataService.sanitizeBatteryData(invalidData);
      expect(sanitized).toHaveLength(0);
    });
  });
});
