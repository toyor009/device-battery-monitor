import type { BatteryReading } from '@/types/battery';

export class ExportService {
  /**
   * Exports battery data to CSV format
   */
  static exportToCSV(data: BatteryReading[], filename: string = 'battery-data.csv'): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Create CSV headers
    const headers = ['Academy ID', 'Employee ID', 'Serial Number', 'Battery Level', 'Timestamp'];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        [
          row.academyId,
          row.employeeId,
          row.serialNumber,
          (row.batteryLevel * 100).toFixed(2) + '%',
          row.timestamp
        ].join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Exports filtered data with current filters applied
   */
  static async exportFilteredData(filters: any): Promise<void> {
    try {
      // This would typically call an API endpoint that returns filtered data
      // For now, I'll use the DataService to get the data
      const { DataService } = await import('./dataService');
      const result = await DataService.fetchBatteryData({ ...filters, limit: 10000 });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `battery-data-${timestamp}.csv`;

      this.exportToCSV(result.data, filename);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  /**
   * Exports summary statistics
   */
  static exportStats(stats: any): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `battery-stats-${timestamp}.csv`;

    const csvContent = [
      'Metric,Value',
      `Total Devices,${stats.totalDevices}`,
      `Average Battery Level,${(stats.averageBatteryLevel * 100).toFixed(2)}%`,
      `Low Battery Count,${stats.lowBatteryCount}`,
      `Critical Battery Count,${stats.criticalBatteryCount}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
