import { View } from "react-native";
import { H1, Muted } from "@/components/ui/typography";
import { Button } from '@/components/elements/Button';
import { useRouter } from 'expo-router';
import { Text } from "@/components/elements/Text";

export default function NotFound() {
	const router = useRouter();
	return (
		<View className="flex flex-1 items-center justify-center bg-background p-4 gap-y-4">
			<H1 className="text-center">Permission Not Found</H1>
			<Muted className="text-center">This page permission not found.</Muted>
			<Button className="mt-6" onPress={() => router.replace('/')}><Text>Go to Menu</Text></Button>
		</View>
	);
}
