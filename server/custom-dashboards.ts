export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'table' | 'text' | 'iframe' | 'map' | 'gauge';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: any;
  dataSource?: {
    type: 'query' | 'api' | 'static';
    queryId?: number;
    endpoint?: string;
    data?: any;
  };
  refreshInterval?: number; // seconds
}

export interface CustomDashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'free' | 'masonry';
  theme: 'light' | 'dark' | 'auto';
  filters: Array<{
    id: string;
    type: 'date' | 'select' | 'multiselect' | 'range';
    label: string;
    defaultValue?: any;
  }>;
  permissions: {
    owner: string;
    editors: string[];
    viewers: string[];
    public: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const dashboards = new Map<string, CustomDashboard>();

export function createDashboard(dashboard: Omit<CustomDashboard, 'id' | 'createdAt' | 'updatedAt'>): string {
  const id = `dashboard_${Date.now()}`;

  dashboards.set(id, {
    ...dashboard,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return id;
}

export function updateDashboard(id: string, updates: Partial<CustomDashboard>): boolean {
  const dashboard = dashboards.get(id);

  if (!dashboard) return false;

  Object.assign(dashboard, updates, { updatedAt: new Date() });
  return true;
}

export function getDashboard(id: string): CustomDashboard | null {
  return dashboards.get(id) || null;
}

export function deleteDashboard(id: string): boolean {
  return dashboards.delete(id);
}

export function listDashboards(userId: string): CustomDashboard[] {
  return Array.from(dashboards.values()).filter(
    d => d.permissions.owner === userId ||
         d.permissions.editors.includes(userId) ||
         d.permissions.viewers.includes(userId) ||
         d.permissions.public
  );
}

// Widget templates
export const WidgetTemplates = {
  lineChart: {
    type: 'chart',
    config: {
      chartType: 'line',
      xAxis: 'date',
      yAxis: 'value',
      colors: ['#FFD700', '#00D9FF'],
    },
  },

  statCard: {
    type: 'stat',
    config: {
      format: 'number',
      prefix: '',
      suffix: '',
      trend: true,
    },
  },

  dataTable: {
    type: 'table',
    config: {
      pageSize: 10,
      sortable: true,
      filterable: true,
      exportable: true,
    },
  },

  map: {
    type: 'map',
    config: {
      center: [0, 0],
      zoom: 2,
      markers: [],
    },
  },

  gaugeChart: {
    type: 'gauge',
    config: {
      min: 0,
      max: 100,
      thresholds: [
        { value: 30, color: '#ef4444' },
        { value: 70, color: '#f59e0b' },
        { value: 100, color: '#10b981' },
      ],
    },
  },
};

// Dashboard themes
export const DashboardThemes = {
  professional: {
    background: '#1a1a2e',
    card: '#2d2d44',
    text: '#ffffff',
    accent: '#FFD700',
    border: 'rgba(255, 215, 0, 0.2)',
  },

  minimal: {
    background: '#ffffff',
    card: '#f8f9fa',
    text: '#000000',
    accent: '#000000',
    border: '#e0e0e0',
  },

  vibrant: {
    background: '#0f0f23',
    card: '#1a1a3e',
    text: '#ffffff',
    accent: '#00D9FF',
    border: 'rgba(0, 217, 255, 0.3)',
  },
};

// Export/Import dashboards
export function exportDashboard(id: string): string {
  const dashboard = dashboards.get(id);

  if (!dashboard) {
    throw new Error('Dashboard not found');
  }

  return JSON.stringify(dashboard, null, 2);
}

export function importDashboard(json: string, userId: string): string {
  const dashboard = JSON.parse(json);

  // Reset IDs and ownership
  const newId = createDashboard({
    ...dashboard,
    permissions: {
      ...dashboard.permissions,
      owner: userId,
    },
  });

  return newId;
}

// Dashboard sharing
export function shareDashboard(id: string, users: string[], permission: 'view' | 'edit'): boolean {
  const dashboard = dashboards.get(id);

  if (!dashboard) return false;

  if (permission === 'edit') {
    dashboard.permissions.editors.push(...users);
  } else {
    dashboard.permissions.viewers.push(...users);
  }

  return true;
}

// Dashboard cloning
export function cloneDashboard(id: string, newName: string, userId: string): string {
  const original = dashboards.get(id);

  if (!original) {
    throw new Error('Dashboard not found');
  }

  return createDashboard({
    ...original,
    name: newName,
    permissions: {
      owner: userId,
      editors: [],
      viewers: [],
      public: false,
    },
  });
}
