import * as Notifications from 'expo-notifications';
import { NOTIFICATION_CONFIG } from '../constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static permissionGranted: boolean = false;

  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      this.permissionGranted = granted;
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async scheduleMonthEndReminders(): Promise<void> {
    try {
      // Cancel existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      if (!this.permissionGranted) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Get the last day of current month
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      // Schedule notifications for the last 5 days of the month
      for (let i = NOTIFICATION_CONFIG.DAYS_BEFORE_MONTH_END; i >= 1; i--) {
        const reminderDay = lastDayOfMonth - i + 1;
        const reminderDate = new Date(
          currentYear, 
          currentMonth, 
          reminderDay, 
          NOTIFICATION_CONFIG.REMINDER_HOUR, 
          0, 
          0
        );
        
        // Only schedule if the date is in the future
        if (reminderDate > now) {
          const daysLeft = i - 1;
          const dayText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '💰 Month End Reminder',
              body: `Don't forget to track your expenses! The month ends ${dayText}.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: { 
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminderDate 
            },
          });
        }
      }
      
      console.log('Month-end reminder notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  static async scheduleNextMonthReminders(): Promise<void> {
    try {
      if (!this.permissionGranted) {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return;
      }

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthYear = nextMonth.getFullYear();
      const nextMonthMonth = nextMonth.getMonth();
      
      // Get the last day of next month
      const lastDayOfNextMonth = new Date(nextMonthYear, nextMonthMonth + 1, 0).getDate();
      
      // Schedule notifications for the last 5 days of next month
      for (let i = NOTIFICATION_CONFIG.DAYS_BEFORE_MONTH_END; i >= 1; i--) {
        const reminderDay = lastDayOfNextMonth - i + 1;
        const reminderDate = new Date(
          nextMonthYear, 
          nextMonthMonth, 
          reminderDay, 
          NOTIFICATION_CONFIG.REMINDER_HOUR, 
          0, 
          0
        );
        
        const daysLeft = i - 1;
        const dayText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`;
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '💰 Month End Reminder',
            body: `Don't forget to track your expenses! The month ends ${dayText}.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate 
          },
        });
      }
      
      console.log('Next month reminder notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling next month notifications:', error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  static isPermissionGranted(): boolean {
    return this.permissionGranted;
  }
}
