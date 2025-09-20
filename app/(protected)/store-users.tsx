import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useAuth } from '@/context/supabase-provider';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/config/supabase';
import { toast } from 'sonner-native';
import { useImagePicker } from '@/hooks/useImagePicker';

import { storeUserSchema, StoreUserFormData } from '@/lib/schemas/storeUserSchema';

import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { Input } from '@/components/elements/Input';
import { Skeleton } from '@/components/elements/Skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/elements/Avatar';
import LucideIcon from '@/components/LucideIcon';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/elements/TDialog';
import { Label } from '@/components/elements/Label';
import { Badge } from '@/components/elements/Badge';
import { MultiSelect, MultiSelectTrigger, MultiSelectContent, MultiSelectItem } from '@/components/elements/MultiSelect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/elements/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/elements/SelectDropdown';
import { useHeader } from '@/context/header-context';
import { useFocusEffect } from 'expo-router';

interface StoreUser {
    user_catalog_id: number;
    first_name: string;
    last_name: string;
    user_email: string;
    user_mobile: string;
    profile_pic_url: string;
    roles_json: string[];
    status: "Active" | "Inactive" | undefined
}

const availableRoles = [
    { value: 'growstoreassistant', label: 'Grow Store Assistant' },
    { value: 'growstoreassistantadmin', label: 'AI Assistant Admin' },
    { value: 'storeuser', label: 'Store User' },
];

const availableStatus = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
];

const FormField = ({ label, children, error, className }: { label?: any, children: any, error: any, className?: string }) => (
    <View className={className}>
        {label && <Label className='mb-1 text-base'><Text>{label}</Text></Label>}
        {children}
        {error && <Text className="text-destructive text-xs mt-1">{error.message}</Text>}
    </View>
);

const StoreUserForm = ({ control, errors, isCreatingNew, newProfilePic, onPickImage, fullUser }: any) => (
    <ScrollView className="max-h-[70vh] px-1 py-2">
        <View className="">
            <View className="items-center">
                <Avatar alt="Profile Picture" className="w-24 h-24 mb-2">
                    <AvatarImage source={{ uri: newProfilePic || fullUser?.profile_pic_url }} />
                    <AvatarFallback><LucideIcon name="User" size={40} className="text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <Button size="sm" variant="outline" onPress={onPickImage}><Text>Change Photo</Text></Button>
            </View>

            <Card className='mt-6'>
                <CardHeader><CardTitle>User Information</CardTitle></CardHeader>
                <CardContent className="">
                    <Controller control={control} name="first_name" render={({ field }) => (
                        <FormField label="Full Name" error={errors.first_name}>
                            <Input {...field} />
                        </FormField>
                    )} />
                    <Controller control={control} name="user_email" render={({ field }) => (
                        <FormField className='mt-4' label="Email Address" error={errors.user_email}>
                            <Input {...field} keyboardType="email-address" autoCapitalize="none" editable={isCreatingNew} className={!isCreatingNew ? 'bg-muted' : ''} />
                            {!isCreatingNew && <Text className="text-xs text-muted-foreground mt-1">Email cannot be changed after creation.</Text>}
                        </FormField>
                    )} />
                    <Controller
                        control={control}
                        name="roles_json"
                        render={({ field: { onChange, value = [] } }) => (
                            <FormField label="Roles" className='mt-4' error={errors.roles_json}>
                                <MultiSelect value={value} onChange={onChange} options={availableRoles}>
                                    <MultiSelectTrigger placeholder="Select roles..." />
                                    <MultiSelectContent>
                                        {availableRoles.map(role => (
                                            <MultiSelectItem key={role.value} value={role.value}><Text>{role.label}</Text></MultiSelectItem>
                                        ))}
                                    </MultiSelectContent>
                                </MultiSelect>
                            </FormField>
                        )}
                    />
                    <Controller
                        control={control}
                        name="status"
                        render={({ field: { onChange, value } }) => (
                            <FormField label="Status" error={errors.status} className='mt-4'>
                                <Select value={{ value, label: value }} onValueChange={(v) => {
                                    onChange(v?.value)
                                }}>
                                    <SelectTrigger>
                                        <SelectValue
                                            className='text-foreground text-sm native:text-lg'
                                            placeholder='Select a status'
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableStatus.map(role => (
                                            <SelectItem key={role.value} value={role.value} label={role.label} />
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                        )}
                    />
                </CardContent>
            </Card>

            <Card className='mt-6'>
                <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>Manage your business and address details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Controller control={control} name="business_name" render={({ field: { onChange, onBlur, value } }) => (
                        <FormField label="Business Name" error={errors.business_name}>
                            <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} />
                        </FormField>
                    )} />
                    <Controller control={control} name="business_address_1" render={({ field: { onChange, onBlur, value } }) => (
                        <FormField className='mt-4' label="Address Line 1" error={errors.business_address_1}>
                            <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} />
                        </FormField>
                    )} />
                    <Controller control={control} name="business_address_2" render={({ field: { onChange, onBlur, value } }) => (
                        <FormField className='mt-4' label="Address Line 2" error={errors.business_address_2}>
                            <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} />
                        </FormField>
                    )} />
                    <View className="flex-row gap-4 mt-4">
                        <View className="flex-1">
                            <Controller control={control} name="business_city" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="City" error={errors.business_city}><Input value={value || ''} onChangeText={onChange} onBlur={onBlur} /></FormField>
                            )} />
                        </View>
                        <View className="flex-1">
                            <Controller control={control} name="business_state" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="State / Province" error={errors.business_state}><Input value={value || ''} onChangeText={onChange} onBlur={onBlur} /></FormField>
                            )} />
                        </View>
                    </View>
                    <View className="flex-row gap-4 mt-4">
                        <View className="flex-1">
                            <Controller control={control} name="business_postcode" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="Postcode / ZIP" error={errors.business_postcode}><Input value={value || ''} onChangeText={onChange} onBlur={onBlur} /></FormField>
                            )} />
                        </View>
                        <View className="flex-1">
                            <Controller control={control} name="business_country" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="Country" error={errors.business_country}><Input value={value || ''} onChangeText={onChange} onBlur={onBlur} /></FormField>
                            )} />
                        </View>
                    </View>
                </CardContent>
            </Card>
        </View>
    </ScrollView>
);

// --- Main Store Users Page Component ---
export default function StoreUsersPage() {
    const { userCatalog } = useAuth();
    const { setTitle, setShowBack } = useHeader()

    const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [searchInputValue, setSearchInputValue] = useState('');

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
    const [newProfilePic, setNewProfilePic] = useState<string | null>(null);
    const { pickImage, uploadImage } = useImagePicker();

    const { control, handleSubmit, reset, formState: { errors } } = useForm<StoreUserFormData>({
        resolver: zodResolver(storeUserSchema),
    });

    const PER_PAGE = 15;

    useEffect(() => {
        setTitle("Store users");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Store users");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchQuery(searchInputValue), 500);
        return () => clearTimeout(handler);
    }, [searchInputValue]);

    const fetchStoreUsers = useCallback(async (isRefresh = false) => {
        if (isLoading || (isRefreshing && !isRefresh)) return;
        if (!hasMore && !isRefresh) return;
        if (!userCatalog?.for_business_number) {
            setIsLoading(false); setIsRefreshing(false);
            return;
        }

        const currentPage = isRefresh ? 1 : page;
        isRefresh ? setIsRefreshing(true) : setIsLoading(true);

        try {
            const from = (currentPage - 1) * PER_PAGE;
            const to = from + PER_PAGE - 1;

            let query = supabase
                .from('user_catalog')
                .select('*', { count: 'exact' })
                .eq('for_business_number', userCatalog.for_business_number)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (debouncedSearchQuery) {
                query = query.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,user_email.ilike.%${debouncedSearchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            setStoreUsers(prev => (isRefresh ? data : [...prev, ...data] as any));
            setPage(currentPage + 1);
            setHasMore(data.length === PER_PAGE);

        } catch (error: any) {
            toast.error("Fetch Error", { description: error.message });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [userCatalog, page, hasMore, isLoading, isRefreshing, debouncedSearchQuery]);

    useEffect(() => {
        fetchStoreUsers(true);
    }, [debouncedSearchQuery]); // Now triggers on the debounced query

    const handleLoadMore = () => {
        fetchStoreUsers(false);
    };

    const handleOpenDialog = (user: StoreUser | null) => {
        setEditingUser(user);
        setNewProfilePic(null); // Reset any staged image
        reset(user ? { ...user, roles_json: user.roles_json || [] }
            :
            {
                first_name: '',
                user_email: '',
                roles_json: ['storeuser'],
                status: "Active",

                business_name: '',
                business_address_1: '',
                business_address_2: '',
                business_city: '',
                business_state: '',
                business_postcode: '',
                business_country: '',
            }
        );
        setIsDialogOpen(true);
    };

    const handlePickImage = async () => {
        const uris = await pickImage();
        if (uris && uris.length > 0) setNewProfilePic(uris[0]);
    };

    const onFormSubmit = async (formData: StoreUserFormData) => {
        if (!userCatalog) return;
        setIsSaving(true);
        let uploadedUrl: any = editingUser?.profile_pic_url;
        try {
            if (newProfilePic) {
                uploadedUrl = await uploadImage(newProfilePic, `profile-pics/${userCatalog.for_business_number || 'general'}`);
            }

            const payload = { ...formData, profile_pic_url: uploadedUrl };
            let error;

            if (editingUser) {
                const { user_email, ...updateData } = payload;
                ({ error } = await supabase.from('user_catalog').update(updateData).eq('user_catalog_id', editingUser.user_catalog_id));
            } else {
                const businessData = {
                    for_business_number: userCatalog.for_business_number,
                    for_business_name: userCatalog.for_business_name,
                    business_number: userCatalog.business_number,
                    business_name: userCatalog.business_name,
                    created_user_name: userCatalog.created_user_name,
                    created_user_id: userCatalog.user_catalog_id,
                };
                ({ error } = await supabase.from('user_catalog').insert({ ...payload, ...businessData }));
            }
            if (error) throw error;

            toast.success(`Store user ${editingUser ? 'updated' : 'created'} successfully!`);
            setIsDialogOpen(false);
            fetchStoreUsers(true); // Always refresh the list from page 1 after a save
        } catch (error: any) {
            toast.error("Save Error", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const renderUser = ({ item }: { item: StoreUser }) => (
        <TouchableOpacity onPress={() => handleOpenDialog(item)} className="bg-card p-4 rounded-lg border border-border mb-4">
            <View className="flex-row items-center">
                <Avatar alt={`${item.first_name} ${item.last_name}`}><AvatarImage source={{ uri: item.profile_pic_url }} /><AvatarFallback><Text>{item.first_name?.[0]}{item.last_name?.[0]}</Text></AvatarFallback></Avatar>
                <View className="ml-4 flex-1">
                    <View className="flex-row items-center">
                        <Text className="font-bold text-foreground">{item.first_name} {item.last_name}</Text>
                        {item.status && <Badge variant={item.status === 'Active' ? 'default' : 'secondary'} className="ml-2"><Text>{item.status}</Text></Badge>}
                    </View>
                    <Text className="text-sm text-muted-foreground">{item.user_email}</Text>
                    <View className="flex-row flex-wrap gap-1 mt-2">{(item.roles_json || []).map(role => <Badge key={role} variant="outline"><Text>{role}</Text></Badge>)}</View>
                </View>
                <LucideIcon name="ChevronRight" size={20} className="text-muted-foreground" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="p-4 border-b border-border flex-row justify-between items-center">
                <View className="flex-1 relative">
                    <Input placeholder="Search users..." value={searchInputValue} onChangeText={setSearchInputValue} className="pl-10 h-12" />
                    <View className="absolute left-3 top-3.5"><LucideIcon name="Search" size={20} className="text-muted-foreground" /></View>
                </View>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button onPress={() => handleOpenDialog(null)} className="ml-4"><LucideIcon name="Plus" size={18} className="text-primary-foreground" /></Button></DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-md p-0">
                        <DialogHeader className="p-6 border-b border-border"><DialogTitle>{editingUser ? 'Edit Store User' : 'New Store User'}</DialogTitle></DialogHeader>
                        <StoreUserForm control={control} errors={errors} isCreatingNew={!editingUser} newProfilePic={newProfilePic} onPickImage={handlePickImage} fullUser={editingUser} />
                        <DialogFooter className="p-6 py-4 border-t border-border">
                            <DialogClose asChild><Button variant="outline"><Text>Cancel</Text></Button></DialogClose>
                            <Button onPress={handleSubmit(onFormSubmit)} disabled={isSaving} className='flex flex-row'>
                                {isSaving && <ActivityIndicator className="mr-2" color="white" />}
                                <Text>{editingUser ? 'Save Changes' : 'Create User'}</Text>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </View>

            {isRefreshing && storeUsers.length === 0 ? (
                <View className="p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg mb-4" />)}</View>
            ) : (
                <FlatList
                    data={storeUsers}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.user_catalog_id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isLoading ? <ActivityIndicator className="my-4" /> : null}
                    onRefresh={() => fetchStoreUsers(true)}
                    refreshing={isRefreshing}
                    ListEmptyComponent={!isRefreshing && !isLoading ? (
                        <View className="flex-1 justify-center items-center mt-20">
                            <LucideIcon name="Users" size={48} className="text-muted-foreground" />
                            <Text className="text-muted-foreground mt-4">No store users found.</Text>
                        </View>
                    ) : null}
                />
            )}
        </SafeAreaView>
    );
}