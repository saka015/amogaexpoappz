import { registerForPushNotificationsAsync } from "@/lib/registerForPushNotificationsAsync";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Crypto from "expo-crypto";
import { EventSubscription } from "expo-notifications";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./supabase-provider";
import { useRouter } from "expo-router";

const LAST_SENT_TOKEN_KEY = "last_sent_push_token_hash";

interface NotificationContextType {
    expoPushToken: string | null;
    notification: Notifications.Notification | null;
    error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error(
            "useNotification must be used within a NotificationProvider"
        );
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
}

function getDeviceName() {
    if (Platform.OS === "web") return "Web Browser";
    if (Device.deviceName) return Device.deviceName;
    return `${Device.manufacturer} ${Device.modelName}`;
}

async function generateDeviceId() {
    const raw = `${Device.osName}-${Device.osVersion}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
}

async function hashTokenData(token: string, deviceId: string) {
    const raw = `${token}:${deviceId}`;
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
}

async function storeSentTokenHash(token: string, deviceId: string) {
    const hash = await hashTokenData(token, deviceId);
    await AsyncStorage.setItem(LAST_SENT_TOKEN_KEY, hash);
}

async function shouldSendToken(token: string, deviceId: string): Promise<boolean> {
    const currentHash = await hashTokenData(token, deviceId);
    const storedHash = await AsyncStorage.getItem(LAST_SENT_TOKEN_KEY);
    return currentHash !== storedHash;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
    children,
}) => {
    const { userCatalog } = useAuth()
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] =
        useState<Notifications.Notification | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const router = useRouter()

    const notificationListener = useRef<EventSubscription>(null);
    const responseListener = useRef<EventSubscription>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const token = await registerForPushNotificationsAsync();
                if (mounted) setExpoPushToken(token);
            } catch (err) {
                if (mounted) setError(err as Error);
            }
        })();

        notificationListener.current =
            Notifications.addNotificationReceivedListener((notification) => {
                console.log("🔔 Notification Received: ", notification);
                setNotification(notification);
            });

        responseListener.current =
            Notifications.addNotificationResponseReceivedListener((response) => {
                console.log(
                    "🔔 Notification Response: ",
                    JSON.stringify(response, null, 2),
                    JSON.stringify(response.notification.request.content.data, null, 2)
                );
                const path = response.notification.request.content.data?.path;
                if (path) {
                    router.push(path as any);
                }
            });

        return () => {
            mounted = false;
            if (notificationListener.current) {
                // Notifications.removeNotificationSubscription(
                //     notificationListener.current
                // );
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                // Notifications.removeNotificationSubscription(responseListener.current);
                responseListener.current.remove()
            }
        };
    }, []);

    useEffect(() => {
        if (Platform.OS === "web") return
        (async () => {
            const response = await Notifications.getLastNotificationResponseAsync();
            const path = response?.notification.request.content.data?.path;
            console.log("checkInitialNotification", path);
            if (path) router.push(path as any);
        })();
    }, []);

    useEffect(() => {
        if (!expoPushToken || !userCatalog || !userCatalog.user_catalog_id) return

        let isSending = false;

        const register = async () => {
            if (isSending) return;
            isSending = true;

            try {
                const device_id = await generateDeviceId();
                const device_name = getDeviceName();
                const platform = Platform.OS;

                const shouldSend = await shouldSendToken(expoPushToken, device_id);
                if (!shouldSend) {
                    console.log("✅ Push token already sent, skipping.");
                    return;
                }

                const res = await fetch("/api/push-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: userCatalog.user_catalog_id,
                        device_id,
                        push_token: expoPushToken,
                        device_name,
                        platform,
                    }),
                });

                if (!res.ok) {
                    console.error("Failed to send push token to server", await res.text());
                } else {
                    console.log("✅ Push token sent");
                    await storeSentTokenHash(expoPushToken, device_id);
                }
            } finally {
                isSending = false;
            }
        };

        register()
    }, [expoPushToken, userCatalog?.user_catalog_id])

    // console.log("expoPushToken",expoPushToken)
    return (
        <NotificationContext.Provider
            value={{ expoPushToken, notification, error }}
        >
            {children}
        </NotificationContext.Provider>
    );
};