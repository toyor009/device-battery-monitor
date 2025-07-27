import { vi } from 'vitest';

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElButton: { name: 'ElButton', template: '<button><slot /></button>' },
  ElButtonGroup: { name: 'ElButtonGroup', template: '<div><slot /></div>' },
  ElTag: { name: 'ElTag', template: '<span><slot /></span>' },
  ElAlert: { name: 'ElAlert', template: '<div><slot /></div>' },
  ElPopover: { name: 'ElPopover', template: '<div><slot /></div>' },
  ElCollapseTransition: { name: 'ElCollapseTransition', template: '<div><slot /></div>' },
  ElDivider: { name: 'ElDivider', template: '<div></div>' },
  ElLoading: { name: 'ElLoading', template: '<div></div>' }
}));

// Mock Lucide Vue icons
vi.mock('lucide-vue-next', () => ({
  RefreshCw: { name: 'RefreshCw', template: '<svg></svg>' },
  ChevronDown: { name: 'ChevronDown', template: '<svg></svg>' },
  ChevronUp: { name: 'ChevronUp', template: '<svg></svg>' },
  Info: { name: 'Info', template: '<svg></svg>' }
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error in tests unless needed
  error: vi.fn()
};
