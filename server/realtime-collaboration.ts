import { getIO, broadcastEvent, WebSocketEvents } from './websocket';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  currentPage?: string;
  lastActive: Date;
}

interface PresenceData {
  userId: string;
  page: string;
  cursor?: { x: number; y: number };
  selection?: { queryId?: number; dashboardId?: number };
}

interface CollaborativeEdit {
  documentId: string;
  documentType: 'query' | 'dashboard' | 'scraper';
  userId: string;
  edits: Array<{
    timestamp: Date;
    type: 'insert' | 'delete' | 'update';
    path: string;
    value: any;
  }>;
}

// Active users registry
const activeUsers = new Map<string, User>();
const userPresence = new Map<string, PresenceData>();
const documentLocks = new Map<string, { userId: string; lockedAt: Date }>();

// User presence management
export class PresenceManager {
  // User joins
  static userJoined(user: User) {
    activeUsers.set(user.id, {
      ...user,
      status: 'online',
      lastActive: new Date()
    });

    // Broadcast to all clients
    broadcastEvent(WebSocketEvents.ACTIVITY_CREATED, {
      type: 'user_joined',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    console.log(`[Presence] User joined: ${user.email}`);

    return this.getActiveUsers();
  }

  // User left
  static userLeft(userId: string) {
    const user = activeUsers.get(userId);

    if (user) {
      user.status = 'offline';
      activeUsers.delete(userId);
      userPresence.delete(userId);

      // Release any locks
      documentLocks.forEach((lock, docId) => {
        if (lock.userId === userId) {
          documentLocks.delete(docId);
        }
      });

      broadcastEvent(WebSocketEvents.ACTIVITY_CREATED, {
        type: 'user_left',
        user: {
          id: user.id,
          email: user.email
        }
      });

      console.log(`[Presence] User left: ${user.email}`);
    }
  }

  // Update user presence
  static updatePresence(userId: string, data: Partial<PresenceData>) {
    const existingPresence = userPresence.get(userId) || {
      userId,
      page: '/',
    };

    const updatedPresence = {
      ...existingPresence,
      ...data
    };

    userPresence.set(userId, updatedPresence);

    // Update last active
    const user = activeUsers.get(userId);
    if (user) {
      user.lastActive = new Date();
      user.currentPage = data.page || user.currentPage;
    }

    // Broadcast presence update to users on the same page
    const io = getIO();
    io.to(`page:${updatedPresence.page}`).emit('presence:updated', {
      userId,
      presence: updatedPresence
    });
  }

  // Get active users
  static getActiveUsers(): User[] {
    return Array.from(activeUsers.values());
  }

  // Get users on a specific page
  static getUsersOnPage(page: string): User[] {
    return Array.from(activeUsers.values()).filter(
      user => user.currentPage === page && user.status === 'online'
    );
  }

  // Get presence for a user
  static getUserPresence(userId: string): PresenceData | null {
    return userPresence.get(userId) || null;
  }

  // Set user status
  static setUserStatus(userId: string, status: 'online' | 'away' | 'offline') {
    const user = activeUsers.get(userId);
    if (user) {
      user.status = status;
      broadcastEvent(WebSocketEvents.ACTIVITY_CREATED, {
        type: 'user_status_changed',
        userId,
        status
      });
    }
  }
}

// Document collaboration
export class CollaborationManager {
  // Lock a document for editing
  static lockDocument(documentId: string, userId: string): boolean {
    const existing = documentLocks.get(documentId);

    if (existing) {
      // Check if lock is stale (>5 minutes)
      const now = Date.now();
      const lockAge = now - existing.lockedAt.getTime();

      if (lockAge > 5 * 60 * 1000) {
        // Lock is stale, can be acquired
        documentLocks.set(documentId, { userId, lockedAt: new Date() });
        return true;
      }

      return existing.userId === userId;
    }

    documentLocks.set(documentId, { userId, lockedAt: new Date() });

    // Notify others
    const io = getIO();
    io.emit('document:locked', {
      documentId,
      userId,
      lockedAt: new Date()
    });

    console.log(`[Collaboration] Document ${documentId} locked by ${userId}`);
    return true;
  }

  // Unlock a document
  static unlockDocument(documentId: string, userId: string): boolean {
    const lock = documentLocks.get(documentId);

    if (!lock || lock.userId !== userId) {
      return false;
    }

    documentLocks.delete(documentId);

    // Notify others
    const io = getIO();
    io.emit('document:unlocked', {
      documentId,
      userId
    });

    console.log(`[Collaboration] Document ${documentId} unlocked by ${userId}`);
    return true;
  }

  // Check if document is locked
  static isDocumentLocked(documentId: string): { locked: boolean; userId?: string } {
    const lock = documentLocks.get(documentId);

    if (!lock) {
      return { locked: false };
    }

    // Check if lock is stale
    const now = Date.now();
    const lockAge = now - lock.lockedAt.getTime();

    if (lockAge > 5 * 60 * 1000) {
      documentLocks.delete(documentId);
      return { locked: false };
    }

    return { locked: true, userId: lock.userId };
  }

  // Broadcast collaborative edit
  static broadcastEdit(documentId: string, edit: CollaborativeEdit) {
    const io = getIO();
    io.to(`document:${documentId}`).emit('document:edit', edit);
  }

  // Get document locks
  static getDocumentLocks(): Map<string, { userId: string; lockedAt: Date }> {
    return new Map(documentLocks);
  }
}

// Collaborative cursors
export class CursorManager {
  private static cursors = new Map<string, { x: number; y: number; page: string }>();

  // Update cursor position
  static updateCursor(userId: string, x: number, y: number, page: string) {
    this.cursors.set(userId, { x, y, page });

    // Broadcast to users on the same page
    const io = getIO();
    io.to(`page:${page}`).emit('cursor:moved', {
      userId,
      x,
      y
    });
  }

  // Get cursors on a page
  static getCursorsOnPage(page: string): Array<{ userId: string; x: number; y: number }> {
    const result: Array<{ userId: string; x: number; y: number }> = [];

    this.cursors.forEach((cursor, userId) => {
      if (cursor.page === page) {
        result.push({ userId, x: cursor.x, y: cursor.y });
      }
    });

    return result;
  }

  // Remove cursor
  static removeCursor(userId: string) {
    this.cursors.delete(userId);

    // Broadcast to all
    const io = getIO();
    io.emit('cursor:removed', { userId });
  }
}

// Live comments/annotations
export class CommentManager {
  private static comments = new Map<string, Array<{
    id: string;
    userId: string;
    text: string;
    position?: { x: number; y: number };
    timestamp: Date;
    resolved: boolean;
  }>>();

  // Add comment to a document
  static addComment(
    documentId: string,
    userId: string,
    text: string,
    position?: { x: number; y: number }
  ): string {
    const commentId = `comment_${Date.now()}_${Math.random()}`;
    const comment = {
      id: commentId,
      userId,
      text,
      position,
      timestamp: new Date(),
      resolved: false
    };

    if (!this.comments.has(documentId)) {
      this.comments.set(documentId, []);
    }

    this.comments.get(documentId)!.push(comment);

    // Broadcast to document viewers
    const io = getIO();
    io.to(`document:${documentId}`).emit('comment:added', {
      documentId,
      comment
    });

    console.log(`[Comments] Comment added to ${documentId} by ${userId}`);
    return commentId;
  }

  // Resolve a comment
  static resolveComment(documentId: string, commentId: string, userId: string): boolean {
    const comments = this.comments.get(documentId);

    if (!comments) {
      return false;
    }

    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
      return false;
    }

    comment.resolved = true;

    // Broadcast
    const io = getIO();
    io.to(`document:${documentId}`).emit('comment:resolved', {
      documentId,
      commentId,
      userId
    });

    return true;
  }

  // Get comments for a document
  static getComments(documentId: string) {
    return this.comments.get(documentId) || [];
  }
}

// Activity feed
export class ActivityFeedManager {
  private static activities: Array<{
    id: string;
    userId: string;
    type: string;
    description: string;
    timestamp: Date;
    metadata?: any;
  }> = [];

  static addActivity(
    userId: string,
    type: string,
    description: string,
    metadata?: any
  ) {
    const activity = {
      id: `activity_${Date.now()}`,
      userId,
      type,
      description,
      timestamp: new Date(),
      metadata
    };

    this.activities.unshift(activity);

    // Keep only last 100 activities
    if (this.activities.length > 100) {
      this.activities = this.activities.slice(0, 100);
    }

    // Broadcast
    broadcastEvent(WebSocketEvents.ACTIVITY_CREATED, activity);

    return activity;
  }

  static getRecentActivities(limit: number = 20) {
    return this.activities.slice(0, limit);
  }
}

// Session manager for tracking user sessions
export class SessionManager {
  private static sessions = new Map<string, {
    userId: string;
    startTime: Date;
    lastActivity: Date;
    pageViews: number;
    actions: number;
  }>();

  static startSession(userId: string, sessionId: string) {
    this.sessions.set(sessionId, {
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      actions: 0
    });
  }

  static updateSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      session.actions++;
    }
  }

  static endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      const duration = Date.now() - session.startTime.getTime();
      console.log(`[Session] Session ${sessionId} ended. Duration: ${duration}ms, Actions: ${session.actions}`);
      this.sessions.delete(sessionId);
    }
  }

  static getActiveSessionCount(): number {
    return this.sessions.size;
  }

  static getSessionStats() {
    const sessions = Array.from(this.sessions.values());

    return {
      active: sessions.length,
      avgActions: sessions.reduce((sum, s) => sum + s.actions, 0) / sessions.length || 0,
      avgDuration: sessions.reduce((sum, s) => Date.now() - s.startTime.getTime(), 0) / sessions.length || 0
    };
  }
}
