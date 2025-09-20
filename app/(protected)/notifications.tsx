import { View, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
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
import { Activity, AlertCircle, Archive, Bell, CheckCircle, Info, MessageCircle, MoreHorizontal, Search, Shield, Trash2 } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { supabase } from "@/config/supabase";
import { Skeleton } from "@/components/elements/Skeleton";
import config from "@/config";

interface Notification {
	id: string
	type: "message" | "system" | "security" | "update" | "alert"
	title: string
	message: string
	timestamp: string
	isRead: boolean
	isArchived: boolean
	sender?: string
	senderInitial?: string
	priority: "low" | "medium" | "high"
	category?: string
	custom_one?: string
}

export default function RoleMenu() {
	const router = useRouter()
	const { userCatalog, allowedPages, signOut } = useAuth()
	const { setTitle, setShowBack } = useHeader();

	const PAGE_SIZE = 10;
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<"new" | "archived">("new");
	const offsetRef = useRef(0);

	const fetchNotifications = useCallback(async (opts?: { reset?: boolean, search?: string, filter?: string }) => {
		if (loading) return;
		setLoading(true);
		if (opts?.reset) setNotifications([]);

		const search = opts?.search ?? searchQuery;
		const reset = opts?.reset ?? false;
		const from = reset ? 0 : offsetRef.current;
		const to = from + PAGE_SIZE - 1;

		const currentActiveFilter = opts?.filter || activeFilter;
		console.log("currentActiveFilter", opts, opts?.filter, activeFilter, currentActiveFilter)

		let query = supabase
			.from("message")
			.select("id, agentMsgId, archive_status, read_status, important, chat_message_type, chat_message, created_user_name, createdAt, custom_one")
			.eq("chat_message_type", "APP_NOTIFICATION")
			.eq("receiver_user_id", userCatalog.user_catalog_id);

		if (currentActiveFilter === "archived") {
			query = query.eq("archive_status", true);
		} else {
			query = query.eq("archive_status", false);
		}

		if (search && search.trim().length > 0) {
			query = query.or([
				`chat_message.ilike.%${search}%`,
				`created_user_name.ilike.%${search}%`
			].join(","));
		}

		query = query.order("createdAt", { ascending: false }).range(from, to);

		const { data, error } = await query;
		if (error) {
			setLoading(false);
			return;
		}

		const mapped = (data || []).map((item: any) => ({
			...item,
			id: item.agentMsgId?.toString(),
			type: "message", // force value, update when DB supports
			title: item.created_user_name,
			message: item.chat_message ?? "",
			timestamp: item.createdAt ? new Date(item.createdAt).toLocaleString() : "",
			isRead: !!item.read_status,
			isArchived: !!item.archive_status,
			sender: item.created_user_name ?? "",
			senderInitial: item.created_user_name ? item.created_user_name.split(" ").map((n: string) => n[0]).join("").toUpperCase() : "",
			priority: item.important ? "high" : "medium", // force value, update when DB supports
			category: "General", // force value, update when DB supports
		}));

		if (reset) {
			setNotifications(mapped as any);
			offsetRef.current = mapped.length;
		} else {
			setNotifications(prev => [...prev, ...mapped as any]);
			offsetRef.current += mapped.length;
		}
		setHasMore(mapped.length === PAGE_SIZE);
		setLoading(false);
	}, [userCatalog.user_catalog_id, activeFilter, searchQuery, loading]);

	useEffect(() => {
		setTitle("Notification");
		setShowBack(false);
		fetchNotifications({ reset: true });
		return () => {
			setTitle("");
			setShowBack(false);
		};
		// eslint-disable-next-line
	}, [setTitle, setShowBack, activeFilter]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		offsetRef.current = 0;
		fetchNotifications({ reset: true }).then(() => setRefreshing(false));
	}, [fetchNotifications]);

	const onEndReached = useCallback(() => {
		if (!loading && hasMore) {
			fetchNotifications();
		}
	}, [loading, hasMore, fetchNotifications]);

	// Prevent multiple triggers during momentum scroll
	const isFetchingMore = useRef(false);

	const handleScroll = ({ nativeEvent }: any) => {
		const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
		// Increase threshold for better triggering
		if (
			layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 &&
			!loading &&
			hasMore &&
			!isFetchingMore.current
		) {
			isFetchingMore.current = true;
			fetchNotifications().finally(() => {
				isFetchingMore.current = false;
			});
		}
	};

	const handleSearch = (v: string) => {
		setSearchQuery(v);
		offsetRef.current = 0;
		fetchNotifications({ reset: true, search: v });
	};

	const filteredNotifications =
		activeFilter === "archived"
			? notifications.filter((n) => n.isArchived)
			: notifications.filter((n) => !n.isArchived);

	const unreadCount = notifications.filter((n) => !n.isRead && !n.isArchived).length;
	const newCount = notifications.filter((n) => !n.isArchived).length;
	const archivedCount = notifications.filter((n) => n.isArchived).length;

	const handleMarkAsRead = async (notificationId: string) => {
		setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
		await supabase
			.from("message")
			.update({ read_status: true })
			.eq("agentMsgId", notificationId as any);
	};

	const handleArchive = async (notificationId: string) => {
		setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, isArchived: !n.isArchived } : n)));
		const notif = notifications.find(n => n.id === notificationId);
		const newArchiveStatus = notif ? !notif.isArchived : true;
		await supabase
			.from("message")
			.update({ archive_status: newArchiveStatus })
			.eq("agentMsgId", notificationId as any);
	};

	const handleDelete = async (notificationId: string) => {
		setNotifications(notifications.filter((n) => n.id !== notificationId));
		await supabase
			.from("message")
			.delete()
			.eq("agentMsgId", notificationId as any);
	};

	const getNotificationIcon = (type: string, priority: string) => {
		const iconClass = priority === "high" ? "text-red-600" : priority === "medium" ? "text-black" : "text-gray-600"

		switch (type) {
			case "message":
				return <MessageCircle className={cn("h-4 w-4", iconClass)} />
			case "system":
				return <Activity className={cn("h-4 w-4", iconClass)} />
			case "security":
				return <Shield className={cn("h-4 w-4", iconClass)} />
			case "update":
				return <Info className={cn("h-4 w-4", iconClass)} />
			case "alert":
				return <AlertCircle className={cn("h-4 w-4", iconClass)} />
			default:
				return <Bell className={cn("h-4 w-4", iconClass)} />
		}
	}

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "high":
				return "border-l-red-500 text-destructive"
			case "medium":
				return "border-l-black"
			default:
				return "border-l-gray-300"
		}
	}

	const APP_URL = config.EXPO_PUBLIC_API_URL
	const notificationClick = (notification: any) => {
		if (notification.custom_one && (notification.custom_one as string).startsWith(APP_URL)) {
			router.push(notification.custom_one.replace(APP_URL, ""))
		}
		console.log("notification", notification)
	}

	return (
		<ScrollView
			className="bg-background"
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			onScroll={handleScroll}
			scrollEventThrottle={32}
		>
			<View className="flex flex-1 size-full justify-center bg-background p-4">
				<View className="flex flex-1 flex-col h-full">
					<View className="flex flex-col h-full">
						<View className="flex-1">
							{/* Search Bar */}
							<View className="p-4 pb-3">
								<View className="relative">
									<Input
										placeholder="Search notifications..."
										value={searchQuery}
										onChangeText={handleSearch}
										className={`pl-8 pr-8 h-12 text-base `}
									/>
									<View className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-8">
										<Text>
											<Search />
										</Text>
									</View>
								</View>
							</View>
							{/* Filter Chips */}
							<View className="px-4 pb-4">
								<View className="flex flex-row">
									<Button
										variant={activeFilter === "new" ? "default" : "outline"}
										size="sm"
										onPress={() => {
											setActiveFilter("new");
											offsetRef.current = 0;
											fetchNotifications({ reset: true, filter: "new" });
										}}
										className={cn(
											"h-8 px-4 rounded-full text-xs font-medium"
										)}
									>
										<Text>New</Text>
									</Button>
									<View className="ml-2">
										<Button
											variant={activeFilter === "archived" ? "default" : "outline"}
											size="sm"
											onPress={() => {
												setActiveFilter("archived");
												offsetRef.current = 0;
												fetchNotifications({ reset: true, filter: "archived" });
											}}
											className={cn(
												"flex flex-row h-8 px-4 rounded-full text-xs font-medium"
											)}
										>
											<LucideIcon name="Archive" size={16} className={cn("mr-2", activeFilter === "archived" ? "text-secondary" : "text-primary")} />
											<Text>Archived</Text>
										</Button>
									</View>
								</View>
							</View>
							<View className="px-2">
								{loading && notifications.length === 0
									? Array.from({ length: 4 }).map((_, i) => (
										<Skeleton key={i} className="px-2 rounded-xl h-32 mb-2" />
									))
									: null}
							</View>
							{/* Notifications List */}
							<View className="px-2 h-full">
								{filteredNotifications.length === 0 && !loading ? (
									<View className="items-center py-8 h-full">
										<Bell className="h-8 w-8 mb-2 opacity-50" />
										<Text className="text-sm text-muted-foreground">
											{searchQuery
												? "No notifications found"
												: activeFilter === "new"
													? "No new notifications"
													: "No archived notifications"}
										</Text>
									</View>
								) : (
									filteredNotifications.map((notification, idx) => (
										<TouchableOpacity
											key={notification.id}
											className={cn(
												"bg-secondary border rounded-xl p-4 transition-colors border-l-4 mb-2",
												getPriorityColor(notification.priority)
											)}
											onPress={() => notificationClick(notification)}
										>
											<View className="flex flex-row items-start">
												{/* Icon or Avatar */}
												<View className="flex-shrink-0 mt-0.5">
													<View className="p-2 bg-gray-100 rounded-full">
														{getNotificationIcon(notification.type, notification.priority)}
													</View>
												</View>
												{/* Content */}
												<View className="flex-1 min-w-0 ml-3">
													<View className="flex flex-row items-start justify-between mb-1">
														<Text
															className={cn(
																"font-medium text-md flex-1",
																getPriorityColor(notification.priority)
															)}
															numberOfLines={1}
														>
															{notification.title}
														</Text>
														<View className="flex flex-row items-center ml-2">
															{!notification.isRead && !notification.isArchived && (
																<View className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />
															)}
															{/* <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 ml-1">
																<MoreHorizontal className="h-3 w-3" />
															</Button> */}
														</View>
													</View>
													<Text
														className={cn(
															"text-sm mb-2",
														)}
														numberOfLines={2}
													>
														{notification.message}
													</Text>
													<View className="flex flex-row items-center justify-between">
														<View className="flex flex-row items-center">
															<Text className="text-xs text-muted-foreground">{notification.timestamp}</Text>
															{notification.category && (
																<View className="ml-2">
																	<Badge variant="secondary" className="text-xs px-1.5 py-0.5">
																		<Text>{notification.category}</Text>
																	</Badge>
																</View>
															)}
														</View>
														<View className="flex flex-row items-center">
															{!notification.isRead && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6"
																	onPress={() => handleMarkAsRead(notification.id)}
																>
																	<CheckCircle size={16} />
																</Button>
															)}
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 ml-1"
																onPress={() => handleArchive(notification.id)}
															>
																<Archive size={16} />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 ml-1"
																onPress={() => handleDelete(notification.id)}
															>
																<Trash2 size={16} />
															</Button>
														</View>
													</View>
												</View>
											</View>
										</TouchableOpacity>
									))
								)}
								{loading && notifications.length > 0 && (
									<Skeleton className="px-2 rounded-xl h-24 mb-2" />
								)}
							</View>
							{/* Bottom Spacing */}
							<View className="h-6"></View>
						</View>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}
