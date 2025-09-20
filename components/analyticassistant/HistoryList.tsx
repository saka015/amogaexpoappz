// HistoryList.tsx

import React from 'react';
// Import StyleSheet for reliable native styling
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/elements/Text';
import LucideIcon from '../LucideIcon';
import { useStore } from '@/lib/globalAnalyticAssistantStore';

interface HistoryListProps {
    onItemPress: (id: string) => void;
    onItemDelete: (id: string, title: string) => void;
    onItemRefresh: (id: string) => void; // NEW PROP
}

export const HistoryList: React.FC<HistoryListProps> = ({ onItemPress, onItemDelete, onItemRefresh }) => {
    const { chats, isChatsLoading } = useStore();

    const renderItem = ({ item }: { item: any }) => (
        <View className="flex-row items-center border-b border-border last:border-b-0">
            <TouchableOpacity onPress={() => onItemPress(item.id)} className="flex-1 py-3 px-4">
                <Text className="font-semibold text-foreground" numberOfLines={1}>
                    {item.title || 'Untitled Chat'}
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </TouchableOpacity>
            <View className="flex-row p-4">
                <TouchableOpacity onPress={() => onItemRefresh(item.id)} className="">
                    <LucideIcon name="RefreshCcw" size={16} className="text-primary" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onItemDelete(item.id, item.title)} className="ml-2">
                    <LucideIcon name="Trash2" size={16} className="text-destructive" />
                </TouchableOpacity>
            </View>

        </View>
    );

    if (isChatsLoading) {
        return (
            <View className="flex-1 my-4 justify-center items-center">
                <ActivityIndicator />
            </View>
        );
    }

    return (
        <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={
                <View className="flex-1 justify-center items-center p-4">
                    <Text className="text-muted-foreground">No history found.</Text>
                </View>
            }
            // Apply styles directly for maximum native compatibility
            style={styles.list}
            contentContainerStyle={styles.listContent}
        />
    );
};

// Use StyleSheet for the most critical layout props on native
const styles = StyleSheet.create({
    list: {
        // This tells the FlatList to take up all available vertical space
        // given by its parent (PopoverContent), up to its maxHeight.
        flex: 1,
    },
    listContent: {
        // This is still needed so the ListEmptyComponent can be centered
        // when there are no items to display.
        flexGrow: 1,
    },
});