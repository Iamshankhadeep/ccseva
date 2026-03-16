import type React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  enabled: boolean;
}

// Helper function to get the appropriate toast function
const getToastFunction = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return toast.success;
    case 'warning':
      return toast.warning;
    case 'error':
      return toast.error;
    default:
      return toast.info;
  }
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onRemove,
  enabled,
}) => {
  const { t } = useTranslation();

  // Process new notifications and show them via Sonner
  useEffect(() => {
    if (!enabled) return;

    for (const notification of notifications) {
      const toastFn = getToastFunction(notification.type);

      toastFn(notification.title, {
        description: notification.message,
        duration: 5000,
        action: {
          label: t('notifications.dismiss'),
          onClick: () => onRemove(notification.id),
        },
        onDismiss: () => onRemove(notification.id),
        onAutoClose: () => onRemove(notification.id),
      });
    }
  }, [notifications, enabled, onRemove, t]);

  if (!enabled) return null;

  // Show notification counter if there are active notifications
  return notifications.length > 0 ? (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <Badge variant="destructive" className="animate-pulse pointer-events-auto">
        {notifications.length} {t('notifications.active')}
      </Badge>
    </div>
  ) : null;
};
