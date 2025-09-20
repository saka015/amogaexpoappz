import React from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '@/components/elements/Text';
import LucideIcon from '../LucideIcon';
import { CustomMarkdown } from '@/components/elements/markdown';
import { Message } from 'ai/react';

interface FilteredMessagesListProps {
  onClose: () => void;
  title: string;
  messages: Message[];
  onMessagePress: (messageId: string) => void;
}

const FilteredMessageItem = ({ message, onMessagePress }: { message: Message, onMessagePress: (id: string) => void }) => (
  <TouchableOpacity onPress={() => onMessagePress(message.id)}>
    <View className="bg-card p-3 mb-3 rounded-lg border border-border">
      <CustomMarkdown content={message.content} />
      <Text className="text-xs text-muted-foreground mt-2">
        {new Date(message.createdAt || Date.now()).toLocaleDateString()}
      </Text>
    </View>
  </TouchableOpacity>
);

export const FilteredMessagesList: React.FC<FilteredMessagesListProps> = ({
  onClose,
  title,
  messages,
  onMessagePress
}) => {
  return (
    <View className="flex-1">
      {/* Header */}
      <View className="p-4 border-b border-border flex-row justify-between items-center">
        <Text className="text-lg font-bold text-foreground">{title}</Text>
        <TouchableOpacity onPress={onClose}>
          <LucideIcon name="X" size={16} className="text-muted-foreground" />
        </TouchableOpacity>
      </View>

      {/* List of Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FilteredMessageItem message={item} onMessagePress={onMessagePress} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-10">
            <Text className="text-muted-foreground">No messages found.</Text>
          </View>
        }
      />
    </View>
  );
};