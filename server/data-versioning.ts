import crypto from 'crypto';

export interface DataVersion {
  id: string;
  resourceType: string;
  resourceId: string;
  version: number;
  data: any;
  changes: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  createdBy: string;
  createdAt: Date;
  comment?: string;
  tags: string[];
}

const versions = new Map<string, DataVersion[]>();

export function saveVersion(
  resourceType: string,
  resourceId: string,
  data: any,
  userId: string,
  comment?: string
): string {
  const key = `${resourceType}:${resourceId}`;
  const versionHistory = versions.get(key) || [];

  const latestVersion = versionHistory[versionHistory.length - 1];
  const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

  // Calculate changes
  const changes = latestVersion ? calculateChanges(latestVersion.data, data) : [];

  const version: DataVersion = {
    id: crypto.randomUUID(),
    resourceType,
    resourceId,
    version: newVersionNumber,
    data: JSON.parse(JSON.stringify(data)), // Deep clone
    changes,
    createdBy: userId,
    createdAt: new Date(),
    comment,
    tags: [],
  };

  versionHistory.push(version);
  versions.set(key, versionHistory);

  console.log(`[Versioning] Saved version ${newVersionNumber} for ${resourceType}:${resourceId}`);

  return version.id;
}

function calculateChanges(oldData: any, newData: any): DataVersion['changes'] {
  const changes: DataVersion['changes'] = [];

  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {}),
  ]);

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

export function getVersion(resourceType: string, resourceId: string, version: number): DataVersion | null {
  const key = `${resourceType}:${resourceId}`;
  const versionHistory = versions.get(key) || [];

  return versionHistory.find(v => v.version === version) || null;
}

export function getVersionHistory(resourceType: string, resourceId: string): DataVersion[] {
  const key = `${resourceType}:${resourceId}`;
  return versions.get(key) || [];
}

export function revertToVersion(resourceType: string, resourceId: string, version: number, userId: string): any {
  const versionData = getVersion(resourceType, resourceId, version);

  if (!versionData) {
    throw new Error(`Version ${version} not found`);
  }

  // Save current state as new version before reverting
  const key = `${resourceType}:${resourceId}`;
  const versionHistory = versions.get(key) || [];
  const currentData = versionHistory[versionHistory.length - 1]?.data;

  if (currentData) {
    saveVersion(resourceType, resourceId, currentData, userId, `Reverted to version ${version}`);
  }

  return versionData.data;
}

export function compareVersions(resourceType: string, resourceId: string, v1: number, v2: number): {
  version1: DataVersion | null;
  version2: DataVersion | null;
  differences: DataVersion['changes'];
} {
  const version1 = getVersion(resourceType, resourceId, v1);
  const version2 = getVersion(resourceType, resourceId, v2);

  const differences = version1 && version2
    ? calculateChanges(version1.data, version2.data)
    : [];

  return { version1, version2, differences };
}

export function tagVersion(resourceType: string, resourceId: string, version: number, tag: string): void {
  const versionData = getVersion(resourceType, resourceId, version);

  if (versionData && !versionData.tags.includes(tag)) {
    versionData.tags.push(tag);
  }
}

// Audit trail
export interface AuditTrail {
  id: string;
  timestamp: Date;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'read' | 'restore';
  resourceType: string;
  resourceId: string;
  versionId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

const auditTrail: AuditTrail[] = [];

export function recordAudit(audit: Omit<AuditTrail, 'id' | 'timestamp'>): string {
  const id = crypto.randomUUID();

  const record: AuditTrail = {
    id,
    timestamp: new Date(),
    ...audit,
  };

  auditTrail.push(record);

  // Keep only last 100,000 records
  if (auditTrail.length > 100000) {
    auditTrail.shift();
  }

  return id;
}

export function getAuditTrail(filters?: {
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): AuditTrail[] {
  let filtered = auditTrail;

  if (filters?.resourceType) {
    filtered = filtered.filter(a => a.resourceType === filters.resourceType);
  }

  if (filters?.resourceId) {
    filtered = filtered.filter(a => a.resourceId === filters.resourceId);
  }

  if (filters?.userId) {
    filtered = filtered.filter(a => a.userId === filters.userId);
  }

  if (filters?.action) {
    filtered = filtered.filter(a => a.action === filters.action);
  }

  if (filters?.startDate) {
    filtered = filtered.filter(a => a.timestamp >= filters.startDate!);
  }

  if (filters?.endDate) {
    filtered = filtered.filter(a => a.timestamp <= filters.endDate!);
  }

  // Sort by timestamp descending
  filtered = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

// Data snapshots for backup
export interface DataSnapshot {
  id: string;
  timestamp: Date;
  description: string;
  data: Map<string, any>;
  size: number;
  checksum: string;
}

const snapshots: DataSnapshot[] = [];

export function createSnapshot(description: string, data: Map<string, any>): string {
  const id = crypto.randomUUID();

  const serialized = JSON.stringify(Array.from(data.entries()));
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

  const snapshot: DataSnapshot = {
    id,
    timestamp: new Date(),
    description,
    data: new Map(data),
    size: serialized.length,
    checksum,
  };

  snapshots.push(snapshot);

  console.log(`[Snapshots] Created snapshot "${description}" (${snapshot.size} bytes)`);

  return id;
}

export function restoreSnapshot(snapshotId: string): Map<string, any> | null {
  const snapshot = snapshots.find(s => s.id === snapshotId);

  if (!snapshot) {
    return null;
  }

  // Verify checksum
  const serialized = JSON.stringify(Array.from(snapshot.data.entries()));
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');

  if (checksum !== snapshot.checksum) {
    console.error('[Snapshots] Checksum mismatch - data may be corrupted');
    return null;
  }

  return new Map(snapshot.data);
}

export function getSnapshots(): DataSnapshot[] {
  return snapshots.map(s => ({
    ...s,
    data: new Map(), // Don't return actual data
  }));
}
