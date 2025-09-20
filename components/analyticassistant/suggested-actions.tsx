import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Text } from '@/components/elements/Text';

interface SuggestedActionsProps {
  suggestions: string[];
  isLoading: boolean;
  onSuggestionClick: (suggestion: string) => void;
}

// A single animated button for a suggestion, styled for horizontal layout
const SuggestionButton = ({ item, onPress }: { item: string, onPress: (item: string) => void }) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      // Use padding to give it a "chip" or "pill" look
      className="bg-card border border-border rounded-full px-4 py-2"
    >
      <Text className="text-sm text-primary font-medium">{item}</Text>
    </TouchableOpacity>
  );
};

export const SuggestedActions = ({ suggestions, isLoading, onSuggestionClick }: SuggestedActionsProps) => {
  if (isLoading) {
    return (
      <View className="p-4 h-16 justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null; // Don't render anything if there are no suggestions
  }

  return (
    // The main container will animate in
    <Animated.View entering={FadeInUp.duration(400)} className="pt-4 pb-2">
      <View className="px-4 mb-3">
         <Text className="text-sm font-semibold text-muted-foreground">Suggested Replies</Text>
      </View>
      
      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal // <<--- This is the key change!
        showsHorizontalScrollIndicator={false}
        // Add some padding so the list doesn't touch the screen edges
        contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 8, // Use gap for spacing between items
        }}
        renderItem={({ item }) => (
          <SuggestionButton
            item={item}
            onPress={onSuggestionClick}
          />
        )}
      />
    </Animated.View>
  );
};