const NOTIFICATIONS_KEY = "app_notifications";
const NOTIFICATIONS_EVENT = "app-notifications-updated";

const safeParseNotifications = (rawValue) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const getAppNotifications = () =>
  safeParseNotifications(window.localStorage.getItem(NOTIFICATIONS_KEY));

const persistNotifications = (notifications) => {
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT, { detail: notifications }));
};

export const addAppNotification = ({ title, message, type = "info" }) => {
  const notifications = getAppNotifications();
  const nextNotifications = [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: title || "Thông báo",
      message: message || "",
      type,
      createdAt: new Date().toISOString(),
    },
    ...notifications,
  ].slice(0, 5);

  persistNotifications(nextNotifications);
};

export const removeAppNotification = (notificationId) => {
  const notifications = getAppNotifications().filter((item) => item.id !== notificationId);
  persistNotifications(notifications);
};

export const clearAppNotifications = () => {
  persistNotifications([]);
};

export const APP_NOTIFICATIONS_EVENT = NOTIFICATIONS_EVENT;
