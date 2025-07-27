import type {
  BatteryReading,
  BatteryAnalysisResult,
  SchoolAnalysis,
  DeviceAnalysis
} from '@/types/battery';

export class BatteryAnalysisService {
  /**
   * Analyzes battery data to identify schools and devices needing attention
   */
  static analyzeBatteryData(data: BatteryReading[]): BatteryAnalysisResult {
    // Group by serialNumber (device)
    const deviceGroups = this.groupByDevice(data);

    // Calculate daily usage for each device across ALL data points
    const deviceAnalyses = Object.entries(deviceGroups).map(([serialNumber, readings]) => {
      return this.calculateDeviceDailyUsage(serialNumber, readings);
    });

    // Group devices by school
    const schoolGroups = this.groupBySchool(deviceAnalyses);

    // Calculate school priorities and statistics
    const schools = Object.entries(schoolGroups).map(([academyId, devices]) => {
      return this.calculateSchoolPriority(Number(academyId), devices);
    });

    // Sort schools by priority (critical devices first)
    const sortedSchools = schools.sort((a, b) => b.criticalDevices - a.criticalDevices);

    // Calculate overall statistics
    const totalDevices = deviceAnalyses.length;
    const totalCritical = deviceAnalyses.filter((d) => d.status === 'critical').length;
    const totalWarning = deviceAnalyses.filter((d) => d.status === 'warning').length;
    const totalHealthy = deviceAnalyses.filter((d) => d.status === 'healthy').length;
    const totalUnknown = deviceAnalyses.filter((d) => d.status === 'unknown').length;

    return {
      schools: sortedSchools,
      totalDevices,
      totalCritical,
      totalWarning,
      totalHealthy,
      totalUnknown
    };
  }

  /**
   * Groups battery readings by device serial number
   */
  private static groupByDevice(data: BatteryReading[]): Record<string, BatteryReading[]> {
    const groups: Record<string, BatteryReading[]> = {};

    data.forEach((reading) => {
      if (!groups[reading.serialNumber]) {
        groups[reading.serialNumber] = [];
      }
      groups[reading.serialNumber].push(reading);
    });

    return groups;
  }

  /**
   * Groups device analyses by school (academyId)
   */
  private static groupBySchool(deviceAnalyses: DeviceAnalysis[]): Record<number, DeviceAnalysis[]> {
    const groups: Record<number, DeviceAnalysis[]> = {};

    deviceAnalyses.forEach((device) => {
      const academyId = device.lastReading?.academyId;
      if (academyId) {
        if (!groups[academyId]) {
          groups[academyId] = [];
        }
        groups[academyId].push(device);
      }
    });

    return groups;
  }

  /**
   * Calculates daily battery usage for a specific device
   */
  private static calculateDeviceDailyUsage(
    serialNumber: string,
    readings: BatteryReading[]
  ): DeviceAnalysis {
    // If only one data point, status is "unknown"
    if (readings.length < 2) {
      return {
        serialNumber,
        status: 'unknown',
        dailyUsageRate: 0,
        lastReading: readings[0] || null,
        readings: readings,
        academyId: readings[0]?.academyId || 0,
        employeeId: readings[0]?.employeeId || ''
      };
    }

    // Sort readings by timestamp (chronological order)
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

      // Skip if battery level increased (device was charged)
      if (consumption <= 0) continue;

      // Calculate duration in hours
      const duration =
        (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) /
        (1000 * 60 * 60);

      totalConsumption += consumption;
      totalHours += duration;
    }

    // Calculate daily usage rate (weighted average)
    const dailyUsageRate = totalHours > 0 ? (totalConsumption / totalHours) * 24 : 0;

    const lastReading = sortedReadings[sortedReadings.length - 1];

    return {
      serialNumber,
      status: this.classifyDeviceStatus(dailyUsageRate),
      dailyUsageRate,
      lastReading,
      readings: sortedReadings,
      academyId: lastReading.academyId,
      employeeId: lastReading.employeeId
    };
  }

  /**
   * Classifies device status based on daily usage rate
   */
  private static classifyDeviceStatus(
    dailyUsageRate: number
  ): 'critical' | 'warning' | 'healthy' | 'unknown' {
    if (dailyUsageRate === 0) return 'unknown';
    if (dailyUsageRate > 0.3) return 'critical'; // >30% per day
    if (dailyUsageRate > 0.25) return 'warning'; // 25-30% per day
    return 'healthy'; // <25% per day
  }

  /**
   * Calculates school priority and statistics
   */
  private static calculateSchoolPriority(
    academyId: number,
    devices: DeviceAnalysis[]
  ): SchoolAnalysis {
    const criticalDevices = devices.filter((d) => d.status === 'critical');
    const warningDevices = devices.filter((d) => d.status === 'warning');
    const healthyDevices = devices.filter((d) => d.status === 'healthy');
    const unknownDevices = devices.filter((d) => d.status === 'unknown');

    // Determine priority based on critical device count
    let priority: 'high' | 'medium' | 'low' = 'low';
    if (criticalDevices.length >= 2) {
      priority = 'high';
    } else if (criticalDevices.length === 1 || warningDevices.length >= 3) {
      priority = 'medium';
    }

    return {
      academyId,
      devices,
      criticalDevices: criticalDevices.length,
      warningDevices: warningDevices.length,
      healthyDevices: healthyDevices.length,
      unknownDevices: unknownDevices.length,
      priority
    };
  }

  /**
   * Formats percentage for display
   */
  static formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * Formats date for display
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
