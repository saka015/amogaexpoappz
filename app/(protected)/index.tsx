import { View, ScrollView } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useHeader } from "@/context/header-context";
import { useAuth } from "@/context/supabase-provider";
import { Button } from "@/components/elements/Button";
import { Badge } from "@/components/elements/Badge";
import { H2, H3, H4, P } from "@/components/elements/Typography";
import { Card, CardContent, PressableCard } from "@/components/elements/Card";
import { Text } from "@/components/elements/Text";
import { Input } from "@/components/elements/Input";
import { MaterialIcons } from "@expo/vector-icons";
import LucideIcon from "@/components/LucideIcon";
import { useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';

export default function RoleMenu() {
	const router = useRouter()
	const { userCatalog, allowedPages, signOut } = useAuth()

	const { setTitle, setShowBack } = useHeader();

	const [search, setSearch] = useState("")

	// Filter allowedPages based on search
	const filteredPages = allowedPages.filter(page =>
		page.page_name?.toLowerCase().includes(search.toLowerCase())
	);

	useEffect(() => {
		setTitle("Menu");
		setShowBack(false);
		return () => {
			setTitle("");
			setShowBack(false);
		};
	}, [setTitle, setShowBack]);
	useFocusEffect(
		useCallback(() => {
			setTitle("Menu");
			setShowBack(false);
		}, [setTitle, setShowBack])
	);

	const handleMenuItemClicked = (page: any) => {
		if (page.page_link)
			router.push(page.page_link)
	}

	return (
		<ScrollView>
			<View className="flex flex-1 size-full justify-center bg-background p-4 gap-y-4">
				<View className="flex flex-col h-full">
					<View className="flex-1 overflow-y-auto">
						<View className="w-full px-4 mb-4 mt-3">
							<Card className="bg-primary/10 border border-primary rounded-xl p-4">
								<CardContent className="p-0">
									<H4 className="text-primary mb-1">👋 Welcome back, {userCatalog?.first_name}!</H4>
									<Text className="text-sm leading-tight">
										Here's a quick overview of your dashboard. Explore your pages or manage your content below.
									</Text>
								</CardContent>
							</Card>
						</View>
						<View className="px-4">
							<View className="space-y-2 my-3">
								{/* <Label>Password</Label> */}
								<View className="relative">
									<Input
										placeholder="Search ..."
										value={search}
										onChangeText={(v) => setSearch(v)}
										className={`pl-8 pr-8 h-12 text-base `}
									/>
									<View
										className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-8"
									>
										<Text><LucideIcon name="Search" size={16} /> </Text>
									</View>
								</View>
							</View>

							<View className="flex flex-row flex-wrap items-center gap-2 mb-4">
								<H3 className="font-semibold text-base"><Text>Available pages</Text></H3>
								<Badge variant="secondary" className="text-xs">
									<Text>{filteredPages.length} items</Text>
								</Badge>
							</View>
							<View className="flex flex-row flex-wrap -mx-1">
								{filteredPages.map((page, index) => (
									<View key={index} className="w-1/2 md:w-1/3 px-1 mb-3">
										<PressableCard
											className="flex-1 min-h-[140px] p-4 active:scale-95 active:bg-primary/20"
											onPress={() => handleMenuItemClicked(page)}
										>
											<CardContent className="flex-1 p-0 justify-around items-center">
												{page.page_icon_name ? (
													<Text>
														<LucideIcon name={page.page_icon_name as any} size={16} className="text-primary" />
													</Text>
												) : (
													<Text>
														<LucideIcon name="SquareMenu" size={16} className=" text-primary" />
													</Text>
												)}
												<H4 className="text-center">{page.page_name}</H4>
												{/* <P className="text-center text-xs leading-tight line-clamp-2">description</P> */}
											</CardContent>
										</PressableCard>
									</View>
								))}
							</View>
						</View>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}
