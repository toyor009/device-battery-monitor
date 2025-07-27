import type { BatteryReading } from '@/types/battery';

export interface FetchOptions {
  page?: number;
  limit?: number;
  academyId?: number;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  minBatteryLevel?: number;
  maxBatteryLevel?: number;
}

export interface FetchResult {
  data: BatteryReading[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class DataService {
  private static batteryDataCache: BatteryReading[] | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetches battery data from the JSON file with pagination and filtering options
   */
  static async fetchBatteryData(options: FetchOptions = {}): Promise<FetchResult> {
    const {
      page = 1,
      limit = 100,
      academyId,
      employeeId,
      startDate,
      endDate,
      minBatteryLevel,
      maxBatteryLevel
    } = options;

    // Check cache first
    const now = Date.now();
    if (!this.batteryDataCache || now - this.lastFetchTime > this.CACHE_DURATION) {
      await this.loadBatteryData();
    }

    if (!this.batteryDataCache) {
      throw new Error('Failed to load battery data');
    }

    // For analysis requests (large limit), return all data
    if (limit >= 10000) {
      return {
        data: this.batteryDataCache,
        total: this.batteryDataCache.length,
        page: 1,
        limit: this.batteryDataCache.length,
        hasMore: false
      };
    }

    // Apply filters
    let filteredData = this.batteryDataCache.filter((reading) => {
      if (academyId && reading.academyId !== academyId) return false;
      if (employeeId && reading.employeeId !== employeeId) return false;
      if (minBatteryLevel !== undefined && reading.batteryLevel < minBatteryLevel) return false;
      if (maxBatteryLevel !== undefined && reading.batteryLevel > maxBatteryLevel) return false;
      if (startDate && new Date(reading.timestamp) < new Date(startDate)) return false;
      if (endDate && new Date(reading.timestamp) > new Date(endDate)) return false;
      return true;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: filteredData.length,
      page,
      limit,
      hasMore: endIndex < filteredData.length
    };
  }

  /**
   * Loads battery data from JSON file with error handling and validation
   */
  private static async loadBatteryData(): Promise<void> {
    try {
      // Simulate network delay for large file loading
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await fetch('/src/data/battery.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch battery data: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Validate and sanitize the data
      const validatedData = this.sanitizeBatteryData(rawData);

      this.batteryDataCache = validatedData;
      this.lastFetchTime = Date.now();
    } catch (error) {
      console.error('Error loading battery data:', error);
      // Fallback to hardcoded data if JSON loading fails
      this.batteryDataCache = this.getFallbackData();
      this.lastFetchTime = Date.now();
    }
  }

  /**
   * Fetches summary statistics for battery data
   */
  static async fetchBatteryStats(options: FetchOptions = {}): Promise<{
    totalDevices: number;
    averageBatteryLevel: number;
    lowBatteryCount: number;
    criticalBatteryCount: number;
    academyStats: Record<number, { count: number; avgLevel: number }>;
  }> {
    const result = await this.fetchBatteryData({ ...options, limit: 10000 }); // Get all data for stats

    const uniqueDevices = new Set(result.data.map((d) => d.serialNumber));
    const totalBatteryLevel = result.data.reduce((sum, d) => sum + d.batteryLevel, 0);
    const lowBatteryCount = result.data.filter((d) => d.batteryLevel < 0.2).length;
    const criticalBatteryCount = result.data.filter((d) => d.batteryLevel < 0.1).length;

    // Calculate academy statistics
    const academyStats: Record<number, { count: number; totalLevel: number }> = {};
    result.data.forEach((reading) => {
      if (!academyStats[reading.academyId]) {
        academyStats[reading.academyId] = { count: 0, totalLevel: 0 };
      }
      academyStats[reading.academyId].count++;
      academyStats[reading.academyId].totalLevel += reading.batteryLevel;
    });

    const academyStatsWithAvg = Object.entries(academyStats).reduce(
      (acc, [academyId, stats]) => {
        acc[Number(academyId)] = {
          count: stats.count,
          avgLevel: stats.totalLevel / stats.count
        };
        return acc;
      },
      {} as Record<number, { count: number; avgLevel: number }>
    );

    return {
      totalDevices: uniqueDevices.size,
      averageBatteryLevel: totalBatteryLevel / result.data.length,
      lowBatteryCount,
      criticalBatteryCount,
      academyStats: academyStatsWithAvg
    };
  }

  /**
   * Fetches data for a specific device
   */
  static async fetchDeviceData(
    serialNumber: string,
    options: FetchOptions = {}
  ): Promise<BatteryReading[]> {
    const result = await this.fetchBatteryData({
      ...options,
      limit: 1000 // Get more data for device-specific queries
    });

    return result.data.filter((reading) => reading.serialNumber === serialNumber);
  }

  /**
   * Fetches latest readings for all devices
   */
  static async fetchLatestReadings(limit: number = 50): Promise<BatteryReading[]> {
    const result = await this.fetchBatteryData({ limit: 10000 });

    // Group by device and get latest reading for each
    const deviceMap = new Map<string, BatteryReading>();
    result.data.forEach((reading) => {
      const existing = deviceMap.get(reading.serialNumber);
      if (!existing || new Date(reading.timestamp) > new Date(existing.timestamp)) {
        deviceMap.set(reading.serialNumber, reading);
      }
    });

    // Sort by timestamp (newest first) and limit results
    return Array.from(deviceMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Validates battery reading data
   */
  static validateBatteryReading(reading: any): reading is BatteryReading {
    return (
      reading !== null &&
      reading !== undefined &&
      typeof reading === 'object' &&
      typeof reading.academyId === 'number' &&
      typeof reading.batteryLevel === 'number' &&
      typeof reading.employeeId === 'string' &&
      typeof reading.serialNumber === 'string' &&
      typeof reading.timestamp === 'string' &&
      reading.batteryLevel >= 0 &&
      reading.batteryLevel <= 1
    );
  }

  /**
   * Filters and validates battery data
   */
  static sanitizeBatteryData(data: any[]): BatteryReading[] {
    return data.filter(this.validateBatteryReading);
  }

  /**
   * Fallback data in case JSON loading fails
   */
  private static getFallbackData(): BatteryReading[] {
    return [
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
      },
      {
        academyId: 30006,
        batteryLevel: 0.98,
        employeeId: 'T1008250',
        serialNumber: '1805C67HD02009',
        timestamp: '2019-05-17T07:50:35.158+01:00'
      }
    ];
  }
}
