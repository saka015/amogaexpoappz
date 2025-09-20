import "../global.css";
import '@/lib/polyfills';
import { Stack } from "expo-router";

import { AuthProvider } from "@/context/supabase-provider";
import { useColorScheme } from "@/lib/useColorScheme";
import { colors } from "@/constants/colors";
import { PortalHost } from '@rn-primitives/portal';
import { Toaster } from 'sonner-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/context/theme-context";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { NotificationProvider } from "@/context/notification-context";
import { GlobalDialog } from "@/components/GlobalDialog";
import { View, StyleSheet } from "react-native";
import * as Sentry from '@sentry/react-native';
import config from "@/config";

Sentry.init({
	dsn: 'https://fee585ea7bd272a38e75dea214a87894@o4510030297694208.ingest.de.sentry.io/4510030302150736',
	environment: config.STAGE,
	// Adds more context data to events (IP address, cookies, user, etc.)
	// For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
	sendDefaultPii: true,

	// Configure Session Replay
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1,
	integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: __DEV__,
});

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";

TaskManager.defineTask(
	BACKGROUND_NOTIFICATION_TASK,
	async ({ data, error, executionInfo }) => {
		console.log("✅ Received a notification in the background!", {
			data,
			error,
			executionInfo,
		});
		// Do something with the notification data
	}
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

export default Sentry.wrap(function AppLayout() {
	const { colorScheme } = useColorScheme();

	return (
		<>
			<GestureHandlerRootView className={`flex flex-col h-full w-full`}>
				<AuthProvider>
					<NotificationProvider>
						<ThemeProvider>
							<Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: styles.container }}>
								<Stack.Screen name="(protected)" />
								<Stack.Screen name="login" />
							</Stack>
							<PortalHost />
							<Toaster />
							<GlobalDialog />
						</ThemeProvider>
					</NotificationProvider>
				</AuthProvider>
			</GestureHandlerRootView>
		</>
	);
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'hsl(var(--background))',
	},
});