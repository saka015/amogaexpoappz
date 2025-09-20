import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/supabase-provider';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { supabase } from '@/config/supabase';

import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { Input } from '@/components/elements/Input';
import { Label } from '@/components/elements/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/elements/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/elements/Avatar';
import { Skeleton } from '@/components/elements/Skeleton';
import { handleApiError, handleApiSuccess } from '@/lib/toast-utils';
import { z } from 'zod';
import { useHeader } from '@/context/header-context';
import { useFocusEffect } from 'expo-router';
import { useImagePicker } from '@/hooks/useImagePicker';

export const profileSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    user_email: z.string().email("A valid email is required").readonly(), // Email is often used for login, so make it read-only in the form

    // Business Info - all optional but validated if present
    business_name: z.string().optional(),
    business_address_1: z.string().optional(),
    business_address_2: z.string().optional(),
    business_city: z.string().optional(),
    business_state: z.string().optional(),
    business_postcode: z.string().optional(),
    business_country: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const FormField = ({ label, children, error }: { label: any, children: any, error: any }) => (
    <View className="space-y-2">
        <Label>{label}</Label>
        {children}
        {error && <Text className="text-destructive text-xs">{error.message}</Text>}
    </View>
);

const ProfileSkeleton = () => (
    <View className="p-4 space-y-6 bg-background">
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    </View>
);

export default function ProfilePage() {
    const { userCatalog, refreshAuthData } = useAuth();
    const { setTitle, setShowBack } = useHeader()
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { pickImage, uploadImage } = useImagePicker();
    const [newProfilePic, setNewProfilePic] = useState<string | null>(null);
    const fullName = (userCatalog?.first_name || "fl").toString().trim();
    const [firstName, lastNameRaw] = fullName.split(" ");
    const lastName = lastNameRaw ? lastNameRaw : firstName.slice(1, 3);

    // This state will hold the full, non-editable user data
    const [fullProfile, setFullProfile] = useState<any>(null);

    const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
    });

    const fetchProfile = useCallback(async () => {
        if (!userCatalog?.user_catalog_id) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_catalog')
                .select('*')
                .eq('user_catalog_id', userCatalog.user_catalog_id)
                .single();

            if (error) throw error;
            if (data) {
                setFullProfile(data);
                // Populate the form with the fetched data
                reset({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    user_email: data.user_email || '',
                    business_name: data.business_name || '',
                    business_address_1: data.business_address_1 || '',
                    business_address_2: data.business_address_2 || '',
                    business_city: data.business_city || '',
                    business_state: data.business_state || '',
                    business_postcode: data.business_postcode || '',
                    business_country: data.business_country || '',
                });
            }
        } catch (error: any) {
            handleApiError(error, "Failed to load profile");
        } finally {
            setIsLoading(false);
        }
    }, [userCatalog, reset]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        setTitle("Profile");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Profile");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    const handlePickProfileImage = async () => {
        const uris = await pickImage();
        if (uris && uris.length > 0) {
            const selectedUri = uris[0];
            setNewProfilePic(selectedUri);
            if (!userCatalog?.user_catalog_id) return;
            setIsSaving(true);
            try {
                const uploadedUrl = await uploadImage(selectedUri, 'profile-pics');
                if (uploadedUrl) {
                    await supabase
                        .from('user_catalog')
                        .update({
                            profile_pic_url: uploadedUrl,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('user_catalog_id', userCatalog.user_catalog_id);
                    handleApiSuccess('Profile picture updated!');
                    setFullProfile((prev: any) => ({ ...prev, profile_pic_url: uploadedUrl }));
                    setNewProfilePic(null);
                    if (refreshAuthData) await refreshAuthData({ userCatalog: true });
                }
            } catch (error: any) {
                handleApiError(error, 'Failed to update profile picture');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const onSubmit = async (formData: ProfileFormData) => {
        if (!userCatalog?.user_catalog_id) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_catalog')
                .update({
                    first_name: formData.first_name,
                    // Note: We don't update email here as it's read-only
                    business_name: formData.business_name,
                    business_address_1: formData.business_address_1,
                    business_address_2: formData.business_address_2,
                    business_city: formData.business_city,
                    business_state: formData.business_state,
                    business_postcode: formData.business_postcode,
                    business_country: formData.business_country,
                    updated_at: new Date().toISOString(), // Update the timestamp
                })
                .eq('user_catalog_id', userCatalog.user_catalog_id);

            if (error) throw error;
            handleApiSuccess('Profile updated successfully!');
            setFullProfile((prev: any) => ({
                ...prev,
                ...formData,
            }));
        } catch (error: any) {
            handleApiError(error, 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <ProfileSkeleton />;
    }

    if (!fullProfile) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text>Could not load profile data.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="p-4">
                <View className="items-center mb-6">
                    <View className='flex justify-center items-center'>
                        <Avatar alt="Profile Picture" className="w-24 h-24">
                            <AvatarImage source={{ uri: fullProfile.profile_pic_url }} />
                            <AvatarFallback>
                                <Text className="text-3xl">{firstName?.[0]}{lastName?.[0]}</Text>
                            </AvatarFallback>
                        </Avatar>
                        <Button size="sm" className="mt-2 mb-2" onPress={handlePickProfileImage}>
                            <Text>{newProfilePic ? 'Change' : (fullProfile.profile_pic_url ? 'Change' : 'Add')} Photo</Text>
                        </Button>
                    </View>
                    <Text className="text-2xl font-bold text-foreground">{fullProfile.first_name} {fullProfile.last_name}</Text>
                    <Text className="text-muted-foreground">{fullProfile.user_mobile}</Text>
                </View>

                <View className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Update your personal details here.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Controller control={control} name="first_name" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="Full Name" error={errors.first_name}>
                                    <Input value={value} onChangeText={onChange} onBlur={onBlur} />
                                </FormField>
                            )} />
                            <Controller control={control} name="user_email" render={({ field: { value } }) => (
                                <FormField label="Email Address" error={errors.user_email}>
                                    <Input value={value} editable={false} className="bg-muted" />
                                </FormField>
                            )} />
                            <FormField label="Role" error={null}>
                                <Input value={(userCatalog.roles_json || []).join(", ")} editable={false} className="bg-muted" />
                            </FormField>
                            <FormField label="Account Status" error={null}>
                                <Input value={fullProfile.status || 'N/A'} editable={false} className="bg-muted" />
                            </FormField>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Business Information</CardTitle>
                            <CardDescription>Manage your business and address details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Controller control={control} name="business_name" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="Business Name" error={errors.business_name}>
                                    <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} />
                                </FormField>
                            )} />
                            <Controller control={control} name="business_address_1" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="Address Line 1" error={errors.business_address_1}>
                                    <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} />
                                </FormField>
                            )} />
                            <Controller control={control} name="business_address_2" render={({ field: { onChange, onBlur, value } }) => (
                                <FormField label="Address Line 2" error={errors.business_address_2}>
                                    <Input value={value || ''} onChangeText={onChange} onBlur={onBlur} />
                                </FormField>
                            )} />
                            <View className="flex-row gap-4">
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
                            <View className="flex-row gap-4">
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

                <Button onPress={handleSubmit(onSubmit)} disabled={isSaving || !isDirty} className="mt-8">
                    {isSaving ? <ActivityIndicator color="white" /> : <Text>Save Changes</Text>}
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}
