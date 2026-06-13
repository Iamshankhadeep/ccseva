import { Notification } from 'electron';
import type { MenuBarData } from '../types/usage.js';

export class NotificationService {
  private static instance: NotificationService;
  private lastNotificationTime = 0;
  private readonly NOTIFICATION_COOLDOWN = 300000; // 5 minutes
  private lastWarningLevel: 'safe' | 'warning' | 'critical' = 'safe';
  private lastNotificationData = '';
  private notificationInProgress = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  checkAndNotify(data: MenuBarData, source: 'auto' | 'manual' = 'auto'): void {
    const now = Date.now();
    const timeSinceLastNotification = now - this.lastNotificationTime;

    // Create a unique identifier for this data state
    const dataIdentifier = `${data.status}-${Math.round(data.percentageUsed)}-${data.tokensUsed}`;

    // Prevent duplicate notifications for the same data
    if (this.lastNotificationData === dataIdentifier || this.notificationInProgress) {
      return;
    }

    // Only notify if enough time has passed and status has worsened
    if (timeSinceLastNotification < this.NOTIFICATION_COOLDOWN) {
      return;
    }

    // Check if we should send a notification
    let shouldNotify = false;
    let title = '';
    let body = '';

    if (data.status === 'critical' && this.lastWarningLevel !== 'critical') {
      shouldNotify = true;
      title = '🚨 CCSeva: Usage Critical';
      body = `You've used ${Math.round(data.percentageUsed)}% of your tokens. Consider upgrading your plan.`;
    } else if (data.status === 'warning' && this.lastWarningLevel === 'safe') {
      shouldNotify = true;
      title = '⚠️ CCSeva: Usage Warning';
      body = `You've used ${Math.round(data.percentageUsed)}% of your tokens. Monitor your usage carefully.`;
    }

    if (shouldNotify) {
      this.notificationInProgress = true;
      this.sendNotification(title, body);
      this.lastNotificationTime = now;
      this.lastWarningLevel = data.status;
      this.lastNotificationData = dataIdentifier;

      // Reset notification lock after a short delay
      setTimeout(() => {
        this.notificationInProgress = false;
      }, 1000);
    }
  }

  private sendNotification(title: string, body: string): void {
    try {
      if (Notification.isSupported()) {
        new Notification({
          title,
          body,
          silent: false,
        }).show();
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
