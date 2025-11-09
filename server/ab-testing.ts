import crypto from 'crypto';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number; // 0-100
    config: any;
  }>;
  targetAudience?: {
    percentage?: number;
    rules?: any[];
  };
  metrics: string[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

export interface ABTestResult {
  testId: string;
  variant: string;
  userId: string;
  timestamp: Date;
  metrics: Record<string, number>;
}

const tests = new Map<string, ABTest>();
const results: ABTestResult[] = [];
const userAssignments = new Map<string, Map<string, string>>(); // userId -> testId -> variantId

export function createABTest(test: Omit<ABTest, 'id' | 'createdAt'>): string {
  const id = crypto.randomUUID();

  tests.set(id, {
    ...test,
    id,
    createdAt: new Date(),
  });

  console.log(`[A/B Testing] Created test "${test.name}"`);

  return id;
}

export function getVariantForUser(testId: string, userId: string): string | null {
  const test = tests.get(testId);

  if (!test || test.status !== 'running') {
    return null;
  }

  // Check if user already assigned
  if (!userAssignments.has(userId)) {
    userAssignments.set(userId, new Map());
  }

  const userTests = userAssignments.get(userId)!;

  if (userTests.has(testId)) {
    return userTests.get(testId)!;
  }

  // Check targeting rules
  if (test.targetAudience) {
    if (test.targetAudience.percentage) {
      const hash = hashUserId(userId);
      const userPercentile = hash % 100;

      if (userPercentile >= test.targetAudience.percentage) {
        return null; // User not in target audience
      }
    }
  }

  // Assign variant based on weights
  const variant = assignVariant(test.variants, userId);

  if (variant) {
    userTests.set(testId, variant.id);
  }

  return variant?.id || null;
}

function assignVariant(variants: ABTest['variants'], userId: string): ABTest['variants'][0] | null {
  // Weighted random selection
  const hash = hashUserId(userId);
  const random = hash % 100;

  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.weight;
    if (random < cumulative) {
      return variant;
    }
  }

  return variants[0] || null;
}

function hashUserId(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}

export function trackMetric(testId: string, userId: string, metric: string, value: number): void {
  const variant = getVariantForUser(testId, userId);

  if (!variant) return;

  results.push({
    testId,
    variant,
    userId,
    timestamp: new Date(),
    metrics: { [metric]: value },
  });
}

export function getTestResults(testId: string): {
  variants: Record<string, {
    users: number;
    metrics: Record<string, { mean: number; stdDev: number }>;
    conversionRate?: number;
  }>;
  winner?: string;
  confidence?: number;
} {
  const testResults = results.filter(r => r.testId === testId);
  const test = tests.get(testId);

  if (!test) {
    return { variants: {} };
  }

  const variantStats: any = {};

  // Group by variant
  for (const variant of test.variants) {
    const variantResults = testResults.filter(r => r.variant === variant.id);
    const users = new Set(variantResults.map(r => r.userId)).size;

    const metrics: Record<string, { mean: number; stdDev: number }> = {};

    for (const metric of test.metrics) {
      const values = variantResults
        .map(r => r.metrics[metric])
        .filter(v => v !== undefined);

      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        metrics[metric] = { mean, stdDev };
      }
    }

    variantStats[variant.id] = { users, metrics };
  }

  // Determine winner (simplified - would use proper statistical testing)
  const primaryMetric = test.metrics[0];
  let winner: string | undefined;
  let maxValue = -Infinity;

  for (const [variantId, stats] of Object.entries(variantStats)) {
    const value = (stats as any).metrics[primaryMetric]?.mean || 0;
    if (value > maxValue) {
      maxValue = value;
      winner = variantId;
    }
  }

  return {
    variants: variantStats,
    winner,
    confidence: 0.95, // Placeholder
  };
}

export function stopTest(testId: string): void {
  const test = tests.get(testId);
  if (test) {
    test.status = 'completed';
    test.endDate = new Date();
  }
}

// Multivariate testing
export interface MultivariateTest {
  id: string;
  name: string;
  factors: Array<{
    name: string;
    variants: string[];
  }>;
  combinations: Array<{
    id: string;
    config: Record<string, string>;
  }>;
}

export function createMultivariateTest(test: Omit<MultivariateTest, 'id' | 'combinations'>): string {
  const id = crypto.randomUUID();

  // Generate all combinations
  const combinations = generateCombinations(test.factors);

  const fullTest: MultivariateTest = {
    ...test,
    id,
    combinations,
  };

  console.log(`[Multivariate Testing] Created test with ${combinations.length} combinations`);

  return id;
}

function generateCombinations(factors: MultivariateTest['factors']): MultivariateTest['combinations'] {
  const combinations: MultivariateTest['combinations'] = [];

  function recurse(index: number, current: Record<string, string>) {
    if (index === factors.length) {
      combinations.push({
        id: crypto.randomUUID(),
        config: { ...current },
      });
      return;
    }

    const factor = factors[index];
    for (const variant of factor.variants) {
      recurse(index + 1, { ...current, [factor.name]: variant });
    }
  }

  recurse(0, {});

  return combinations;
}

// Feature flags
export class FeatureFlags {
  private static flags = new Map<string, {
    enabled: boolean;
    rollout?: number; // 0-100
    rules?: Array<{ condition: string; enabled: boolean }>;
  }>();

  static set(flag: string, enabled: boolean, rollout?: number): void {
    this.flags.set(flag, { enabled, rollout });
  }

  static isEnabled(flag: string, userId?: string): boolean {
    const config = this.flags.get(flag);

    if (!config) return false;
    if (!config.enabled) return false;

    if (config.rollout !== undefined && userId) {
      const hash = hashUserId(userId);
      const userPercentile = hash % 100;
      return userPercentile < config.rollout;
    }

    return config.enabled;
  }

  static getAll(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    this.flags.forEach((config, flag) => {
      result[flag] = config.enabled;
    });
    return result;
  }
}
