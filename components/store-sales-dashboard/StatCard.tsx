import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/elements/Text';
import { Skeleton } from '@/components/elements/Skeleton';
import LucideIcon from '../LucideIcon';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: any;
  isLoading: boolean;
  isCurrency?: boolean;
}

export const StatCard = ({ title, value, icon: Icon, isLoading, isCurrency = true }: StatCardProps) => {
  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }
  return (
    <View className="bg-card p-4 rounded-lg border border-border">
      <View className="flex-row justify-between items-start">
        <Text className="text-muted-foreground">{title}</Text>
        {Icon && <Icon size={16} className="text-muted-foreground" />}
      </View>
      <Text className="text-2xl font-bold text-foreground mt-2">
        {isCurrency ? `RM ${Number(value).toFixed(2)}` : value}
      </Text>
    </View>
  );
};