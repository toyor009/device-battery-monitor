import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from '../exportService';
import type { BatteryReading } from '../../types/battery';

describe('ExportService', () => {
  const mockBatteryData: BatteryReading[] = [
    {
      academyId: 30006,
      batteryLevel: 0.68,
      employeeId: 'T1007384',
      serialNumber: '1805C67HD02259',
      timestamp: '2019-05-17T07:47:25.833+01:00'
    },
    {
      academyId: 30006,
      batteryLevel: 0.51,
      employeeId: 'T1001417',
      serialNumber: '1805C67HD02332',
      timestamp: '2019-05-17T07:48:49.147+01:00'
    }
  ];

  beforeEach(() => {
    // Mock document.createElement and related DOM methods
    const mockLink = {
      download: 'test.csv',
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: { visibility: 'hidden' }
    };

    const mockBlob = {
      type: 'text/csv;charset=utf-8;'
    };

    const mockURL = {
      createObjectURL: vi.fn(() => 'blob:test-url')
    };

    global.document.createElement = vi.fn(() => mockLink as any);
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();
    global.Blob = vi.fn(() => mockBlob as any);
    global.URL.createObjectURL = mockURL.createObjectURL;
  });

  describe('exportToCSV', () => {
    it('should create CSV content with correct headers and data', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      ExportService.exportToCSV(mockBatteryData, 'test.csv');

      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('Academy ID,Employee ID,Serial Number,Battery Level,Timestamp'),
          expect.stringContaining(
            '30006,T1007384,1805C67HD02259,68.00%,2019-05-17T07:47:25.833+01:00'
          ),
          expect.stringContaining(
            '30006,T1001417,1805C67HD02332,51.00%,2019-05-17T07:48:49.147+01:00'
          )
        ]),
        { type: 'text/csv;charset=utf-8;' }
      );
    });

    it('should handle empty data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      ExportService.exportToCSV([], 'test.csv');

      expect(consoleSpy).toHaveBeenCalledWith('No data to export');
    });

    it('should handle null data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn');

      ExportService.exportToCSV(null as any, 'test.csv');

      expect(consoleSpy).toHaveBeenCalledWith('No data to export');
    });
  });

  describe('exportStats', () => {
    it('should create stats CSV with correct format', () => {
      const mockStats = {
        totalDevices: 100,
        averageBatteryLevel: 0.75,
        lowBatteryCount: 10,
        criticalBatteryCount: 5
      };

      ExportService.exportStats(mockStats);

      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('Metric,Value'),
          expect.stringContaining('Total Devices,100'),
          expect.stringContaining('Average Battery Level,75.00%'),
          expect.stringContaining('Low Battery Count,10'),
          expect.stringContaining('Critical Battery Count,5')
        ]),
        { type: 'text/csv;charset=utf-8;' }
      );
    });
  });
});
