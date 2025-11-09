interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicates: number;
  missingFields: Record<string, number>;
  dataTypes: Record<string, Record<string, number>>;
  outliers: Array<{ field: string; value: any; reason: string }>;
  suggestions: string[];
  score: number; // 0-100
}

interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  params?: any;
  message?: string;
}

// Validate data quality
export async function validateDataQuality(
  data: any[],
  rules?: ValidationRule[]
): Promise<DataQualityReport> {
  const report: DataQualityReport = {
    totalRecords: data.length,
    validRecords: 0,
    invalidRecords: 0,
    duplicates: 0,
    missingFields: {},
    dataTypes: {},
    outliers: [],
    suggestions: [],
    score: 0,
  };

  if (data.length === 0) {
    report.suggestions.push('No data to validate');
    return report;
  }

  const seenRecords = new Set<string>();
  const fields = Object.keys(data[0]);

  // Initialize missing fields counter
  fields.forEach(field => {
    report.missingFields[field] = 0;
    report.dataTypes[field] = {};
  });

  // Validate each record
  for (const record of data) {
    let isValid = true;

    // Check for duplicates
    const recordHash = JSON.stringify(record);
    if (seenRecords.has(recordHash)) {
      report.duplicates++;
      isValid = false;
    } else {
      seenRecords.add(recordHash);
    }

    // Check missing fields and data types
    for (const field of fields) {
      if (record[field] === null || record[field] === undefined || record[field] === '') {
        report.missingFields[field]++;
        isValid = false;
      } else {
        const type = typeof record[field];
        report.dataTypes[field][type] = (report.dataTypes[field][type] || 0) + 1;
      }
    }

    // Apply custom validation rules
    if (rules) {
      for (const rule of rules) {
        if (!validateField(record[rule.field], rule)) {
          isValid = false;
        }
      }
    }

    if (isValid) {
      report.validRecords++;
    } else {
      report.invalidRecords++;
    }
  }

  // Detect outliers for numeric fields
  for (const field of fields) {
    const numericValues = data
      .filter(r => typeof r[field] === 'number')
      .map(r => r[field]);

    if (numericValues.length > 10) {
      const outliers = detectOutliers(numericValues);
      outliers.forEach(value => {
        report.outliers.push({
          field,
          value,
          reason: 'Statistical outlier (beyond 2 standard deviations)'
        });
      });
    }
  }

  // Generate suggestions
  generateSuggestions(report, data);

  // Calculate quality score
  report.score = calculateQualityScore(report);

  return report;
}

// Validate individual field
function validateField(value: any, rule: ValidationRule): boolean {
  switch (rule.type) {
    case 'required':
      return value !== null && value !== undefined && value !== '';

    case 'type':
      return typeof value === rule.params;

    case 'range':
      if (typeof value !== 'number') return false;
      const { min, max } = rule.params;
      return value >= min && value <= max;

    case 'pattern':
      if (typeof value !== 'string') return false;
      return new RegExp(rule.params).test(value);

    case 'custom':
      return rule.params(value);

    default:
      return true;
  }
}

// Detect statistical outliers using Z-score
function detectOutliers(values: number[]): number[] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  );

  const outliers: number[] = [];
  for (const value of values) {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > 2) {
      outliers.push(value);
    }
  }

  return outliers;
}

// Generate improvement suggestions
function generateSuggestions(report: DataQualityReport, data: any[]) {
  // Check for high missing rate
  for (const [field, count] of Object.entries(report.missingFields)) {
    const missingRate = (count / report.totalRecords) * 100;
    if (missingRate > 20) {
      report.suggestions.push(
        `Field "${field}" has ${missingRate.toFixed(1)}% missing values. Consider collecting this data or making it optional.`
      );
    }
  }

  // Check for duplicates
  if (report.duplicates > 0) {
    const dupRate = (report.duplicates / report.totalRecords) * 100;
    report.suggestions.push(
      `${dupRate.toFixed(1)}% duplicate records detected. Consider implementing deduplication.`
    );
  }

  // Check for inconsistent data types
  for (const [field, types] of Object.entries(report.dataTypes)) {
    if (Object.keys(types).length > 1) {
      report.suggestions.push(
        `Field "${field}" has inconsistent data types: ${Object.keys(types).join(', ')}. Standardize the data type.`
      );
    }
  }

  // Check for outliers
  if (report.outliers.length > 0) {
    report.suggestions.push(
      `${report.outliers.length} statistical outliers detected. Review these values for data entry errors.`
    );
  }

  // Overall quality assessment
  if (report.score < 60) {
    report.suggestions.push(
      'Overall data quality is low. Consider implementing data validation at the collection stage.'
    );
  }
}

// Calculate overall quality score
function calculateQualityScore(report: DataQualityReport): number {
  if (report.totalRecords === 0) return 0;

  let score = 100;

  // Penalize for invalid records
  const invalidRate = report.invalidRecords / report.totalRecords;
  score -= invalidRate * 40;

  // Penalize for duplicates
  const dupRate = report.duplicates / report.totalRecords;
  score -= dupRate * 20;

  // Penalize for missing fields
  const avgMissingRate =
    Object.values(report.missingFields).reduce((a, b) => a + b, 0) /
    (report.totalRecords * Object.keys(report.missingFields).length);
  score -= avgMissingRate * 30;

  // Penalize for outliers
  const outlierRate = report.outliers.length / report.totalRecords;
  score -= outlierRate * 10;

  return Math.max(0, Math.round(score));
}

// Clean data based on report
export function cleanData(data: any[], options?: {
  removeDuplicates?: boolean;
  removeOutliers?: boolean;
  fillMissing?: 'mean' | 'median' | 'mode' | 'remove' | any;
}): any[] {
  let cleaned = [...data];

  // Remove duplicates
  if (options?.removeDuplicates) {
    const seen = new Set<string>();
    cleaned = cleaned.filter(record => {
      const hash = JSON.stringify(record);
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }

  // Remove or fill missing values
  if (options?.fillMissing) {
    if (options.fillMissing === 'remove') {
      cleaned = cleaned.filter(record =>
        Object.values(record).every(v => v !== null && v !== undefined && v !== '')
      );
    } else {
      // Implement fill logic for mean/median/mode
      const fields = Object.keys(cleaned[0] || {});

      for (const field of fields) {
        const values = cleaned
          .map(r => r[field])
          .filter(v => v !== null && v !== undefined && v !== '');

        if (values.length === 0) continue;

        let fillValue: any;

        if (options.fillMissing === 'mean' && values.every(v => typeof v === 'number')) {
          fillValue = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        } else if (options.fillMissing === 'mode') {
          fillValue = mode(values);
        } else if (typeof options.fillMissing !== 'string') {
          fillValue = options.fillMissing;
        }

        if (fillValue !== undefined) {
          cleaned = cleaned.map(record => ({
            ...record,
            [field]: record[field] ?? fillValue
          }));
        }
      }
    }
  }

  return cleaned;
}

// Calculate mode
function mode(arr: any[]): any {
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let modeValue: any;

  for (const value of arr) {
    const key = String(value);
    counts[key] = (counts[key] || 0) + 1;

    if (counts[key] > maxCount) {
      maxCount = counts[key];
      modeValue = value;
    }
  }

  return modeValue;
}

// Normalize data
export function normalizeData(data: any[], field: string): any[] {
  const values = data.map(r => r[field]).filter(v => typeof v === 'number');

  if (values.length === 0) return data;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return data;

  return data.map(record => ({
    ...record,
    [field]: typeof record[field] === 'number'
      ? (record[field] - min) / range
      : record[field]
  }));
}

// Standardize data (Z-score)
export function standardizeData(data: any[], field: string): any[] {
  const values = data.map(r => r[field]).filter(v => typeof v === 'number');

  if (values.length === 0) return data;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  );

  if (stdDev === 0) return data;

  return data.map(record => ({
    ...record,
    [field]: typeof record[field] === 'number'
      ? (record[field] - mean) / stdDev
      : record[field]
  }));
}
