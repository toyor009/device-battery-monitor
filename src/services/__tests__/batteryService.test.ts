import { describe, it, expect } from 'vitest';
import { BatteryAnalysisService } from '../batteryService';
import type { BatteryReading } from '../../types/battery';

describe('BatteryAnalysisService', () => {
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
    },
    {
      academyId: 30006,
      batteryLevel: 0.8,
      employeeId: 'EMP002',
      serialNumber: 'DEVICE001',
      timestamp: '2019-05-18T20:00:00.000+01:00'
    },
    {
      academyId: 30006,
      batteryLevel: 1.0,
      employeeId: 'EMP003',
      serialNumber: 'DEVICE002',
      timestamp: '2019-05-17T08:00:00.000+01:00'
    },
    {
      academyId: 30006,
      batteryLevel: 0.95,
      employeeId: 'EMP003',
      serialNumber: 'DEVICE002',
      timestamp: '2019-05-17T20:00:00.000+01:00'
    }
  ];

  describe('analyzeBatteryData', () => {
    it('should analyze battery data and return comprehensive results', () => {
      const result = BatteryAnalysisService.analyzeBatteryData(mockBatteryData);

      expect(result).toHaveProperty('schools');
      expect(result).toHaveProperty('totalDevices');
      expect(result).toHaveProperty('totalCritical');
      expect(result).toHaveProperty('totalWarning');
      expect(result).toHaveProperty('totalHealthy');
      expect(result).toHaveProperty('totalUnknown');

      expect(result.totalDevices).toBe(2); // 2 unique devices
      expect(result.schools).toHaveLength(1); // 1 school
    });

    it('should group devices by serialNumber correctly', () => {
      const result = BatteryAnalysisService.analyzeBatteryData(mockBatteryData);

      const school = result.schools[0];
      expect(school.devices).toHaveLength(2);

      const device1 = school.devices.find((d) => d.serialNumber === 'DEVICE001');
      const device2 = school.devices.find((d) => d.serialNumber === 'DEVICE002');

      expect(device1).toBeDefined();
      expect(device2).toBeDefined();
      expect(device1?.readings).toHaveLength(3);
      expect(device2?.readings).toHaveLength(2);
    });

    it('should calculate daily usage rate correctly', () => {
      const result = BatteryAnalysisService.analyzeBatteryData(mockBatteryData);

      const device1 = result.schools[0].devices.find((d) => d.serialNumber === 'DEVICE001');

      // DEVICE001: 100% -> 90% (12h) -> 80% (24h)
      // First interval: 10% over 12 hours = 20% daily rate
      // Second interval: 10% over 24 hours = 10% daily rate
      // Weighted average: (10% × 12 + 10% × 24) / (12 + 24) = 13.33% daily usage
      expect(device1?.dailyUsageRate).toBeCloseTo(0.1333, 3);
      expect(device1?.status).toBe('healthy');
    });

    it('should handle devices with single data point as unknown', () => {
      const singleDeviceData: BatteryReading[] = [
        {
          academyId: 30006,
          batteryLevel: 1.0,
          employeeId: 'EMP001',
          serialNumber: 'SINGLE_DEVICE',
          timestamp: '2019-05-17T08:00:00.000+01:00'
        }
      ];

      const result = BatteryAnalysisService.analyzeBatteryData(singleDeviceData);

      expect(result.totalUnknown).toBe(1);
      expect(result.totalDevices).toBe(1);

      const device = result.schools[0].devices[0];
      expect(device.status).toBe('unknown');
      expect(device.dailyUsageRate).toBe(0);
    });

    it('should exclude charging periods from calculations', () => {
      const chargingData: BatteryReading[] = [
        {
          academyId: 30006,
          batteryLevel: 0.5,
          employeeId: 'EMP001',
          serialNumber: 'CHARGING_DEVICE',
          timestamp: '2019-05-17T08:00:00.000+01:00'
        },
        {
          academyId: 30006,
          batteryLevel: 1.0, // Charged
          employeeId: 'EMP001',
          serialNumber: 'CHARGING_DEVICE',
          timestamp: '2019-05-17T20:00:00.000+01:00'
        },
        {
          academyId: 30006,
          batteryLevel: 0.9, // Discharging again
          employeeId: 'EMP001',
          serialNumber: 'CHARGING_DEVICE',
          timestamp: '2019-05-18T08:00:00.000+01:00'
        }
      ];

      const result = BatteryAnalysisService.analyzeBatteryData(chargingData);

      const device = result.schools[0].devices[0];
      // Only the last interval should be considered (100% -> 90% over 12 hours)
      // 10% over 12 hours = 20% daily rate
      expect(device.dailyUsageRate).toBeCloseTo(0.2, 2);
    });

    it('should classify device status correctly', () => {
      const criticalData: BatteryReading[] = [
        {
          academyId: 30006,
          batteryLevel: 1.0,
          employeeId: 'EMP001',
          serialNumber: 'CRITICAL_DEVICE',
          timestamp: '2019-05-17T08:00:00.000+01:00'
        },
        {
          academyId: 30006,
          batteryLevel: 0.7, // 30% drop in 12 hours = 60% daily rate
          employeeId: 'EMP001',
          serialNumber: 'CRITICAL_DEVICE',
          timestamp: '2019-05-17T20:00:00.000+01:00'
        }
      ];

      const result = BatteryAnalysisService.analyzeBatteryData(criticalData);
      const device = result.schools[0].devices[0];

      expect(device.status).toBe('critical');
      expect(device.dailyUsageRate).toBeCloseTo(0.6, 2);
    });

    it('should sort schools by priority correctly', () => {
      const multiSchoolData: BatteryReading[] = [
        // School 1: 1 critical device
        {
          academyId: 30006,
          batteryLevel: 1.0,
          employeeId: 'EMP001',
          serialNumber: 'DEVICE001',
          timestamp: '2019-05-17T08:00:00.000+01:00'
        },
        {
          academyId: 30006,
          batteryLevel: 0.7, // Critical
          employeeId: 'EMP001',
          serialNumber: 'DEVICE001',
          timestamp: '2019-05-17T20:00:00.000+01:00'
        },
        // School 2: 2 critical devices
        {
          academyId: 30007,
          batteryLevel: 1.0,
          employeeId: 'EMP002',
          serialNumber: 'DEVICE002',
          timestamp: '2019-05-17T08:00:00.000+01:00'
        },
        {
          academyId: 30007,
          batteryLevel: 0.7, // Critical
          employeeId: 'EMP002',
          serialNumber: 'DEVICE002',
          timestamp: '2019-05-17T20:00:00.000+01:00'
        },
        {
          academyId: 30007,
          batteryLevel: 1.0,
          employeeId: 'EMP003',
          serialNumber: 'DEVICE003',
          timestamp: '2019-05-17T08:00:00.000+01:00'
        },
        {
          academyId: 30007,
          batteryLevel: 0.7, // Critical
          employeeId: 'EMP003',
          serialNumber: 'DEVICE003',
          timestamp: '2019-05-17T20:00:00.000+01:00'
        }
      ];

      const result = BatteryAnalysisService.analyzeBatteryData(multiSchoolData);

      expect(result.schools).toHaveLength(2);
      expect(result.schools[0].criticalDevices).toBe(2); // School 2 should be first
      expect(result.schools[1].criticalDevices).toBe(1); // School 1 should be second
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(BatteryAnalysisService.formatPercentage(0.25)).toBe('25.0%');
      expect(BatteryAnalysisService.formatPercentage(0.333)).toBe('33.3%');
      expect(BatteryAnalysisService.formatPercentage(0)).toBe('0.0%');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2019-05-17T08:00:00.000+01:00');
      const formatted = BatteryAnalysisService.formatDate(date);
      expect(formatted).toContain('May 17');
      expect(formatted).toContain('08:00');
    });
  });
});
