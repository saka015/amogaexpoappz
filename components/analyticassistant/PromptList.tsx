import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '@/components/elements/Text';
import { supabase } from '@/config/supabase';
import { handleApiError } from '@/lib/toast-utils';
import { any } from 'zod';

interface Prompt {
  id: number;
  title: string;
  description: string;
}

interface PromptListProps {
  onSelectPrompt: (promptText: string) => void;
}

export const PromptList = ({ onSelectPrompt }: PromptListProps) => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPrompts = async () => {
            setIsLoading(true);
            try {
                // Fetch only active prompts
                const { data, error } = await supabase
                    .from('prompts_list' as any)
                    .select('id, title, description')
                    .eq('status', 'active')
                    .order('title', { ascending: true });

                if (error) throw error;
                setPrompts(data as any || []);
            } catch (error: any) {
                handleApiError(error, "Failed to load prompts");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrompts();
    }, []);

    if (isLoading) {
        return <ActivityIndicator className="my-8" />;
    }

    return (
        <View className="flex-1">
            <Text className="px-4 py-2 font-bold text-md border-b border-border">Select a Prompt</Text>
            <FlatList
                data={prompts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        onPress={() => onSelectPrompt(item.description)}
                        className="px-4 py-2 border-b border-border active:bg-muted"
                    >
                        <Text className="font-semibold text-sm text-foreground">{item.title}</Text>
                        <Text className="text-muted-foreground text-sm mt-1" numberOfLines={2}>{item.description}</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text className="text-center text-muted-foreground p-8">No prompts found.</Text>}
            />
        </View>
    );
};
