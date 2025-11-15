import { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch recent activities to populate notifications
  const { data: activities } = useQuery({
    queryKey: ['/api/activities'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  useEffect(() => {
    if (activities) {
      // Convert activities to notifications
      const newNotifications: Notification[] = (activities as any[]).slice(0, 10).map((activity: any) => ({
        id: activity.id.toString(),
        type: activity.status === 'success' ? 'success' : activity.status === 'error' ? 'error' : 'info',
        title: activity.type.charAt(0).toUpperCase() + activity.type.slice(1),
        message: activity.message,
        timestamp: new Date(activity.createdAt),
        read: false,
      }));
      setNotifications(newNotifications);
    }
  }, [activities]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#F5F5DC]/70 hover:text-[#FFD700] hover:bg-[#3B2F2F]/30 rounded transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD700] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-[#FFD700] text-[#0D0D0D] text-xs items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-[90]"
          />

          {/* Panel */}
          <div className="fixed top-16 right-4 w-96 max-h-[80vh] z-[91] bg-[#0D0D0D]/95 border-2 border-[#FFD700]/30 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-top-5 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#3B2F2F]/50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#FFD700]" />
                <h3 className="font-semibold text-[#F5F5DC]">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-[#FFD700]/20 text-[#FFD700] text-xs rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#FFD700] hover:text-[#E6C200] transition-colors"
                    title="Mark all as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#F5F5DC]/50 hover:text-[#FFD700] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[calc(80vh-8rem)]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="bg-[#FFD700]/10 p-4 rounded-full mb-3">
                    <Bell className="w-8 h-8 text-[#FFD700]/50" />
                  </div>
                  <p className="text-[#F5F5DC]/60 text-sm text-center">
                    No notifications yet
                  </p>
                  <p className="text-[#F5F5DC]/40 text-xs text-center mt-1">
                    We'll notify you when something happens
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#3B2F2F]/30">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-[#3B2F2F]/20 transition-colors ${
                        !notification.read ? 'bg-[#FFD700]/5' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {icons[notification.type]}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-medium text-[#F5F5DC] text-sm">
                                {notification.title}
                              </div>
                              <p className="text-[#F5F5DC]/70 text-sm mt-1">
                                {notification.message}
                              </p>
                              <p className="text-[#F5F5DC]/40 text-xs mt-2">
                                {formatTimestamp(notification.timestamp)}
                              </p>

                              {/* Action */}
                              {notification.action && (
                                <button
                                  onClick={notification.action.onClick}
                                  className="mt-2 text-xs text-[#FFD700] hover:text-[#E6C200] font-medium"
                                >
                                  {notification.action.label} →
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-[#FFD700]/60 hover:text-[#FFD700] transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="text-[#F5F5DC]/40 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-[#3B2F2F]/50 bg-[#0D0D0D]/80">
                <button
                  onClick={clearAll}
                  className="w-full text-center text-sm text-[#F5F5DC]/60 hover:text-[#FFD700] transition-colors"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
