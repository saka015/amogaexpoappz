import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Alert, ScrollView, View, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as z from 'zod';
import { Text } from '@/components/elements/Text';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react-native';
import { Form, FormField, FormInput, FormItem, FormLabel, FormMessage } from '@/components/elements/form';
import { Button } from '@/components/elements/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/elements/Tabs';
import { expoFetchWithAuth, generateAPIUrl } from '@/lib/utils';
import { useAuth } from '@/context/supabase-provider';
import { handleApiError, handleApiSuccess, showToast } from '@/lib/toast-utils';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/elements/SelectDropdown';
import { PROVIDER_MODELS } from '@/lib/ai/utils';
import { useHeader } from '@/context/header-context';

const storeFormSchema = z.object({
	legal_business_name: z.string().nullish(),
	business_registration_no: z.string().readonly().nullish(),
	store_name: z.string().min(3, 'Store name must be at least 3 characters long.'),
	store_url: z.url('Must be a valid URL.'),
	store_email: z.email('Must be a valid email.'),
	store_mobile: z.string().optional(),
});

const wooCommerceFormSchema = z.object({
	url: z.string().url('WooCommerce URL must be a valid URL.'),
	consumerKey: z.string().startsWith('ck_', 'Must be a valid Consumer Key.'),
	consumerSecret: z.string().startsWith('cs_', 'Must be a valid Consumer Secret.'),
});

const aiFormSchema = z.object({
	provider: z.string("Please select a provider."),
	apiKey: z.string().min(10, 'API Key seems to short.'),
	model: z.string().min(1, 'Please select a model.'), // add model field
});


const StoreSettingsForm = ({ defaultValues, onSave }: { defaultValues: any; onSave: (data: any) => Promise<any> }) => {
	const [isSaving, setIsSaving] = useState(false);
	const form = useForm<z.infer<typeof storeFormSchema>>({
		resolver: zodResolver(storeFormSchema),
		defaultValues: defaultValues,
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const onSubmit = async (data: z.infer<typeof storeFormSchema>) => {
		setIsSaving(true);
		await onSave({ ...data, for_business_name: data.store_name, business_name: data.store_name });
		setIsSaving(false);
	};

	return (
		<Form {...form}>
			<ScrollView className="p-1">
				<View className="space-y-4">
					<FormField
						control={form.control}
						name="legal_business_name"
						render={({ field }) => (
							<FormInput formItemClassName='mt-1' label="Legal Business Name" placeholder="" {...field} value={field.value || ''} />
						)}
					/>
					<FormField
						control={form.control}
						name="business_registration_no"
						render={({ field }) => (
							<FormInput formItemClassName='mt-1' label="Business Registration No" placeholder="" {...field} readOnly value={field.value || ''} />
						)}
					/>
					<FormField
						control={form.control}
						name="store_name"
						render={({ field }) => (
							<FormInput formItemClassName='mt-1' label="Store Name" placeholder="" {...field} />
						)}
					/>
					<FormField
						control={form.control}
						name="store_url"
						render={({ field }) => (
							<FormInput
								formItemClassName='mt-1'
								label="Store URL"
								placeholder="https://yourstore.com"
								autoCapitalize="none"
								{...field}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="store_email"
						render={({ field }) => (
							<FormInput
								formItemClassName='mt-1'
								label="Store Email"
								placeholder="contact@yourstore.com"
								autoCapitalize="none"
								{...field}
							/>
						)}
					/>
					<FormField
						control={form.control}
						name="store_mobile"
						render={({ field }) => (
							<FormInput
								formItemClassName='mt-1'
								label="Store Mobile"
								keyboardType="phone-pad"
								{...field}
								value={field.value || ''}
							/>
						)}
					/>
					<Button onPress={form.handleSubmit(onSubmit)} disabled={isSaving} className="flex flex-row items-center justify-center mt-2">
						{isSaving ? <ActivityIndicator color="white" className="mr-2" /> : null}
						<Text>Save Store Settings</Text>
					</Button>
				</View>
			</ScrollView>
		</Form>
	);
};

const WooCommerceSettingsForm = ({
	defaultValues,
	onSave,
}: {
	defaultValues: any;
	onSave: (data: any) => Promise<any>;
}) => {
	const [isSaving, setIsSaving] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

	const form = useForm<z.infer<typeof wooCommerceFormSchema>>({
		resolver: zodResolver(wooCommerceFormSchema),
		defaultValues,
	});

	const formValues = form.watch();
	useEffect(() => {
		setTestResult(null);
	}, [JSON.stringify(formValues)]);

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleTestConnection = async () => {
		setIsTesting(true);
		setTestResult(null);
		// Get the current values from the form
		const values = form.getValues();
		try {
			const res = await fetch(generateAPIUrl('/api/woocommerce/test'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			});
			const result = await res.json();

			if (!res.ok) {
				setTestResult({ success: false, message: result.error || "An unknown error occurred." });
			} else {
				setTestResult({ success: true, message: result.message || "Connection successful!" });
			}
		} catch (error: any) {
			setTestResult({ success: false, message: "A network error occurred." });
		} finally {
			setIsTesting(false);
		}
	};

	const onSubmit = async (data: z.infer<typeof wooCommerceFormSchema>) => {
		setIsTesting(true);
		const testResponse = await fetch(generateAPIUrl('/api/woocommerce/test'), {
			method: 'POST',
			body: JSON.stringify(data),
		});
		setIsTesting(false);

		if (!testResponse.ok) {
			const result = await testResponse.json();
			showToast("Save Failed", "error", `Connection test failed: ${result.error}`);
			return; // Stop the save if the test fails
		}

		setIsSaving(true);
		await onSave(data);
		setIsSaving(false);
	};

	return (
		<Form {...form}>
			<View className="space-y-4">
				<FormField
					control={form.control}
					name="url"
					render={({ field }) => (
						<FormInput
							formItemClassName='mt-1'
							label="WooCommerce URL"
							placeholder="https://yourstore.com"
							autoCapitalize="none"
							{...field}
						/>
					)}
				/>
				<FormField
					control={form.control}
					name="consumerKey"
					render={({ field }) => (
						<FormInput formItemClassName='mt-1' label="Consumer Key" placeholder="ck_xxxxxxxxxx" secureTextEntry {...field} />
					)}
				/>
				<FormField
					control={form.control}
					name="consumerSecret"
					render={({ field }) => (
						<FormInput formItemClassName='mt-1' label="Consumer Secret" placeholder="cs_xxxxxxxxxx" secureTextEntry {...field} />
					)}
				/>
				<View className="flex flex-col items-center gap-4 mt-4">
					<Button
						onPress={handleTestConnection}
						disabled={isTesting}
						variant="outline"
						className="flex flex-row items-center w-full"
					>
						{isTesting ? (
							<ActivityIndicator color="white" className="mr-2" />
						) : null}
						<Text>Test Connection</Text>
					</Button>

					{testResult && (
						<View className="flex-row items-center flex-1">
							{testResult.success ? (
								<CheckCircle size={16} className="text-green-500 mr-2" />
							) : (
								<AlertCircle size={16} className="text-destructive mr-2" />
							)}
							<Text className={`text-sm font-medium ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
								{testResult.message}
							</Text>
						</View>
					)}
				</View>
				<Button onPress={form.handleSubmit(onSubmit)} disabled={isSaving} className="flex flex-row items-center justify-center mt-2">
					{isSaving ? <ActivityIndicator color="white" className="mr-2" /> : null}
					<Text>Save WooCommerce Settings</Text>
				</Button>
			</View>
		</Form>
	);
};

const AISettingsForm = ({ defaultValues, onSave }: { defaultValues: any; onSave: (data: any) => Promise<any> }) => {
	const [isSaving, setIsSaving] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
	const [search, setSearch] = useState('');
	const [customModel, setCustomModel] = useState('');
	const providers = Object.keys(PROVIDER_MODELS);

	const form = useForm<z.infer<typeof aiFormSchema>>({
		resolver: zodResolver(aiFormSchema),
		defaultValues: {
			...defaultValues,
			provider: defaultValues?.provider || providers[0],
			model: defaultValues?.model || PROVIDER_MODELS[defaultValues?.provider || providers[0]].default,
			apiKey: defaultValues?.apiKey || '',
		},
	});

	const formValues = form.watch();
	useEffect(() => {
		setTestResult(null);
	}, [JSON.stringify(formValues)]);

	useEffect(() => {
		form.reset({
			...defaultValues,
			provider: defaultValues?.provider || providers[0],
			model: defaultValues?.model || PROVIDER_MODELS[defaultValues?.provider || providers[0]].default,
			apiKey: defaultValues?.apiKey || '',
		});
		setCustomModel('');
	}, [defaultValues, form]);

	const onProviderSelect = (provider: string) => {
		form.setValue('provider', provider);
		form.setValue('model', PROVIDER_MODELS[provider]?.default || '');
		form.setValue('apiKey', '');
		setCustomModel('');
	};

	const onCustomModelSet = () => {
		if (customModel.trim()) {
			form.setValue('model', customModel.trim());
			triggerRef.current?.close();
		}
	};

	const handleTestConnection = async () => {
		setIsTesting(true);
		setTestResult(null);
		// Get the current values from the form to test them
		const values = form.getValues();
		try {
			const res = await fetch(generateAPIUrl('/api/ai/test'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values),
			});
			const result = await res.json();

			if (!res.ok) {
				setTestResult({ success: false, message: result.error || "An unknown error occurred." });
			} else {
				setTestResult({ success: true, message: result.message || "Connection successful!" });
			}
		} catch (error: any) {
			setTestResult({ success: false, message: "A network error occurred." });
		} finally {
			setIsTesting(false);
		}
	};

	const onSubmit = async (data: z.infer<typeof aiFormSchema>) => {
		setIsSaving(true);
		await onSave(data);
		setIsSaving(false);
	};

	const provider = form.watch('provider');
	const modelValue = form.watch('model');
	const modelInfo = PROVIDER_MODELS[provider]?.models?.[modelValue];
	const modelOptions = Object.entries(PROVIDER_MODELS[provider]?.models || {}).filter(
		([id, info]) => !search || id.toLowerCase().includes(search.toLowerCase()) || (info.name && info.name.toLowerCase().includes(search.toLowerCase()))
	);

	const triggerRef = React.useRef<React.ElementRef<typeof SelectTrigger>>(null);

	const insets = useSafeAreaInsets();
	const contentInsets = {
		top: insets.top,
		bottom: Platform.select({ ios: insets.bottom, android: insets.bottom + 24 }),
		left: 12,
		right: 12,
	};

	return (
		<Form {...form}>
			<View className="space-y-4">
				<FormField
					control={form.control}
					name="provider"
					render={({ field }) => (
						<FormItem>
							<FormLabel>AI Provider</FormLabel>
							<View className="flex-row gap-2 flex-wrap">
								{providers.map((p) => (
									<TouchableOpacity
										key={p}
										onPress={() => onProviderSelect(p)}
										className={`py-2 px-4 rounded-md border ${field.value === p ? 'bg-primary border-primary' : 'bg-input border-border'}`}
									>
										<Text className={`capitalize ${field.value === p ? 'text-primary-foreground' : 'text-foreground'}`}>{p}</Text>
									</TouchableOpacity>
								))}
							</View>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="model"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Model</FormLabel>
							<Select value={{ value: field.value, label: field.value }} onValueChange={(option) => { form.setValue("model", option?.value as string); setCustomModel('') }}>
								<SelectTrigger
									className='w-full'
									ref={triggerRef as any}
								>
									<SelectValue
										className='text-foreground text-sm native:text-lg'
										placeholder='Select a model'
									> {field.value ? (<Text className="text-primary">{field.value}</Text>) : "Select a model"} </SelectValue>
								</SelectTrigger>
								<SelectContent insets={contentInsets} className='w-fulll'>
									<SelectGroup>
										<TextInput
											placeholder="Search models..."
											value={search}
											onChangeText={setSearch}
											className="mb-2 border rounded px-2 py-2"
										/>
									</SelectGroup>
									<ScrollView className='max-h-36'>
										{modelOptions.map(([id, info]) => (
											<SelectItem label={id} value={id} key={id}>
												{id}
											</SelectItem>
										))}
									</ScrollView>
									<View className="mt-2 px-2">
										<Text className="mb-1 text-xs text-muted-foreground">Or enter a custom model name/id:</Text>
										<TextInput
											placeholder="Custom model name/id"
											value={customModel}
											onChangeText={setCustomModel}
											className="border rounded px-2 py-2 mb-2"
											autoCapitalize="none"
											onSubmitEditing={onCustomModelSet}
										/>
										<Button
											className="w-full"
											onPress={onCustomModelSet}
											disabled={!customModel.trim()}
										>
											<Text>Use Custom Model</Text>
										</Button>
									</View>
								</SelectContent>
							</Select>
							{modelValue ? (
								<View className="mt-3">
									{modelInfo ? (
										<View className="rounded-md border border-border bg-card p-3">
											<Text className="font-semibold text-base mb-1">{modelValue}</Text>
											{modelInfo.description ? (
												<Text className="text-xs mb-1 text-muted-foreground">{modelInfo.description}</Text>
											) : null}
											<Text className="text-xs">
												Context window: {modelInfo.contextWindow ?? 'N/A'} tokens{'\n'}
												Max tokens: {modelInfo.maxTokens ?? 'N/A'}{'\n'}
												Input price: {modelInfo.inputPrice !== undefined ? `$${modelInfo.inputPrice}/M` : 'N/A'}{'\n'}
												Output price: {modelInfo.outputPrice !== undefined ? `$${modelInfo.outputPrice}/M` : 'N/A'}{'\n'}
												{modelInfo.cacheReadsPrice !== undefined && `Cache read: $${modelInfo.cacheReadsPrice}/M\n`}
												{modelInfo.cacheWritesPrice !== undefined && `Cache write: $${modelInfo.cacheWritesPrice}/M\n`}
											</Text>
										</View>
									) : (
										<View className="rounded-md border border-warning bg-warning/10 p-3 flex-row items-center">
											<AlertCircle size={16} color="#f59e42" className="mr-2" />
											<Text className="text-warning font-semibold">No info for this model.</Text>
										</View>
									)}
								</View>
							) : null}
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="apiKey"
					render={({ field }) => (
						<FormInput formItemClassName='mt-1' label="API Key" placeholder="sk-xxxxxxxxxx" secureTextEntry {...field} />
					)}
				/>

				<View className="flex flex-col items-center gap-4 mt-4">
					<Button
						onPress={handleTestConnection}
						disabled={isTesting || !form.getValues('apiKey')}
						variant="outline"
						className="flex flex-row items-center w-full"
					>
						{isTesting ? (
							<ActivityIndicator color="white" className="mr-2" />
						) : null}
						<Text>Test AI Connection</Text>
					</Button>

					{testResult && (
						<View className="flex-row items-center flex-1">
							{testResult.success ? (
								<CheckCircle size={16} className="text-green-500 mr-2" />
							) : (
								<AlertCircle size={16} className="text-destructive mr-2" />
							)}
							<Text className={`text-sm font-medium ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
								{testResult.message}
							</Text>
						</View>
					)}
				</View>

				<Button onPress={form.handleSubmit(onSubmit)} disabled={isSaving} className="flex flex-row items-center justify-center mt-2">
					{isSaving ? <ActivityIndicator color="white" className="mr-2" /> : null}
					<Text>Save AI Settings</Text>
				</Button>
			</View>
		</Form>
	);
};


export default function SettingsScreen() {
	const { session, refreshUserDataAndSettings } = useAuth();
	const insets = useSafeAreaInsets();
	const [activeTab, setActiveTab] = useState<'store' | 'woocommerce' | 'ai'>('store');
	const [settings, setSettings] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { setTitle, setShowBack, setShow } = useHeader();


	const loadAllSettings = async () => {
		setIsLoading(true);
		try {
			const res = await expoFetchWithAuth(session)(generateAPIUrl('/api/store-settings'));
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to load settings.");
			setSettings(data);
		} catch (error: any) {
			console.error("Failed to load settings:", error);
			setSettings(null);
			handleApiError(error, "Failed to load settings");
		} finally {
			setIsLoading(false);
		}
	};

	const saveSettingsForTab = async (tab: 'store' | 'woocommerce' | 'ai', data: any) => {
		try {
			const res = await expoFetchWithAuth(session)(generateAPIUrl('/api/store-settings'), {
				method: 'POST',
				body: JSON.stringify({ tab, data }),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || `Failed to save ${tab} settings.`);
			handleApiSuccess(`Successfully saved ${tab} settings.`);
			loadAllSettings();
		} catch (error: any) {
			handleApiError(error, `Failed to save ${tab} settings`);
		} finally {
			await refreshUserDataAndSettings()
		}
	};

	useEffect(() => {
		loadAllSettings();
	}, []);

	useEffect(() => {
		setTitle("Store settings");
		setShowBack(false);
		setShow(true)
		return () => {
			setTitle("");
			setShowBack(false);
			setShow(true);
		};
		// eslint-disable-next-line
	}, [setTitle, setShowBack]);

	const TabButton = ({ label, value, current, onPress }: { label: string, value: string, current: string, onPress: () => void }) => (
		<TouchableOpacity
			onPress={onPress}
			className={`flex-1 py-3 items-center border-b-2 ${current === value ? 'border-primary' : 'border-transparent'}`}
		>
			<Text className={`font-semibold ${current === value ? 'text-primary' : 'text-muted-foreground'}`}>{label}</Text>
		</TouchableOpacity>
	);

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<View className="p-4 border-b border-border">
				<Text className="text-2xl font-bold text-foreground">Settings</Text>
				<Text className="text-muted-foreground">Manage your store and API configurations.</Text>
			</View>
			{/* <View className="flex-row border-b border-border">
				<TabButton label="Store" value="store" current={activeTab} onPress={() => setActiveTab('store')} />
				<TabButton label="WooCommerce" value="woocommerce" current={activeTab} onPress={() => setActiveTab('woocommerce')} />
				<TabButton label="AI APIs" value="ai" current={activeTab} onPress={() => setActiveTab('ai')} />
			</View> */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab as any}
				className='w-full mx-auto flex-col gap-1.5'
			>
				<TabsList className='flex-row'>
					<TabsTrigger value='store' className='flex-1'>
						<Text>Store</Text>
					</TabsTrigger>
					<TabsTrigger value='woocommerce' className='flex-1'>
						<Text>WooCommerce</Text>
					</TabsTrigger>
					<TabsTrigger value='ai' className='flex-1'>
						<Text>AI APIs</Text>
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<ScrollView contentContainerClassName="p-6">
				{isLoading ? (
					<ActivityIndicator size="large" className="mt-8" />
				) : (
					<View>
						{activeTab === 'store' && <StoreSettingsForm defaultValues={settings?.store || {}} onSave={(data) => saveSettingsForTab('store', data)} />}
						{activeTab === 'woocommerce' && <WooCommerceSettingsForm defaultValues={settings?.woocommerce || {}} onSave={(data) => saveSettingsForTab('woocommerce', data)} />}
						{activeTab === 'ai' && <AISettingsForm defaultValues={settings?.ai || {}} onSave={(data) => saveSettingsForTab('ai', data)} />}
					</View>
				)}
			</ScrollView>
		</View>
	);
}
