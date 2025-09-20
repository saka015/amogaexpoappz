import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/elements/Text';
import LucideIcon from '../LucideIcon';
import { useStore } from '@/lib/globalAnalyticAssistantStore';

export const TokenUsageDisplay = () => {
  const usage = useStore((state) => state.activeChatTokenUsage);

  if (!usage) {
    return (
      <View className="p-4 items-center justify-center">
        <Text className="text-muted-foreground">No usage data available.</Text>
      </View>
    );
  }

  // Helper to format large numbers
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <View className="p-4 space-y-3">
      <Text className="text-lg font-bold text-foreground mb-2">Token Usage</Text>
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <LucideIcon name="LogIn" size={16} className="text-muted-foreground mr-2" />
          <Text className="text-foreground">Prompt Tokens</Text>
        </View>
        <Text className="font-semibold text-foreground">{formatNumber(usage.prompt)}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <LucideIcon name="LogOut" size={16} className="text-muted-foreground mr-2" />
          <Text className="text-foreground">Completion Tokens</Text>
        </View>
        <Text className="font-semibold text-foreground">{formatNumber(usage.completion)}</Text>
      </View>

      <View className="border-t border-border my-2" />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <LucideIcon name="Sigma" size={16} className="text-primary mr-2" />
          <Text className="text-primary font-bold">Total Tokens</Text>
        </View>
        <Text className="font-bold text-primary">{formatNumber(usage.total)}</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <LucideIcon name="DollarSign" size={16} className="text-primary mr-2" />
          <Text className="text-primary font-bold">Estimated cost</Text>
        </View>
        <Text className="font-bold text-primary">{formatNumber(usage.cost)}</Text>
      </View>
    </View>
  );
};