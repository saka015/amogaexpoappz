import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/context/supabase-provider';
import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { Input } from '@/components/elements/Input';
import { Skeleton } from '@/components/elements/Skeleton';
import LucideIcon from '@/components/LucideIcon';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/elements/TDialog';
import { Label } from '@/components/elements/Label';
import { handleApiError, handleApiSuccess } from '@/lib/toast-utils';
import { Textarea } from '@/components/elements/Textarea';
import { supabase } from '@/config/supabase'; // Import your configured Supabase client
import { Badge } from '@/components/elements/Badge';
import { useDialogStore } from '@/store/dialogStore';
import { useHeader } from '@/context/header-context';
import { useFocusEffect } from 'expo-router';
import { ScheduleForm } from '@/components/prompts/ScheduleForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateNextExecution, Schedule } from '@/lib/schedule-utils';

interface Prompt extends Schedule {
    id: number;
    title: string;
    description: string | null;
    status: string;
    remarks: string | null;
    created_at: string;
    delivery_options: any;
    target_user_ids: any[];
}

const promptSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().optional(),
    status: z.string().min(1, "Status is required"),
    remarks: z.string().optional(),

    // Schedule fields
    is_scheduled: z.boolean().default(false),
    frequency: z.string().optional(),
    schedule_time: z.string().optional(),
    timezone: z.string().min(1, "Timezone is required").default('UTC'),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    hourly_interval: z.number().optional().nullable(),
    selected_weekdays: z.array(z.string()).optional(),
    day_of_month: z.number().optional().nullable(),
    selected_year: z.number().optional().nullable(),
    selected_month: z.number().optional().nullable(),
    selected_day: z.number().optional().nullable(),
    specific_dates: z.array(z.string()).optional(),

    // Delivery & Targeting
    delivery_options: z.object({
        aiChat: z.boolean().optional(),
        notifier: z.boolean().optional(),
        email: z.boolean().optional(),
        chat: z.boolean().optional(),
    }).optional(),
    target_all_users: z.boolean().optional().default(false),
    target_user_ids: z.array(z.any()).optional(),
});
type PromptFormData = z.infer<typeof promptSchema>;

const PromptForm = ({ control, errors }: { control: any, errors: any }) => (
    <View className="">
        <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
            <View className="">
                <Label>Title</Label>
                <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder="" className='mt-2' />
                {errors.title && <Text className="text-destructive text-xs">{errors.title.message}</Text>}
            </View>
        )} />
        <Controller control={control} name="description" render={({ field: { onChange, onBlur, value } }) => (
            <View className="mt-4">
                <Label>Description / Prompt Text</Label>
                <Textarea value={value || ''} onChangeText={onChange} onBlur={onBlur} placeholder="" className="h-24 mt-2" />
            </View>
        )} />
        <Controller control={control} name="status" render={({ field: { onChange, value } }) => (
            <View className="mt-4">
                <Label>Status</Label>
                {/* For a real app, replace this with a Select/Dropdown component */}
                <View className="flex-row gap-2 mt-2">
                    <Button variant={value === 'active' ? 'default' : 'outline'} onPress={() => onChange('active')}><Text>Active</Text></Button>
                    <Button variant={value === 'inactive' ? 'default' : 'outline'} onPress={() => onChange('inactive')}><Text>Inactive</Text></Button>
                </View>
            </View>
        )} />
        <Controller control={control} name="remarks" render={({ field: { onChange, onBlur, value } }) => (
            <View className="mt-4">
                <Label>Remarks</Label>
                <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} placeholder="" className='mt-2' />
            </View>
        )} />
    </View>
);

export default function PromptsListPage() {
    const { session, userCatalog } = useAuth();
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const { setTitle, setShowBack } = useHeader()
    const showDialog = useDialogStore((s) => s.showDialog);

    const { control, handleSubmit, reset, formState: { errors }, setValue, getValues, watch } = useForm<PromptFormData>({
        resolver: zodResolver(promptSchema as any),
    });

    useEffect(() => {
        setTitle("Prompts");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Prompts");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    const fetchPrompts = useCallback(async (search: string) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            let query = supabase.from('prompts_list' as any)
                .select('*')
                .eq('prompt_group', 'general_prompt')
                .order('created_at', { ascending: false });

            if (search) {
                // Search in title and description
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            setPrompts(data as any || []);
        } catch (error: any) {
            handleApiError(error, "Fetch Error");
        } finally {
            setIsLoading(false);
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [isLoading, isInitialLoading]);

    useEffect(() => {
        fetchPrompts(searchQuery);
    }, [searchQuery]); // Re-fetch when search query changes

    const handleOpenDialog = (prompt: Prompt | null) => {
        setEditingPrompt(prompt);
        reset(prompt ? {
            title: prompt.title,
            description: prompt.description || '',
            status: prompt.status,
            remarks: prompt.remarks || '',
            is_scheduled: prompt.is_scheduled || false,
            target_user_ids: prompt.target_user_ids || [],
            delivery_options: prompt.delivery_options || { aiChat: false, email: false },
            timezone: prompt.timezone || 'UTC'
        } : {
            title: '',
            description: '',
            status: 'active',
            remarks: '',
            is_scheduled: false,
            frequency: 'daily',
            schedule_time: '09:00',
            target_user_ids: [],
            delivery_options: { aiChat: false, email: false },
            timezone: 'UTC'
        });
        setIsDialogOpen(true);
    };

    const { bottom } = useSafeAreaInsets();

    const onFormSubmit = async (formData: PromptFormData) => {
        setIsSaving(true);
        try {
            const nextExecutionTime = calculateNextExecution(formData as Schedule);

            const payload = {
                ...formData,
                prompt_group: 'general_prompt',
                next_execution: nextExecutionTime ? nextExecutionTime.toISOString() : null,
            };

            let error;
            if (editingPrompt) {
                // Update
                ({ error } = await supabase.from('prompts_list' as any).update(payload).eq('id', editingPrompt.id));
            } else {
                // Create
                ({ error } = await supabase.from('prompts_list' as any).insert({ ...payload, created_by: userCatalog.user_catalog_id }));
            }
            if (error) throw error;

            handleApiSuccess(`Prompt ${editingPrompt ? 'updated' : 'created'} successfully!`);
            setIsDialogOpen(false);
            fetchPrompts(searchQuery); // Refresh the list
        } catch (error: any) {
            handleApiError(error, "Save Error");
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeletePrompt = async (promptId: number) => {
        try {
            const { error } = await supabase.from('prompts_list' as any).delete().eq('id', promptId);
            if (error) throw error;
            handleApiSuccess("Prompt deleted successfully!");
            fetchPrompts(searchQuery); // Refresh the list
        } catch (error: any) {
            handleApiError(error, "Delete Error");
        }
    }

    const handleDeletePrompt = (promptId: number) => {
        showDialog({
            title: 'Delete Prompt',
            description: `Are you sure you want to delete this prompt? This action cannot be undone.`,
            showCancel: true,
            actions: [
                {
                    label: 'Delete',
                    variant: 'default',
                    onPress: () => {
                        confirmDeletePrompt(promptId)
                    },
                }
            ],
        })
    };

    const renderPrompt = ({ item }: { item: Prompt }) => (
        <View className="bg-card min-h-24 p-4 pb-5 rounded-lg border border-border mb-4 relative">
            <View className="flex-row items-start">
                <View className="flex-1">
                    <View className="flex-row justify-between items-center">
                        <Text className="font-bold text-lg text-foreground flex-1" numberOfLines={1}>{item.title}</Text>
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                            <Text>{item.status}</Text>
                        </Badge>
                    </View>
                    <Text className="text-sm text-muted-foreground mt-1" numberOfLines={2}>{item.description}</Text>
                </View>
            </View>
            <View className="flex-row justify-end items-center mt-4 pt-3 absolute bottom-2 right-4">
                <Button variant="ghost" size="sm" onPress={() => handleDeletePrompt(item.id)}>
                    <LucideIcon name="Trash2" size={16} className="text-destructive" />
                    {/* <Text className="text-destructive">Delete</Text> */}
                </Button>
                <Button variant="ghost" size="sm" onPress={() => handleOpenDialog(item)} className="">
                    <LucideIcon name="Pen" size={16} className="text-muted-foreground" />
                </Button>
            </View>
        </View>
    );

    // Watch all form fields and update next execution time efficiently
    const allFields = useWatch({ control });

    const [nextExecution, setNextExecution] = useState<Date | null>(null);

    useEffect(() => {
        const v = calculateNextExecution(allFields as any);
        setNextExecution(v);
    }, [allFields]);

    return (
        <View className="flex-1 bg-background">
            <View className="p-4 border-b border-border flex-row justify-between items-center">
                <View className="flex-1 relative">
                    <Input placeholder="Search prompts..." value={searchQuery} onChangeText={setSearchQuery} className="pl-10 h-12" />
                    <View className="absolute left-3 top-3.5"><LucideIcon name="Search" size={20} className="text-muted-foreground" /></View>
                </View>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} className=''>
                    <DialogTrigger asChild><Button onPress={() => handleOpenDialog(null)} className="ml-4"><LucideIcon name="Plus" size={18} className="text-primary-foreground" /></Button></DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-lg max-h-screen m-4 p-0" style={{ paddingBottom: bottom }}>
                        {/* <Animated.View
                            entering={FadeIn.duration(250)}
                            className="flex-1 bg-background"
                            style={{ paddingBottom: bottom }}
                        ></Animated.View> */}

                        <DialogHeader className='p-6'><DialogTitle>{editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}</DialogTitle></DialogHeader>
                        <ScrollView className='py-4 p-6'>
                            <PromptForm control={control} errors={errors} />
                            <ScheduleForm control={control} errors={errors} setValue={setValue} getValues={getValues} session={session} nextExecution={nextExecution} />
                        </ScrollView>
                        <DialogFooter className='p-6 py-2'>
                            <DialogClose asChild><Button variant="outline"><Text>Cancel</Text></Button></DialogClose>
                            <Button onPress={handleSubmit(onFormSubmit as any)} disabled={isSaving} className='flex-row'>
                                {isSaving && <ActivityIndicator className="mr-2" color="white" />}
                                <Text>{editingPrompt ? 'Save Changes' : 'Create Prompt'}</Text>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </View>

            {isInitialLoading ? (
                <View className="p-4 pt-0">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg mt-4" />)}</View>
            ) : (
                <FlatList
                    data={prompts}
                    renderItem={renderPrompt}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    onRefresh={() => fetchPrompts(searchQuery)}
                    refreshing={isLoading && !isInitialLoading}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center mt-20">
                            <LucideIcon name="FileText" size={48} className="text-muted-foreground" />
                            <Text className="text-muted-foreground mt-4">No prompts found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
