interface PipelineStep {
  id: string;
  type: 'filter' | 'transform' | 'aggregate' | 'join' | 'sort' | 'dedupe' | 'enrich';
  name: string;
  config: any;
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
  createdAt: Date;
  updatedAt: Date;
}

// Execute a data pipeline
export async function executePipeline(pipeline: Pipeline, inputData: any[]): Promise<any[]> {
  let data = [...inputData];

  console.log(`[Pipeline] Executing pipeline "${pipeline.name}" with ${data.length} records`);

  for (const step of pipeline.steps) {
    console.log(`[Pipeline] Step: ${step.name} (${step.type})`);

    switch (step.type) {
      case 'filter':
        data = filterStep(data, step.config);
        break;

      case 'transform':
        data = transformStep(data, step.config);
        break;

      case 'aggregate':
        data = aggregateStep(data, step.config);
        break;

      case 'join':
        data = await joinStep(data, step.config);
        break;

      case 'sort':
        data = sortStep(data, step.config);
        break;

      case 'dedupe':
        data = dedupeStep(data, step.config);
        break;

      case 'enrich':
        data = await enrichStep(data, step.config);
        break;

      default:
        console.warn(`[Pipeline] Unknown step type: ${step.type}`);
    }

    console.log(`[Pipeline] After ${step.name}: ${data.length} records`);
  }

  return data;
}

// Filter step
function filterStep(data: any[], config: { field: string; operator: string; value: any }): any[] {
  return data.filter(record => {
    const fieldValue = record[config.field];

    switch (config.operator) {
      case 'equals':
        return fieldValue === config.value;
      case 'not_equals':
        return fieldValue !== config.value;
      case 'contains':
        return String(fieldValue).includes(config.value);
      case 'greater_than':
        return fieldValue > config.value;
      case 'less_than':
        return fieldValue < config.value;
      case 'in':
        return Array.isArray(config.value) && config.value.includes(fieldValue);
      case 'not_null':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return true;
    }
  });
}

// Transform step
function transformStep(data: any[], config: { field: string; transformation: string; params?: any }): any[] {
  return data.map(record => {
    const value = record[config.field];
    let transformed;

    switch (config.transformation) {
      case 'uppercase':
        transformed = String(value).toUpperCase();
        break;

      case 'lowercase':
        transformed = String(value).toLowerCase();
        break;

      case 'trim':
        transformed = String(value).trim();
        break;

      case 'replace':
        transformed = String(value).replace(config.params.from, config.params.to);
        break;

      case 'substring':
        transformed = String(value).substring(config.params.start, config.params.end);
        break;

      case 'parse_number':
        transformed = parseFloat(value);
        break;

      case 'parse_date':
        transformed = new Date(value);
        break;

      case 'concat':
        transformed = config.params.fields.map((f: string) => record[f]).join(config.params.separator || '');
        break;

      case 'multiply':
        transformed = parseFloat(value) * config.params.factor;
        break;

      case 'round':
        transformed = Math.round(parseFloat(value) * Math.pow(10, config.params.decimals || 0)) / Math.pow(10, config.params.decimals || 0);
        break;

      default:
        transformed = value;
    }

    return {
      ...record,
      [config.params?.outputField || config.field]: transformed
    };
  });
}

// Aggregate step
function aggregateStep(data: any[], config: { groupBy: string[]; aggregations: Array<{ field: string; operation: string; outputField: string }> }): any[] {
  const groups = new Map<string, any[]>();

  // Group data
  data.forEach(record => {
    const key = config.groupBy.map(field => record[field]).join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  });

  // Aggregate each group
  const result: any[] = [];

  groups.forEach((groupRecords, key) => {
    const aggregated: any = {};

    // Add group by fields
    config.groupBy.forEach((field, index) => {
      aggregated[field] = key.split('|')[index];
    });

    // Perform aggregations
    config.aggregations.forEach(agg => {
      const values = groupRecords.map(r => parseFloat(r[agg.field])).filter(v => !isNaN(v));

      switch (agg.operation) {
        case 'sum':
          aggregated[agg.outputField] = values.reduce((a, b) => a + b, 0);
          break;

        case 'avg':
          aggregated[agg.outputField] = values.reduce((a, b) => a + b, 0) / values.length;
          break;

        case 'min':
          aggregated[agg.outputField] = Math.min(...values);
          break;

        case 'max':
          aggregated[agg.outputField] = Math.max(...values);
          break;

        case 'count':
          aggregated[agg.outputField] = groupRecords.length;
          break;

        case 'count_distinct':
          aggregated[agg.outputField] = new Set(groupRecords.map(r => r[agg.field])).size;
          break;

        default:
          aggregated[agg.outputField] = null;
      }
    });

    result.push(aggregated);
  });

  return result;
}

// Join step
async function joinStep(data: any[], config: { sourceField: string; targetData: any[]; targetField: string; joinType: 'inner' | 'left' }): Promise<any[]> {
  const targetMap = new Map();

  config.targetData.forEach(record => {
    targetMap.set(record[config.targetField], record);
  });

  if (config.joinType === 'inner') {
    return data
      .filter(record => targetMap.has(record[config.sourceField]))
      .map(record => ({
        ...record,
        ...targetMap.get(record[config.sourceField])
      }));
  } else {
    // Left join
    return data.map(record => ({
      ...record,
      ...(targetMap.get(record[config.sourceField]) || {})
    }));
  }
}

// Sort step
function sortStep(data: any[], config: { field: string; direction: 'asc' | 'desc' }): any[] {
  return [...data].sort((a, b) => {
    const aVal = a[config.field];
    const bVal = b[config.field];

    if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Dedupe step
function dedupeStep(data: any[], config: { fields?: string[] }): any[] {
  const seen = new Set<string>();

  return data.filter(record => {
    const key = config.fields
      ? config.fields.map(f => record[f]).join('|')
      : JSON.stringify(record);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

// Enrich step (add external data)
async function enrichStep(data: any[], config: { enrichmentType: string; params: any }): Promise<any[]> {
  switch (config.enrichmentType) {
    case 'timestamp':
      return data.map(record => ({
        ...record,
        [config.params.field || 'enriched_at']: new Date().toISOString()
      }));

    case 'hash':
      return data.map(record => {
        const crypto = require('crypto');
        const hash = crypto
          .createHash('sha256')
          .update(JSON.stringify(record[config.params.field]))
          .digest('hex');

        return {
          ...record,
          [config.params.outputField || 'hash']: hash
        };
      });

    case 'sequence':
      return data.map((record, index) => ({
        ...record,
        [config.params.field || 'sequence']: index + 1
      }));

    default:
      return data;
  }
}

// Visual pipeline builder schemas
export const PipelineTemplates = {
  dataQuality: {
    name: 'Data Quality Pipeline',
    description: 'Clean and validate data',
    steps: [
      {
        id: '1',
        type: 'filter',
        name: 'Remove Nulls',
        config: { field: 'value', operator: 'not_null' }
      },
      {
        id: '2',
        type: 'dedupe',
        name: 'Remove Duplicates',
        config: {}
      },
      {
        id: '3',
        type: 'transform',
        name: 'Trim Strings',
        config: { field: 'name', transformation: 'trim' }
      }
    ]
  },

  aggregation: {
    name: 'Aggregation Pipeline',
    description: 'Group and summarize data',
    steps: [
      {
        id: '1',
        type: 'aggregate',
        name: 'Group by Category',
        config: {
          groupBy: ['category'],
          aggregations: [
            { field: 'value', operation: 'sum', outputField: 'total' },
            { field: 'value', operation: 'avg', outputField: 'average' },
            { field: 'id', operation: 'count', outputField: 'count' }
          ]
        }
      },
      {
        id: '2',
        type: 'sort',
        name: 'Sort by Total',
        config: { field: 'total', direction: 'desc' }
      }
    ]
  },

  transformation: {
    name: 'Transformation Pipeline',
    description: 'Transform and enrich data',
    steps: [
      {
        id: '1',
        type: 'transform',
        name: 'Parse Numbers',
        config: { field: 'value', transformation: 'parse_number' }
      },
      {
        id: '2',
        type: 'transform',
        name: 'Multiply by 100',
        config: { field: 'value', transformation: 'multiply', params: { factor: 100 } }
      },
      {
        id: '3',
        type: 'enrich',
        name: 'Add Timestamp',
        config: { enrichmentType: 'timestamp', params: {} }
      }
    ]
  }
};

// Save/load pipelines to database (mock implementation)
export const PipelineStorage = {
  async save(pipeline: Pipeline): Promise<string> {
    console.log('[Pipeline] Saving pipeline:', pipeline.name);
    return pipeline.id;
  },

  async load(id: string): Promise<Pipeline | null> {
    console.log('[Pipeline] Loading pipeline:', id);
    return null;
  },

  async list(): Promise<Pipeline[]> {
    console.log('[Pipeline] Listing pipelines');
    return [];
  },

  async delete(id: string): Promise<boolean> {
    console.log('[Pipeline] Deleting pipeline:', id);
    return true;
  }
};
