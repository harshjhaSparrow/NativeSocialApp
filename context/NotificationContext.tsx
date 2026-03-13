import * as Device from "expo-device";
import Constants from "expo-constants";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import * as Haptics from 'expo-haptics';
import { api, wsManager } from "../services/api";
import { Notification } from "../types";
import { useAuth } from "./AuthContext";

if (Constants.appOwnership !== "expo") {
  try {
    const Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }) as any,
    });
  } catch (e) {
    console.log("Skipped Notification handler setup", e);
  }
}

async function registerForPushNotificationsAsync() {
  let token;

  try {
    // In SDK 53, push notifications are not supported in Expo Go.
    if (Constants.appOwnership === "expo") {
      return undefined;
    }

    const Notifications = require("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        return undefined;
      }

      // Need a projectId if missing in app.json for EAS:
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } else {
      console.log("Must use physical device for Push Notifications");
    }
  } catch (e) {
    console.log("Push notification setup skipped: ", e);
  }

  return token;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  pushToken: string | null;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  addNotification: (n: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  pushToken: null,
  markRead: async () => { },
  markAllRead: async () => { },
  addNotification: () => { },
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const keepAliveRef = useRef<any>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load initial notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.notifications.get(user.uid);
      setNotifications(data);
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Register for push notifications and send token to backend
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let notificationListener: any;
    let responseListener: any;

    registerForPushNotificationsAsync().then((token) => {
      if (token && isMounted) {
        setPushToken(token);
        api.push.subscribe(user.uid, token).catch(console.error);
      }
    });

    if (Constants.appOwnership !== "expo") {
      try {
        const Notifications = require("expo-notifications");
        // Listen for foreground notifications
        notificationListener = Notifications.addNotificationReceivedListener(
          (notification: any) => {
            // Foreground Push Notification Received
          },
        );

        responseListener =
          Notifications.addNotificationResponseReceivedListener(
            (response: any) => {
              const data = response.notification.request.content.data;
              if (data && data.url) {
                // Here we might navigate using the url from the push notification payload
              }
            },
          );
      } catch (e) {
        console.log("Skipped notification listeners setup", e);
      }
    }

    return () => {
      isMounted = false;
      if (notificationListener) {
        notificationListener.remove();
      }
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          fetchNotifications();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [fetchNotifications]);

  // Real-time WebSocket subscription for incoming notifications
  useEffect(() => {
    if (!user) return;
    
    const playSound = async (type: 'message' | 'notification') => {
      try {
        const { Audio } = require('expo-av');
        const source = type === 'message' 
          ? require('../../assets/sounds/message.wav')
          : require('../../assets/sounds/notification.wav');
        const { sound } = await Audio.Sound.createAsync(source);
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) sound.unloadAsync();
        });
      } catch (e) {
        console.log("Failed to play sound", e);
      }
    };

    const unsubscribe = wsManager.subscribe(user.uid, (data: any) => {
        if (data.type === "notification" && data.notification) {
          setNotifications((prev) => {
            if (prev.find((n) => n._id === data.notification._id))
              return prev;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSound('notification');
            return [data.notification as Notification, ...prev];
          });
        } else if (data.text || data.type === 'message') {
            // Incoming message
            if (data.fromUid !== user.uid && data.fromUid !== 'system') {
               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
               playSound('message');
            }
        }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n._id) ? { ...n, read: true } : n)),
    );
    await api.notifications.markRead(ids);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.notifications.markAllRead(user.uid);
  }, [user]);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        pushToken,
        markRead,
        markAllRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
