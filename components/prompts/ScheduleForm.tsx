// components/prompts/ScheduleForm.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';

import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { Input } from '@/components/elements/Input';
import { Label } from '@/components/elements/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/elements/Card';
import { Checkbox } from '@/components/elements/Checkbox';
import { DatePicker } from '@/components/elements/DatePicker';
import LucideIcon from '@/components/LucideIcon';
import { supabase } from '@/config/supabase';
import { expoFetchWithAuth, generateAPIUrl } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const frequencies = ["hourly", "daily", "weekly", "monthly", "yearly", "specific_dates"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const deliveryOptionsConfig = [
    { id: 'aiChat', label: 'Send on AI Chat' },
    { id: 'notifier', label: 'Send on Notifier' },
    { id: 'email', label: 'Send as Email' },
    { id: 'chat', label: 'Send on Chat' },
];
const commonTimezones = [
    "UTC",
    "America/New_York",   // US East
    "America/Chicago",    // US Central
    "America/Denver",     // US Mountain
    "America/Los_Angeles",// US Pacific
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Dubai",
    "Australia/Sydney",
    "Asia/Kuala_Lumpur",  // Malaysia
    "Asia/Singapore",     // Singapore
    "Asia/Jakarta",       // Indonesia (Jakarta)
    "Asia/Calcutta",      // India (deprecated, but common)
    "Asia/Kolkata",       // India (official)
];

const searchUsersAPI = async (query: string, excludeIds: number[], session: any) => {
    if (!query) return [];
    try {
        // Construct the URL with search parameters
        const params = new URLSearchParams({
            query,
            exclude: excludeIds.join(','),
        });

        // Make the authenticated fetch call to your new API route
        const response = await expoFetchWithAuth(session)(generateAPIUrl(`/api/users/search?${params.toString()}`));
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to search users');
        }
        return await response.json();

    } catch (error) {
        console.error("Error searching users via API:", error);
        return []; // Return empty array on failure
    }
};

export const ScheduleForm = ({ control, errors, setValue, getValues, session, nextExecution, deliveryOptions }: {
    control: any, errors: any, setValue: any, getValues: any, session: any, nextExecution: Date | null, deliveryOptions?: {
        id: string;
        label: string;
    }[]
}) => {
    const isScheduled = useWatch({ control, name: "is_scheduled" });
    const frequency = useWatch({ control, name: "frequency" });
    const targetAllUsers = useWatch({ control, name: 'target_all_users' });
    const selectedUsers = useWatch({ control, name: 'target_user_ids' }) || [];

    // State for user search
    const [userSearch, setUserSearch] = useState('');
    const [foundUsers, setFoundUsers] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');

    let summaryText = 'Not scheduled to run again.';
    if (nextExecution) {
        // Use formatDistanceToNow for a friendly, relative time.
        const relativeTime = formatDistanceToNow(nextExecution, { addSuffix: true });
        summaryText = `Next run: ${relativeTime}`;
    }

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (userSearchQuery.length > 1) {
                setIsSearchingUsers(true);
                const excludeIds = selectedUsers.map((u: any) => u.user_catalog_id);
                const results = await searchUsersAPI(userSearchQuery, excludeIds, session);
                setFoundUsers(results as any);
                setIsSearchingUsers(false);
            } else {
                setFoundUsers([]);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [userSearchQuery, selectedUsers]);

    const handleUserSelect = (user: { user_catalog_id: number; first_name: string; last_name: string | null }) => {
        const currentUsers = getValues('target_user_ids') || [];
        setValue('target_user_ids', [...currentUsers, user]);
        setUserSearchQuery('');
        setFoundUsers([]);
    };

    const handleUserRemove = (userId: number) => {
        const currentUsers = getValues('target_user_ids') || [];
        setValue('target_user_ids', currentUsers.filter((u: any) => u.user_catalog_id !== userId));
    };

    if (!isScheduled) {
        return (
            <Controller control={control} name="is_scheduled" render={({ field: { onChange, value } }) => (
                <View className="flex-row items-center mt-6 border-t border-border pt-6">
                    <Checkbox id="schedule-toggle" checked={value} onCheckedChange={onChange} className='mr-2' />
                    <Label htmlFor="schedule-toggle" onPress={() => onChange(!value)}>Enable Scheduled Execution</Label>
                </View>
            )} />
        );
    }

    return (
        <Card className="mt-6 native:mb-6 border-border">
            <CardHeader>
                <CardTitle>Schedule Configuration</CardTitle>
            </CardHeader>
            <CardContent className="">
                <Controller control={control} name="is_scheduled" render={({ field: { onChange, value } }) => (
                    <View className="flex-row items-center mt-4">
                        <Checkbox id="schedule-toggle" checked={value} onCheckedChange={onChange} className='mr-2' />
                        <Label htmlFor="schedule-toggle" onPress={() => onChange(!value)}>Enable Scheduled Execution</Label>
                    </View>
                )} />

                {/* --- Frequency, Time, and Date Pickers --- */}
                <View className='mt-4'>
                    <Label>Frequency</Label>
                    <Controller control={control} name="frequency" render={({ field: { onChange, value } }) => (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-2 -mx-4 px-4">
                            {frequencies.map(f => <Button key={f} variant={value === f ? 'default' : 'outline'} className='mr-1' onPress={() => onChange(f)}><Text className="capitalize">{f}</Text></Button>)}
                        </ScrollView>
                    )} />
                </View>

                {/* Time Input (not for hourly) */}
                {frequency !== 'hourly' && (
                    <Controller control={control} name="schedule_time" render={({ field: { onChange, value } }) => (
                        <View className='mt-4'><Label>Execution Time (HH:MM)</Label><Input value={value} onChangeText={onChange} placeholder="09:00" maxLength={5} className='mt-2' /></View>
                    )} />
                )}

                {/* Start/End Date Pickers */}
                {(frequency === "daily" || frequency === "hourly") && (
                    <View className="flex-row gap-4 mt-4">
                        <Controller control={control} name="start_date" render={({ field: { onChange, value } }) => (
                            <View className="flex-1"><Label>Start Date</Label><DatePicker value={value} onSelect={onChange}><View className="border border-input rounded-md p-2 mt-1"><Text>{value || 'Select...'}</Text></View></DatePicker></View>
                        )} />
                        <Controller control={control} name="end_date" render={({ field: { onChange, value } }) => (
                            <View className="flex-1"><Label>End Date</Label><DatePicker value={value} onSelect={onChange}><View className="border border-input rounded-md p-2 mt-1"><Text>{value || 'Select...'}</Text></View></DatePicker></View>
                        )} />
                    </View>
                )}

                {/* Weekly Selection */}
                {frequency === 'weekly' && (
                    <Controller control={control} name="selected_weekdays" render={({ field: { onChange, value = [] } }) => (
                        <View className='mt-4'>
                            <Label>Select Days of the Week</Label>
                            <View className="flex-row flex-wrap gap-2 mt-2">
                                {weekdays.map(day => {
                                    const isSelected = value.includes(day);
                                    return (
                                        <Button
                                            key={day}
                                            variant={isSelected ? 'default' : 'outline'}
                                            onPress={() => {
                                                const newValue = isSelected ? value.filter((d: any) => d !== day) : [...value, day];
                                                onChange(newValue);
                                            }}
                                            className="px-3 py-2"
                                        >
                                            <Text className="capitalize">{day}</Text>
                                        </Button>
                                    );
                                })}
                            </View>
                        </View>
                    )} />
                )}

                {/* Monthly Selection */}
                {frequency === 'monthly' && (
                    <View className="mt-4">
                        <Controller control={control} name="day_of_month" render={({ field: { onChange, value } }) => (
                            <View className='mt-3'><Label>Day of Month</Label><Input value={value?.toString()} onChangeText={(text) => onChange(parseInt(text, 10) || 1)} keyboardType="number-pad" placeholder="1-31" /></View>
                        )} />
                        <View className="flex-row gap-4 mt-3">
                            <Controller control={control} name="start_month" render={({ field: { onChange, value } }) => (
                                <View className="flex-1"><Label>Start Month</Label><Input value={value?.toString()} onChangeText={(text) => onChange(parseInt(text, 10) || 1)} keyboardType="number-pad" placeholder="1-12" /></View>
                            )} />
                            <Controller control={control} name="end_month" render={({ field: { onChange, value } }) => (
                                <View className="flex-1"><Label>End Month</Label><Input value={value?.toString()} onChangeText={(text) => onChange(parseInt(text, 10) || 1)} keyboardType="number-pad" placeholder="1-12" /></View>
                            )} />
                        </View>
                    </View>
                )}

                {/* Yearly Selection */}
                {frequency === 'yearly' && (
                    <View className="mt-4">
                        <Controller control={control} name="selected_year" render={({ field: { onChange, value } }) => (
                            <View className='mt-3'><Label>Year</Label><Input value={value?.toString()} onChangeText={(text) => onChange(parseInt(text, 10) || new Date().getFullYear())} keyboardType="number-pad" placeholder="e.g., 2025" /></View>
                        )} />
                        <View className="flex-row gap-4">
                            <Controller control={control} name="selected_month" render={({ field: { onChange, value } }) => (
                                <View className="flex-1 mt-3"><Label>Month</Label><Input value={value?.toString()} onChangeText={(text) => onChange(parseInt(text, 10) || 1)} keyboardType="number-pad" placeholder="1-12" /></View>
                            )} />
                            <Controller control={control} name="selected_day" render={({ field: { onChange, value } }) => (
                                <View className="flex-1 mt-3"><Label>Day</Label><Input value={value?.toString()} onChangeText={(text) => onChange(parseInt(text, 10) || 1)} keyboardType="number-pad" placeholder="1-31" /></View>
                            )} />
                        </View>
                    </View>
                )}

                {/* Specific Dates (Example) */}
                {frequency === 'specific_dates' && (
                    <Controller control={control} name="specific_dates" render={({ field: { onChange, value = [] } }) => (
                        <View className='mt-4'>
                            <Label>Specific Dates</Label>
                            <DatePicker value={null as any} onSelect={(date) => onChange([...value, date])}>
                                <View className="border border-input rounded-md p-2 mt-1"><Text>Add Date</Text></View>
                            </DatePicker>
                            <View className="flex-row flex-wrap gap-2 mt-2">
                                {value.map((date: any, index: number) => <Text key={index} className="bg-muted p-2 rounded">{date}</Text>)}
                            </View>
                        </View>
                    )} />
                )}

                <Controller
                    control={control}
                    name="timezone"
                    render={({ field: { onChange, value } }) => (
                        <View className='mt-4'>
                            <Label>Timezone</Label>
                            {/* Replace this with a proper Select/Picker component */}
                            {/* <View className="border border-input rounded-md p-2 mt-1">
                                <Text>{value || 'Select a timezone'}</Text>
                            </View> */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-2 -mx-4 px-4">
                                {commonTimezones.map(tz => (
                                    <Button
                                        key={tz}
                                        variant={value === tz ? 'default' : 'outline'}
                                        onPress={() => onChange(tz)}
                                        className='mr-1'
                                    >
                                        <Text>{tz.split('/')[1]?.replace('_', ' ') || tz}</Text>
                                    </Button>
                                ))}
                            </ScrollView>
                            {errors.timezone && <Text className="text-destructive text-xs mt-1">{errors.timezone.message}</Text>}
                        </View>
                    )}
                />

                <View className="flex-row items-center bg-muted rounded-full px-3 py-1.5 self-start mt-4">
                    <LucideIcon name="Clock" size={14} className="text-muted-foreground mr-2" />
                    <Text className="text-sm font-medium text-muted-foreground">
                        {summaryText}
                    </Text>
                </View>

                <View className='mt-4'>
                    <Label className="font-semibold">Delivery Options</Label>
                    <Controller
                        control={control}
                        name="delivery_options"
                        render={({ field: { onChange, value = {} } }) => (
                            <View className="space-y-3 mt-2">
                                {(deliveryOptions || deliveryOptionsConfig).map(option => (
                                    <View key={option.id} className="flex-row items-center">
                                        <Checkbox
                                            id={option.label}
                                            checked={!!value[option.id]}
                                            onCheckedChange={(checked) => onChange({ ...value, [option.id]: checked })}
                                            className='mr-2'
                                        />
                                        <Label
                                            // htmlFor={option.label}
                                            onPress={() => {
                                                onChange({ ...value, [option.id]: !value[option.id] })
                                            }}
                                        >
                                            {option.label}
                                        </Label>
                                    </View>
                                ))}
                            </View>
                        )}
                    />
                </View>

                {/* --- User Targeting --- */}
                <View className="mt-4">
                    <Label className="font-semibold text-lg">Select Users</Label>
                    <Controller
                        control={control}
                        name="target_all_users"
                        render={({ field: { onChange, value } }) => (
                            <View className="flex-row items-center my-2 mt-2">
                                <Checkbox id="all-users" checked={value} onCheckedChange={onChange} className='mr-2' />
                                <Label
                                    // htmlFor="all-users"
                                    onPress={() => onChange(!value)}
                                >Send to All Users</Label>
                            </View>
                        )}
                    />

                    {!targetAllUsers && (
                        <View>
                            <View className="relative">
                                <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                                    <LucideIcon name="Search" size={18} className="text-muted-foreground" />
                                </View>
                                <Input
                                    placeholder="Search users by name or email..."
                                    value={userSearchQuery}
                                    onChangeText={setUserSearchQuery}
                                    className="pl-10 h-12"
                                />
                                {isSearchingUsers && <ActivityIndicator className="absolute right-3 top-3.5" />}
                            </View>

                            {foundUsers.length > 0 && (
                                <View className="border border-border rounded-md mt-1 bg-card shadow-lg max-h-40">
                                    <FlatList
                                        data={foundUsers}
                                        keyExtractor={(item: any) => item.user_catalog_id.toString()}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity onPress={() => handleUserSelect(item)} className="p-3 border-b border-border">
                                                <Text>{item.first_name} {item.last_name}</Text>
                                                <Text className="text-sm text-muted-foreground">{item.user_email}</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>
                            )}

                            <View className="mt-4">
                                <Text className="text-muted-foreground mb-2">Selected Users ({selectedUsers.length}):</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {selectedUsers.map((user: any) => (
                                        <View key={user.user_catalog_id} className="flex-row items-center bg-secondary rounded-full pl-3 pr-2 py-1.5">
                                            <LucideIcon name="User" size={12} className="text-secondary-foreground mr-2" />
                                            <Text className="text-secondary-foreground text-sm font-medium">{user.first_name} {user.last_name}</Text>
                                            <TouchableOpacity onPress={() => handleUserRemove(user.user_catalog_id)} className="ml-2">
                                                <LucideIcon name="X" size={14} className="text-secondary-foreground" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </CardContent>
        </Card>
    );
};