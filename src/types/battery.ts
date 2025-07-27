export interface BatteryReading {
  academyId: number;
  batteryLevel: number;
  employeeId: string;
  serialNumber: string;
  timestamp: string;
}

export interface DeviceAnalysis {
  serialNumber: string;
  status: 'critical' | 'warning' | 'healthy' | 'unknown';
  dailyUsageRate: number;
  lastReading: BatteryReading | null;
  readings: BatteryReading[];
  academyId: number;
  employeeId: string;
}

export interface SchoolAnalysis {
  academyId: number;
  devices: DeviceAnalysis[];
  criticalDevices: number;
  warningDevices: number;
  healthyDevices: number;
  unknownDevices: number;
  priority: 'high' | 'medium' | 'low';
}

export interface BatteryAnalysisResult {
  schools: SchoolAnalysis[];
  totalDevices: number;
  totalCritical: number;
  totalWarning: number;
  totalHealthy: number;
  totalUnknown: number;
}
