import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
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
import { Badge } from '@/components/elements/Badge';
import { DatePicker } from '@/components/elements/DatePicker';
import { Switch } from '@/components/elements/Switch';
import { useImagePicker } from '@/hooks/useImagePicker';
import { MultiSelect, MultiSelectContent, MultiSelectItem, MultiSelectTrigger } from '@/components/elements/MultiSelect';
import { useHeader } from '@/context/header-context';
import { useDialogStore } from '@/store/dialogStore';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

interface ProductImage {
    id: number;
    src: string;
}

interface Product {
    manage_stock: boolean | undefined;
    categories: { id: number; name: string; }[] | ({ id?: number | undefined; name?: string | undefined; } | undefined)[] | undefined;
    date_on_sale_to: string | undefined;
    date_on_sale_from: string | undefined;
    sale_price: string | undefined;
    short_description: string | undefined;
    id: number;
    name: string;
    sku: string;
    price: string;
    regular_price: string;
    stock_quantity: number | null;
    stock_status: 'instock' | 'outofstock' | 'onbackorder';
    images: ProductImage[];
    status: 'publish' | 'draft' | 'pending' | 'private';
}

const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    short_description: z.string().optional(),
    regular_price: z.string().min(1, "Price is required"),
    sale_price: z.string().optional(),
    date_on_sale_from: z.string().optional(),
    date_on_sale_to: z.string().optional(),
    status: z.enum(['publish', 'draft', 'pending', 'private']),
    categories: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
    sku: z.string().optional(),
    manage_stock: z.boolean(),
    stock_quantity: z.number().nullable().optional(),
    images: z.array(z.object({ src: z.string() })).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

type ProductCategory = { id: number; name: string };

const ProductForm = ({
    control,
    errors,
    watch,
    categories,
    setValue
}: {
    control: any,
    errors: any,
    watch: any,
    categories: ProductCategory[],
    setValue: any
}) => {
    const { pickImage, uploadImage } = useImagePicker();
    const [isUploading, setIsUploading] = useState(false);

    const images = watch('images');
    const currentImageUrl = images?.[0]?.src;

    const handleImagePickAndUpload = async () => {
        const uris = await pickImage();
        if (uris && uris[0]) {
            setIsUploading(true);
            const uploadedUrl = await uploadImage(uris[0], 'product-images');
            console.log("uploadedUrl", uploadedUrl)
            if (uploadedUrl) {
                // Update the form state with the new public URL
                setValue('images', [{ src: uploadedUrl }], { shouldValidate: true });
            }
            setIsUploading(false);
        }
    };

    const manageStock = watch('manage_stock');

    return (
        // Use a ScrollView to ensure the form is scrollable on small devices
        <ScrollView contentContainerStyle={{ padding: 16 }} className="">
            <View className="">
                <Controller name="name" control={control} render={({ field }) => (
                    <View className="space-y-2 mb-2">
                        <Label>Product Name*</Label>
                        <Input placeholder="e.g., Cool T-Shirt" {...field} />
                        {errors.name && <Text className="text-destructive text-xs">{errors.name.message}</Text>}
                    </View>
                )} />

                <Controller name="short_description" control={control} render={({ field }) => (
                    <View className="space-y-2 mb-2">
                        <Label>Short Description</Label>
                        <Input placeholder="A brief, catchy description" multiline numberOfLines={3} {...field} />
                    </View>
                )} />

                <View className="flex-row gap-4">
                    <Controller name="regular_price" control={control} render={({ field }) => (
                        <View className="space-y-2 flex-1 mb-2">
                            <Label>Regular Price ($)*</Label>
                            <Input placeholder="19.99" keyboardType="numeric" {...field} />
                            {errors.regular_price && <Text className="text-destructive text-xs">{errors.regular_price.message}</Text>}
                        </View>
                    )} />
                    <Controller name="sale_price" control={control} render={({ field }) => (
                        <View className="space-y-2 flex-1 mb-2">
                            <Label>Sale Price ($)</Label>
                            <Input placeholder="14.99" keyboardType="numeric" {...field} />
                        </View>
                    )} />
                </View>

                <View className="web:flex-row gap-4">
                    <Controller name="date_on_sale_from" control={control} render={({ field: { onChange, value } }) => (
                        <View className="space-y-2 flex-1 mb-2">
                            <Label>Sale Start Date</Label>
                            {/* Assuming a DatePicker component that returns a string */}
                            <DatePicker value={value} onSelect={onChange} >
                                <View className="border border-input rounded-lg p-3 flex-row justify-between items-center bg-background">
                                    <Text className="text-foreground">{value || "Select a date"}</Text>
                                    <LucideIcon name="Calendar" size={16} className="text-muted-foreground" />
                                </View>
                            </DatePicker>


                        </View>
                    )} />
                    <Controller name="date_on_sale_to" control={control} render={({ field: { onChange, value } }) => (
                        <View className="space-y-2 flex-1 mb-2">
                            <Label>Sale End Date</Label>
                            <DatePicker value={value} onSelect={onChange} >
                                <View className="border border-input rounded-lg p-3 flex-row justify-between items-center bg-background">
                                    <Text className="text-foreground">{value || "Select a date"}</Text>
                                    <LucideIcon name="Calendar" size={16} className="text-muted-foreground" />
                                </View>
                            </DatePicker>
                        </View>
                    )} />
                </View>

                <Controller
                    name="categories"
                    control={control}
                    render={({ field }) => {
                        const selectedIds = field.value?.map((cat: any) => String(cat.id)) || [];

                        const handleChange = (ids: string[]) => {
                            const selectedCategories = categories.filter(cat => ids.includes(String(cat.id)));
                            field.onChange(selectedCategories);
                        };

                        return (
                            <View className="space-y-2 mb-2">
                                <Label>Categories</Label>
                                <MultiSelect
                                    options={categories.map(c => ({ label: c.name, value: String(c.id) }))}
                                    value={selectedIds}
                                    onChange={handleChange}
                                >
                                    <MultiSelectTrigger placeholder="Select categories..." />
                                    <MultiSelectContent>
                                        {categories.map((cat) => (
                                            <MultiSelectItem key={cat.id} value={String(cat.id)}>
                                                <Text>{cat.name}</Text>
                                            </MultiSelectItem>
                                        ))}
                                    </MultiSelectContent>
                                </MultiSelect>
                            </View>
                        );
                    }}
                />

                <Controller name="sku" control={control} render={({ field }) => (
                    <View className="space-y-2 mb-2">
                        <Label>SKU</Label>
                        <Input placeholder="SKU-12345" {...field} />
                    </View>
                )} />

                <Controller name="manage_stock" control={control} render={({ field: { onChange, value } }) => (
                    <View className="flex-row items-center justify-between p-2 rounded-lg bg-muted/50 mb-2">
                        <Label>Manage Stock?</Label>
                        <Switch checked={value} onCheckedChange={(e) => { onChange(e) }} />
                    </View>
                )} />

                {manageStock && (
                    <Controller name="stock_quantity" control={control} render={({ field: { onChange, ...field } }) => (
                        <View className="space-y-2 mb-2">
                            <Label>Stock Quantity</Label>
                            <Input
                                placeholder="100"
                                keyboardType="number-pad"
                                value={field.value?.toString() || ''}
                                onChangeText={(text) => onChange(text ? parseInt(text, 10) : null)}
                            />
                        </View>
                    )} />
                )}

                <Controller name="status" control={control} render={({ field: { onChange, value } }) => (
                    <View className="space-y-2 mb-2">
                        <Label>Status</Label>
                        <View className="flex-row gap-2">
                            {['publish', 'draft', 'pending'].map(status => (
                                <TouchableOpacity key={status} onPress={() => onChange(status)} className={`py-1 px-4 rounded-md border ${value === status ? 'bg-primary border-primary' : 'bg-input border-border'}`}>
                                    <Text className={`capitalize text-center font-medium ${value === status ? 'text-primary-foreground' : 'text-foreground'}`}>{status}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.status && <Text className="text-destructive text-xs">{errors.status.message}</Text>}
                    </View>
                )} />

                <View className="space-y-2 items-center mb-2 mt-2">
                    <Label className="self-start w-full text-start">Product Image</Label>
                    <TouchableOpacity onPress={handleImagePickAndUpload} disabled={isUploading}>
                        <View className="h-32 w-32 bg-muted rounded-lg border-2 border-dashed border-border items-center justify-center">
                            {isUploading ? (
                                <ActivityIndicator />
                            ) : currentImageUrl ? (
                                <Image source={{ uri: currentImageUrl }} className="h-full w-full rounded-lg" />
                            ) : (
                                <LucideIcon name="ImagePlus" size={32} className="text-muted-foreground" />
                            )}
                        </View>
                    </TouchableOpacity>
                    {/* Hidden input for react-hook-form to track the value */}
                    <Controller name="images" control={control} render={() => null as any} />
                </View>
            </View>
        </ScrollView>
    );
};

export default function ProductsPage() {
    const router = useRouter()
    const { session, storeSettings } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const { setTitle, setShowBack } = useHeader()
    const showDialog = useDialogStore((s) => s.showDialog);

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: { status: 'publish', manage_stock: false },
    });

    const wooApiClient = useMemo(() => {
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
    }, [storeSettings]);

    useEffect(() => {
        setTitle("Products");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Products");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    const fetchProducts = useCallback(async (pageNum: number, search: string) => {
        if (isLoading || !wooApiClient) return;
        setIsLoading(true);

        try {
            const newProducts: Product[] = await wooApiClient.get('products', {
                page: pageNum,
                per_page: 15,
                search,
            });

            setProducts(prev => (pageNum === 1 ? newProducts : [...prev, ...newProducts]));
            setHasMore(newProducts.length > 0);
        } catch (error: any) {
            handleApiError(error, "Fetch Error");
        } finally {
            setIsLoading(false);
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [isLoading, wooApiClient, isInitialLoading]);

    useEffect(() => {
        if (wooApiClient) {
            fetchProducts(1, '');
        } else if (storeSettings) {
            setIsInitialLoading(false);
        }
    }, [wooApiClient]);

    useEffect(() => {
        const fetchCategories = async () => {
            if (!wooApiClient) return;
            try {
                // Fetch all categories (you might want to paginate this for stores with many categories)
                const fetchedCategories = await wooApiClient.get('products/categories', { per_page: 100 });
                setCategories(fetchedCategories as any);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
            }
        };

        if (wooApiClient) {
            fetchCategories();
        }
    }, [wooApiClient]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setPage(1);
        fetchProducts(1, query);
    };

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchProducts(nextPage, searchQuery);
        }
    };

    const handleOpenDialog = (product: Product | null) => {
        setEditingProduct(product);
        // Reset the form with all the new fields
        reset(product ? {
            name: product.name,
            short_description: product.short_description,
            regular_price: product.regular_price,
            sale_price: product.sale_price,
            date_on_sale_from: product.date_on_sale_from,
            date_on_sale_to: product.date_on_sale_to,
            status: product.status,
            categories: product.categories,
            sku: product.sku,
            manage_stock: product.manage_stock,
            stock_quantity: product.stock_quantity,
            images: product.images,
        } : {
            name: '',
            short_description: '',
            regular_price: '',
            sale_price: '',
            date_on_sale_from: '',
            date_on_sale_to: '',
            status: 'publish',
            categories: [],
            sku: '',
            manage_stock: false,
            stock_quantity: null,
            images: [],
        });
        setIsDialogOpen(true);
    };

    const onFormSubmit = async (formData: ProductFormData) => {
        if (!wooApiClient) return;
        setIsSaving(true);
        try {
            let savedProduct: Product;
            if (editingProduct) {
                savedProduct = await wooApiClient.put(`products/${editingProduct.id}`, formData);
                setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
            } else {
                savedProduct = await wooApiClient.post('products', formData);
                setProducts(prev => [savedProduct, ...prev]);
            }
            handleApiSuccess(`Product ${editingProduct ? 'updated' : 'created'} successfully!`);
            setIsDialogOpen(false);
        } catch (error: any) {
            handleApiError(error, "Save Error");
        } finally {
            setIsSaving(false);
        }
    };

    const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity onPress={() => handleOpenDialog(item)} className="bg-card p-4 rounded-lg border border-border mb-4 flex-row items-center">
            <Avatar alt={item.name} className="h-16 w-16 rounded-md">
                <AvatarImage source={{ uri: item.images?.[0]?.src }} />
                <AvatarFallback>
                    <LucideIcon name="Image" size={24} className="text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <View className="ml-4 flex-1">
                <Text className="font-bold text-foreground" numberOfLines={2}>{item.name}</Text>
                <Text className="text-lg font-semibold text-primary mt-1">${item.price}</Text>
            </View>
            <View className="items-end">
                <Badge variant={item.stock_status === 'instock' ? 'default' : 'destructive'}>
                    <Text>{item.stock_quantity ?? item.stock_status}</Text>
                </Badge>
                <Text className="text-xs text-muted-foreground mt-2 capitalize">{item.status}</Text>
            </View>
        </TouchableOpacity>
    );

    if (!wooApiClient && !isInitialLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-background p-4">
                <LucideIcon name="PackageSearch" size={48} className="text-destructive mb-4" />
                <Text className="text-lg font-bold text-center">WooCommerce Not Configured</Text>
                <Text className="text-muted-foreground text-center mt-2">
                    Please configure your WooCommerce API credentials in the settings to view products.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <View className="p-4 border-b border-border flex-row justify-between items-center">
                <View className="flex-1 relative">
                    <Input placeholder="Search products..." value={searchQuery} onChangeText={handleSearch} className="pl-10 h-12" />
                    <View className="absolute left-3 top-3.5"><LucideIcon name="Search" size={20} className="text-muted-foreground" /></View>
                </View>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button onPress={() => handleOpenDialog(null)} className="ml-4"><LucideIcon name="Plus" size={18} className="text-primary-foreground" /></Button></DialogTrigger>
                    <DialogContent className='w-[90vw] max-w-md h-screen p-0'>
                        <DialogHeader className='p-6 pt-4 pb-2'><DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle></DialogHeader>
                        <ProductForm
                            control={control}
                            errors={errors}
                            watch={watch}
                            setValue={setValue}
                            categories={categories}
                        />
                        <DialogFooter className='p-6 pt-2 pb-2'>
                            <DialogClose asChild><Button variant="outline"><Text>Cancel</Text></Button></DialogClose>
                            <Button onPress={handleSubmit(onFormSubmit)} disabled={isSaving}>
                                {isSaving && <ActivityIndicator className="mr-2" color="white" />}
                                <Text>{editingProduct ? 'Save Changes' : 'Create Product'}</Text>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </View>

            {isInitialLoading ? (
                <View className="p-4 space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isLoading && !isInitialLoading ? <ActivityIndicator className="my-4" /> : null}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center mt-20">
                            <LucideIcon name="Package" size={48} className="text-muted-foreground" />
                            <Text className="text-muted-foreground mt-4">No products found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
