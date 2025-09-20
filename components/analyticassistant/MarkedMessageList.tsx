import React from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/elements/Text';
import LucideIcon from '../LucideIcon';
import type { Message } from 'ai/react';

interface MarkedMessageListProps {
  messages: Message[];
  onMessagePress: (id: string) => void;
  onMessageUnmark: (id: string) => void;
  emptyStateText: string;
}

export const MarkedMessageList: React.FC<MarkedMessageListProps> = ({
  messages,
  onMessagePress,
  onMessageUnmark,
  emptyStateText,
}) => {
  const renderItem = ({ item }: { item: Message }) => {
    // Safely get a preview of the message content
    const contentPreview =
      typeof item.content === 'string'
        ? item.content.substring(0, 80) + (item.content.length > 80 ? '...' : '')
        : '[Non-text content]';

    return (
      <View className="flex-row items-center border-b border-border last:border-b-0">
        <TouchableOpacity onPress={() => onMessagePress(item.id)} className="flex-1 py-3 px-4">
          <Text className="text-sm text-foreground" numberOfLines={2}>
            {contentPreview}
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onMessageUnmark(item.id)} className="p-4">
          <LucideIcon name="X" size={16} className="text-destructive" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListEmptyComponent={
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-muted-foreground">{emptyStateText}</Text>
        </View>
      }
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
});