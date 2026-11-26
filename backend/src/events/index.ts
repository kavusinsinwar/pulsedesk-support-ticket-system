import { eventBus } from './eventBus';
import { registerActivityLogSubscribers } from './subscribers/activityLog.subscriber';
import { registerNotificationSubscribers } from './subscribers/notification.subscriber';
import { registerRealtimeSubscribers } from './subscribers/realtime.subscriber';

let initialized = false;

export function initializeEventSubscribers(): void {
  if (initialized) return;
  registerActivityLogSubscribers();
  registerNotificationSubscribers();
  registerRealtimeSubscribers();
  initialized = true;
}

export function resetEventSubscribers(): void {
  eventBus.clearAllListeners();
  initialized = false;
}
