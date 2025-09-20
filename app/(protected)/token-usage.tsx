import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/elements/Text';
import { useAuth } from '@/context/supabase-provider';
import { generateAPIUrl, expoFetchWithAuth } from '@/lib/utils';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useHeader } from '@/context/header-context';
import { useFocusEffect } from 'expo-router';

interface LogEntry {
    id: string | number;
    created_at: string;
    model_name: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

const formatNumber = (num: number) => num?.toLocaleString('en-US') || '0';
const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
});

const DesktopHeader = () => (
    <View className="flex-row p-4 border-b border-border bg-muted/50">
        <Text className="w-[30%] font-semibold text-muted-foreground">Date & Time</Text>
        <Text className="flex-1 font-semibold text-muted-foreground">Model Name</Text>
        <Text className="w-24 text-right font-semibold text-muted-foreground">Prompt</Text>
        <Text className="w-24 text-right font-semibold text-muted-foreground">Completion</Text>
        <Text className="w-24 text-right font-semibold text-muted-foreground">Total</Text>
    </View>
);

const DesktopRow = ({ item }: { item: LogEntry }) => (
    <Animated.View entering={FadeIn.duration(300)} className="flex-row items-center p-4 border-b border-border">
        <Text className="w-[30%] text-sm text-muted-foreground">{formatDate(item.created_at)}</Text>
        <View className="flex-1 items-start">
            <View className="bg-primary/10 self-start rounded-full px-2.5 py-1">
                <Text className="text-primary text-xs font-semibold">{item.model_name || 'N/A'}</Text>
            </View>
        </View>
        <Text className="w-24 text-right text-sm text-foreground font-mono">{formatNumber(item.prompt_tokens)}</Text>
        <Text className="w-24 text-right text-sm text-foreground font-mono">{formatNumber(item.completion_tokens)}</Text>
        <Text className="w-24 text-right text-sm font-bold text-foreground font-mono">{formatNumber(item.total_tokens)}</Text>
    </Animated.View>
);

const MobileCard = ({ item }: { item: LogEntry }) => (
    <Animated.View entering={FadeIn.duration(300)} className="p-4 border-b border-border">
        <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs text-muted-foreground">{formatDate(item.created_at)}</Text>
            <View className="bg-primary/10 self-start rounded-full px-2 py-0.5">
                <Text className="text-primary text-xs font-semibold">{item.model_name || 'N/A'}</Text>
            </View>
        </View>
        <View className="flex-row justify-around border-t border-border/50 pt-3">
            <View className="items-center flex-1">
                <Text className="text-xs text-muted-foreground">Prompt</Text>
                <Text className="text-base font-semibold text-foreground font-mono">{formatNumber(item.prompt_tokens)}</Text>
            </View>
            <View className="items-center flex-1">
                <Text className="text-xs text-muted-foreground">Completion</Text>
                <Text className="text-base font-semibold text-foreground font-mono">{formatNumber(item.completion_tokens)}</Text>
            </View>
            <View className="items-center flex-1">
                <Text className="text-xs text-muted-foreground">Total</Text>
                <Text className="text-base font-bold text-primary font-mono">{formatNumber(item.total_tokens)}</Text>
            </View>
        </View>
    </Animated.View>
);

export default function TokenUsagePage() {
    const insets = useSafeAreaInsets();
    const { session } = useAuth();
    const { width } = useWindowDimensions();

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const { setTitle, setShowBack } = useHeader()

    const isDesktopLayout = width >= 768; // Breakpoint for switching layouts

    useEffect(() => {
        setTitle("Token Usage");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);
    useFocusEffect(
        useCallback(() => {
            setTitle("Token Usage");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    const fetchLogs = useCallback(async (pageNum: number) => {
        if (isLoading || (pageNum > totalPages && totalPages !== 1)) return;
        setIsLoading(true);

        try {
            const res = await expoFetchWithAuth(session)(generateAPIUrl(`/api/analyticassistant/token-usage?page=${pageNum}`));
            const data = await res.json();
            if (res.ok) {
                setLogs(prevLogs => pageNum === 1 ? data.logs : [...prevLogs, ...data.logs]);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Failed to fetch token logs:", error);
        } finally {
            setIsLoading(false);
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [isLoading, totalPages, session, isInitialLoading]);

    useEffect(() => {
        fetchLogs(1); // Fetch initial page
    }, []);

    const handleLoadMore = () => {
        if (!isLoading && page < totalPages) {
            const nextPage = page + 1;
            fetchLogs(nextPage);
            setPage(nextPage);
        }
    };

    const renderItem = ({ item }: { item: LogEntry }) => {
        return isDesktopLayout ? <DesktopRow item={item} /> : <MobileCard item={item} />;
    };

    if (isInitialLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" color="hsl(var(--primary))" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            <View className="p-6 border-b border-border">
                <Text className="text-2xl font-bold text-foreground">Token Usage Logs</Text>
                <Text className="text-muted-foreground mt-1">Detailed breakdown of your AI API usage</Text>
            </View>

            <View className="flex-1 p-4">
                <View className="flex-1 border border-border rounded-lg overflow-hidden bg-card">
                    <FlatList
                        data={logs}
                        keyExtractor={(item) => item.id.toString()}
                        // The header is now part of the list for better scroll behavior
                        ListHeaderComponent={isDesktopLayout ? <DesktopHeader /> : null}
                        renderItem={renderItem}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isLoading ? <ActivityIndicator size="large" className="my-8" color="hsl(var(--primary))" /> : null}
                        ListEmptyComponent={
                            <View className="h-40 justify-center items-center">
                                <Text className="text-muted-foreground">No usage data found.</Text>
                            </View>
                        }
                    />
                </View>
            </View>
        </View>
    );
}