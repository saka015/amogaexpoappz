import * as z from 'zod';
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import {
    MessageCircle,
    Phone,
    User as UserIcon,
    Mail,
    Shield,
    CheckCircle,
    ArrowRight,
    Loader2,
    ArrowLeft,
    RefreshCw,
    Lock,
    Eye,
    EyeOff,
} from 'lucide-react-native';
import { Session, User, WeakPassword } from '@supabase/supabase-js';
import { Label } from '../elements/Label';
import { Input } from '../elements/Input';
import { Button } from '../elements/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../elements/Card';
import LucideIcon from '../LucideIcon';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Text } from '../elements/Text';

// Schema for the Sign Up form
export const signUpSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
});
export type SignUpFormData = z.infer<typeof signUpSchema>;

// Schema for the Sign In with Password form
export const signInPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(1, "Password is required."), // Less strict as we don't know the user's pw length
});
export type SignInPasswordFormData = z.infer<typeof signInPasswordSchema>;

// Schema for the Sign In with OTP form
export const signInOtpSchema = z.object({
    emailOtp: z.string().email("Please enter a valid email address."),
});
export type SignInOtpFormData = z.infer<typeof signInOtpSchema>;

// --- Props Definition for the main component ---
interface MobileAuthProps {
    signIn: (email: string, password: string) => Promise<{ user: User; session: Session; weakPassword?: WeakPassword; } | boolean>;
    verifySendOtp: (user_email: string, user_phone: string, register?: boolean) => Promise<boolean>;
    verifyOtp: (otp: string, user_email: string, user_phone: string, password: string, name: string, register?: boolean) => Promise<boolean>;
    toast: (message: string, variant?: string) => void;
}

//OtpVerificationScreen

const OtpVerificationScreen = ({ onVerify, onResend, goBack, loading, activeTab, email, emailOtp }: any) => {
    const [otp, setOtp] = useState("");
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <TouchableOpacity onPress={goBack} className="absolute left-4 top-4 p-2"><ArrowLeft size={24} className="text-foreground" /></TouchableOpacity>
                <View className='flex flex-row justify-center'>
                    <View className="p-3 bg-green-100 rounded-full size-14"><Shield size={32} className="text-green-600" /></View>
                </View>
                <CardTitle>Enter OTP</CardTitle>
                <CardDescription>A 6-digit code was sent to {email || emailOtp}</CardDescription>
            </CardHeader>
            <CardContent>
                <View>
                    <View>
                        <Label>Verification Code</Label>
                        <Input
                            placeholder="000000"
                            value={otp}
                            onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
                            className="text-center text-3xl tracking-[10px] font-mono h-16"
                            maxLength={6}
                            keyboardType="number-pad"
                        />
                    </View>
                    <Button className='mt-3' onPress={() => onVerify(otp)} disabled={otp.length !== 6 || loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-bold">{activeTab === "signup" ? "Create Account" : "Sign In"}</Text>}
                    </Button>
                    <View className="items-center mt-3">
                        {countdown > 0 ? (
                            <Text className="text-muted-foreground">Resend in {countdown}s</Text>
                        ) : (
                            <TouchableOpacity onPress={onResend} className="flex-row items-center">
                                <RefreshCw size={16} className="text-primary mr-2" />
                                <Text className="text-primary font-semibold">Resend OTP</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </CardContent>
        </Card>
    );
};

export default function MobileAuth({ signIn, toast, verifySendOtp, verifyOtp }: MobileAuthProps) {
    const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
    const [step, setStep] = useState<"form" | "otp">("form");
    const [loading, setLoading] = useState(false);

    // Form data state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [emailOtp, setEmailOtp] = useState(""); // For signin with OTP
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [clickedSubmit, setClickedSubmit] = useState(false)

    // --- Validation Helpers ---
    const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isPasswordInvalid = () => password.length > 0 && password.length < 8;

    const resetForm = () => {
        setName("");
        setEmail("");
        setEmailOtp("");
        setPassword("");
        setStep("form");
    };

    const signUpForm = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: { name: '', email: '', password: '' },
    });

    const signInPasswordForm = useForm<SignInPasswordFormData>({
        resolver: zodResolver(signInPasswordSchema),
        defaultValues: { email: '', password: '' },
    });

    const signInOtpForm = useForm<SignInOtpFormData>({
        resolver: zodResolver(signInOtpSchema),
        defaultValues: { emailOtp: '' },
    });

    // --- Action Handlers ---
    const sendOTP = async (isRegister: boolean) => {
        setClickedSubmit(true)
        const emailToSend = isRegister ? email : emailOtp;
        if (!validateEmail(emailToSend)) {
            return toast("Please enter a valid email.", "error");
        }
        setLoading(true);
        const result = await verifySendOtp(emailToSend, "", isRegister);
        if (result) {
            setStep("otp");
        }
        setLoading(false);
    };

    const signInWithPassword = async () => {
        setClickedSubmit(true)
        if (!validateEmail(email) || password.length < 6) {
            return toast("Please enter a valid email and password.", "error");
        }
        setLoading(true);
        const result = await signIn(email, password);
        if (!result) {
            toast("Invalid credentials.", "error");
        }
        // On success, the parent `login.tsx` will navigate.
        setLoading(false);
    };

    const submitVerifyOTP = async (otp: string) => {
        setLoading(true);
        const isRegister = activeTab === "signup";
        await verifyOtp(otp, isRegister ? email : emailOtp, "", password, name, isRegister);
        // On success, the parent navigates.
        setLoading(false);
    };

    if (step === "otp") {
        return (
            <View className="flex-1 items-center justify-center p-3">
                <OtpVerificationScreen
                    onVerify={submitVerifyOTP}
                    onResend={() => sendOTP(activeTab === "signup")}
                    goBack={() => setStep("form")}
                    loading={loading}
                    activeTab={activeTab}
                    email={email}
                    emailOtp={emailOtp}
                />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                className="p-2"
                keyboardShouldPersistTaps="handled"
            >
                <Card className="w-full max-w-sm mx-auto shadow-lg">

                    <CardHeader className="text-center p-4">
                        <View className="pt-1 bg-card rounded-full mx-auto w-fit">
                            <LucideIcon name='MessageCircle' className="h-6 w-6 text-blue-600" />
                        </View>
                        <View className="justify-center">
                            <CardTitle className="text-xl text-center">stor.chat</CardTitle>
                            <CardTitle className="text-md text-center">Store AI Assistant</CardTitle>
                            <CardDescription className='text-center mt-1'>{activeTab === "signin" ? "Sign in to your account" : "Create an account to get started"}</CardDescription>
                        </View>
                    </CardHeader>
                    <CardContent>
                        <View className="flex-row bg-muted p-1 rounded-lg mb-4">
                            {/* <TouchableOpacity onPress={() => { setActiveTab("signin"); resetForm(); }} className={`flex-1 p-2 rounded-md ${activeTab === 'signin' ? 'bg-background shadow' : ''}`}><Text className={`text-center font-semibold ${activeTab === 'signin' ? 'text-foreground' : 'text-muted-foreground'}`}>Login</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => { setActiveTab("signup"); resetForm(); }} className={`flex-1 p-2 rounded-md ${activeTab === 'signup' ? 'bg-background shadow' : ''}`}><Text className={`text-center font-semibold ${activeTab === 'signup' ? 'text-foreground' : 'text-muted-foreground'}`}>Get Started</Text></TouchableOpacity> */}

                            <TouchableOpacity onPress={() => setActiveTab("signin")} className={`flex-1`}>
                                <Text className={`text-center font-semibold ${activeTab === 'signin' ? 'text-foreground bg-background shadow p-1 rounded-md' : 'text-muted-foreground p-1 rounded-md'}`}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveTab("signup")} className={`flex-1`}>
                                <Text className={`text-center font-semibold ${activeTab === 'signup' ? 'text-foreground bg-background shadow p-1 rounded-md' : 'text-muted-foreground p-1 rounded-md'}`}>Get Started</Text>
                            </TouchableOpacity>
                        </View>
                        {activeTab === 'signin' ? (
                            <View className="">
                                {/* Email & Password Form */}
                                <View>
                                    <Label>Email Address</Label>
                                    <Input placeholder="john@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" accessibilityLabel='signinEmail' />
                                </View>
                                <View className='mt-2'>
                                    <Label>Password</Label>
                                    <View className="relative">
                                        <Input placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} accessibilityLabel='signinPassword' />
                                        <Pressable onPress={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5"><EyeOff size={18} className="text-muted-foreground" /></Pressable>
                                    </View>
                                    <Text className={`text-xs mt-1 ${(clickedSubmit && isPasswordInvalid()) ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {isPasswordInvalid()
                                            ? "Password must be at least 8 characters"
                                            : ""}
                                    </Text>
                                </View>
                                <Button onPress={signInWithPassword} disabled={loading} accessibilityLabel='signin' className='flex flex-row mt-2'>
                                    {loading ? <ActivityIndicator /> : <LucideIcon name='Lock' className="mr-2 text-primary-foreground" size={15} />}
                                    <Text className="text-primary-foreground font-bold">Login</Text>
                                </Button>
                                {/* Separator */}
                                <View className="flex-row items-center my-2"><View className="flex-1 h-px bg-border" /><Text className="mx-4 text-muted-foreground text-sm">OR</Text><View className="flex-1 h-px bg-border" /></View>
                                {/* OTP Form */}
                                <View>
                                    <Label>Email Address</Label>
                                    <Input placeholder="john@example.com" value={emailOtp} onChangeText={setEmailOtp} keyboardType="email-address" autoCapitalize="none" accessibilityLabel='signinOtpEmail' />
                                </View>
                                <View className="bg-card p-2 rounded-lg border border-blue-200 my-2">
                                    <View className="flex flex-row items-center gap-2">
                                        <LucideIcon name="Shield" size={16} className=" text-blue-600" />
                                        <Text className="text-sm font-medium text-primary">OTP Verification</Text>
                                    </View>
                                    <Text className="text-xs text-blue-700">We'll send a verification code to your email.</Text>
                                </View>
                                <Button onPress={() => sendOTP(false)} disabled={loading} variant="secondary" accessibilityLabel='signinOtp' className='flex flex-row'>
                                    {loading ? <ActivityIndicator /> : <LucideIcon name='Lock' className="mr-2 text-primary" size={15} />}
                                    <Text className="text-secondary-foreground font-bold">Login</Text>
                                </Button>
                            </View>
                        ) : (
                            <View className="">
                                {/* Sign Up Form */}
                                <View className=''>
                                    <Label>Full Name</Label><Input placeholder="John Doe" value={name} onChangeText={setName} accessibilityLabel='registerFullName' />
                                </View>
                                <View className='mt-2'>
                                    <Label>Email Address</Label><Input placeholder="john@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" accessibilityLabel='registerEmail' />
                                </View>
                                <View className='mt-2'>
                                    <Label>Password</Label>
                                    <View className="relative">
                                        <Input placeholder="Minimum 8 characters" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} accessibilityLabel='registerPassword' />
                                        <Pressable onPress={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5"><EyeOff size={18} className="text-muted-foreground" /></Pressable>
                                    </View>
                                    {isPasswordInvalid() && <Text className="text-destructive text-xs mt-1">Password must be at least 8 characters</Text>}
                                </View>
                                <View className="bg-card p-2 rounded-lg border border-green-200 my-2">
                                    <View className="flex flex-row items-center gap-2">
                                        <LucideIcon name='Shield' className="text-green-600" size={16} />
                                        <View className="text-sm font-medium">
                                            <Text>Create Account</Text>
                                        </View>
                                    </View>
                                    <Text className="text-xs text-green-700">
                                        We'll send an OTP to your email to verify your account.
                                    </Text>
                                </View>
                                <Button onPress={() => sendOTP(true)} disabled={loading} accessibilityLabel='register' className='flex flex-row'>
                                    {loading ? <ActivityIndicator className='mr-2' /> : <></>}
                                    <Text className="text-primary-foreground font-bold">Create Account & Send OTP</Text>
                                </Button>
                            </View>
                        )}
                    </CardContent>
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}