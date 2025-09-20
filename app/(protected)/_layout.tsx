import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/supabase-provider";
import { Header } from "@/components/Header";
import { HeaderProvider } from "@/context/header-context";
import { SafeAreaView } from "@/components/safe-area-view";

export const unstable_settings = {
	initialRouteName: "index",
};

export default function ProtectedLayout() {
	const { initialized, session, isFetchingUserInfo } = useAuth();

	if (!initialized) {
		return null;
	}

	if (isFetchingUserInfo) {
		return null
	}

	if (!session && !isFetchingUserInfo) {
		return <Redirect href="/login" />;
	}

	return (
		<HeaderProvider>
			<SafeAreaView className="flex-1 bg-background">
				<Header />
				<Stack
					screenOptions={{
						headerShown: false,
					}}
				>
					<Stack.Screen name="index" />
					<Stack.Screen name="customers" />
					<Stack.Screen name="notifications" />
					<Stack.Screen name="products" />
					<Stack.Screen name="profile" />
					<Stack.Screen name="prompts-list" />
					<Stack.Screen name="report-schedule" />
					<Stack.Screen name="store-sales-dashboard" />
					<Stack.Screen name="store-settings" />
					<Stack.Screen name="theme-selector" />
					<Stack.Screen name="token-usage" />
				</Stack>
			</SafeAreaView>
		</HeaderProvider >
	);
}
