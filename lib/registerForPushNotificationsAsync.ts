import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    // Ask for browser notification permission
    if (Platform.OS === "web") {
        // const permission = await Notification.requestPermission();
        // if (permission !== "granted") {
        //     throw new Error("Web notification permissions not granted");
        // }

        // console.log("✅ Web notification permission granted");

        // ❗ Push tokens not supported out-of-the-box for web
        // You’ll need to use OneSignal, Firebase, or custom Web Push setup
        return null; // Or handle differently if using a web push service
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
            throw new Error(
                "Permission not granted to get push token for push notification!"
            );
        }
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;
        if (!projectId) {
            throw new Error("Project ID not found");
        }
        try {
            const pushTokenString = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
            console.log(pushTokenString);
            return pushTokenString;
        } catch (e: unknown) {
            throw new Error(`${e}`);
        }
    } else {
        throw new Error("Must use physical device for push notifications");
    }
}