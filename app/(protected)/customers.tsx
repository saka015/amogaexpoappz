import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/context/supabase-provider';
import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { Input } from '@/components/elements/Input';
import { Skeleton } from '@/components/elements/Skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/elements/Avatar';
import LucideIcon from '@/components/LucideIcon';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/elements/TDialog';
import { Label } from '@/components/elements/Label';
import { handleApiError, handleApiSuccess } from '@/lib/toast-utils';
import { WooCommerceAPIClient } from '@/lib/woo-api-client';
import { useHeader } from '@/context/header-context';
import { useRouter } from 'expo-router';
import { useDialogStore } from '@/store/dialogStore';
import { useFocusEffect } from 'expo-router';

interface Customer {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    avatar_url: string;
    billing: { phone: string; city: string; };
}

const customerSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("A valid email is required"),
    billing: z.object({ phone: z.string().optional() }).optional(),
});
type CustomerFormData = z.infer<typeof customerSchema>;

const CustomerForm = ({ control, errors }: { control: any, errors: any }) => (
    <View className="">
        <Controller control={control} name="first_name" render={({ field: { onChange, onBlur, value } }) => (
            <View className="space-y-2 mb-3">
                <Label>First Name</Label>
                <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder="John" />
                {errors.first_name && <Text className="text-destructive text-xs">{errors.first_name.message}</Text>}
            </View>
        )} />
        <Controller control={control} name="last_name" render={({ field: { onChange, onBlur, value } }) => (
            <View className="space-y-2 mb-3">
                <Label>Last Name</Label>
                <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Doe" />
                {errors.last_name && <Text className="text-destructive text-xs">{errors.last_name.message}</Text>}
            </View>
        )} />
        <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
            <View className="space-y-2 mb-3">
                <Label>Email</Label>
                <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder="john.doe@email.com" keyboardType="email-address" autoCapitalize="none" />
                {errors.email && <Text className="text-destructive text-xs">{errors.email.message}</Text>}
            </View>
        )} />
        <Controller control={control} name="billing.phone" render={({ field: { onChange, onBlur, value } }) => (
            <View className="space-y-2 mb-3">
                <Label>Phone</Label>
                <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder="+1234567890" keyboardType="phone-pad" />
            </View>
        )} />
    </View>
);

export default function CustomersPage() {
    const router = useRouter()
    const { session, storeSettings, isFetchingStoreSettings } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { setTitle, setShowBack } = useHeader()
    const showDialog = useDialogStore((s) => s.showDialog);

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const { control, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
    });

    // Memoize the API client so it's not recreated on every render
    const wooApiClient = useMemo(() => {
        if (isFetchingStoreSettings) return null
        if (!storeSettings?.woocommerce?.url || !storeSettings?.woocommerce?.consumerKey || !storeSettings?.woocommerce?.consumerSecret) {
            showDialog({
                title: 'Configure WooCommerce Settings',
                description: 'Please set up your WooCommerce URL, Consumer Key, and Consumer Secret in the settings.',
                showCancel: false,
                actions: [
                    {
                        label: 'Go to Settings',
                        variant: 'default',
                        onPress: () => {
                            router.push('/store-settings');
                        },
                    }
                ],
            })
        } else {
            return new WooCommerceAPIClient(storeSettings.woocommerce);
        }
        return null;
    }, [storeSettings, isFetchingStoreSettings]);

    useEffect(() => {
        setTitle("Customers");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Customers");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    const fetchCustomers = useCallback(async (pageNum: number, search: string) => {
        if (isLoading || !wooApiClient) return;
        setIsLoading(true);

        try {
            const newCustomers: Customer[] = await wooApiClient.get('customers', {
                page: pageNum,
                per_page: 15,
                search,
                role: 'all'
            });

            setCustomers(prev => (pageNum === 1 ? newCustomers : [...prev, ...newCustomers]));
            setHasMore(newCustomers.length > 0);
        } catch (error: any) {
            handleApiError(error, "Fetch Error");
        } finally {
            setIsLoading(false);
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [isLoading, wooApiClient, isInitialLoading]);

    useEffect(() => {
        if (wooApiClient) {
            fetchCustomers(1, '');
        } else if (storeSettings) {
            setIsInitialLoading(false); // Settings loaded but no woo config
        }
    }, [wooApiClient]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setPage(1);
        fetchCustomers(1, query);
    };

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchCustomers(nextPage, searchQuery);
        }
    };

    const handleOpenDialog = (customer: Customer | null) => {
        setEditingCustomer(customer);
        reset(customer ? {
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            billing: { phone: customer.billing?.phone || '' }
        } : { first_name: '', last_name: '', email: '', billing: { phone: '' } });
        setIsDialogOpen(true);
    };

    const onFormSubmit = async (formData: CustomerFormData) => {
        if (!wooApiClient) return;
        setIsSaving(true);
        try {
            let savedCustomer: Customer;
            if (editingCustomer) {
                // Update
                savedCustomer = await wooApiClient.put(`customers/${editingCustomer.id}`, formData);
                setCustomers(prev => prev.map(c => c.id === savedCustomer.id ? savedCustomer : c));
            } else {
                // Create
                savedCustomer = await wooApiClient.post('customers', formData);
                setCustomers(prev => [savedCustomer, ...prev]);
            }
            handleApiSuccess(`Customer ${editingCustomer ? 'updated' : 'created'} successfully!`);
            setIsDialogOpen(false);
        } catch (error: any) {
            handleApiError(error, "Save Error");
        } finally {
            setIsSaving(false);
        }
    };

    const renderCustomer = ({ item }: { item: Customer }) => (
        <TouchableOpacity onPress={() => handleOpenDialog(item)} className="bg-card p-4 rounded-lg border border-border mb-4">
            <View className="flex-row items-center">
                <Avatar alt={`${item.first_name} ${item.last_name}`}>
                    <AvatarImage source={{ uri: item.avatar_url }} />
                    <AvatarFallback>
                        <Text>{item.first_name?.[0]}{item.last_name?.[0]}</Text>
                    </AvatarFallback>
                </Avatar>
                <View className="ml-4 flex-1">
                    <Text className="font-bold text-foreground">{item.first_name} {item.last_name}</Text>
                    <Text className="text-sm text-muted-foreground">{item.email}</Text>
                    <Text className="text-sm text-muted-foreground">{item.billing?.phone}</Text>
                </View>
                <LucideIcon name="ChevronRight" size={20} className="text-muted-foreground" />
            </View>
        </TouchableOpacity>
    );

    if (!wooApiClient && !isInitialLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-background p-4">
                <LucideIcon name="Unplug" size={48} className="text-destructive mb-4" />
                <Text className="text-lg font-bold text-center">WooCommerce Not Configured</Text>
                <Text className="text-muted-foreground text-center mt-2">
                    Please configure your WooCommerce API credentials in the settings to view customers.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <View className="p-4 border-b border-border flex-row justify-between items-center">
                <View className="flex-1 relative">
                    <Input placeholder="Search customers..." value={searchQuery} onChangeText={handleSearch} className="pl-10 h-12" />
                    <View className="absolute left-3 top-3.5"><LucideIcon name="Search" size={20} className="text-muted-foreground" /></View>
                </View>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button onPress={() => handleOpenDialog(null)} className="ml-4"><LucideIcon name="Plus" size={18} className="text-primary-foreground" /></Button></DialogTrigger>
                    <DialogContent className="w-[90vw] max-w-md">
                        <DialogHeader><DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle></DialogHeader>
                        <CustomerForm control={control} errors={errors} />
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline"><Text>Cancel</Text></Button></DialogClose>
                            <Button onPress={handleSubmit(onFormSubmit)} disabled={isSaving} className='flex-row'>
                                {isSaving && <ActivityIndicator className="mr-2" color="white" />}
                                <Text>{editingCustomer ? 'Save Changes' : 'Create Customer'}</Text>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </View>

            {isInitialLoading ? (
                <View className="p-4 space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</View>
            ) : (
                <FlatList
                    data={customers}
                    renderItem={renderCustomer}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isLoading && !isInitialLoading ? <ActivityIndicator className="my-4" /> : null}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center mt-20">
                            <LucideIcon name="Users" size={48} className="text-muted-foreground" />
                            <Text className="text-muted-foreground mt-4">No customers found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
