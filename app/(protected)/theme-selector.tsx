import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@/context/theme-context';
import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/elements/Card';
import LucideIcon from '@/components/LucideIcon';
import { useHeader } from '@/context/header-context';
import { useFocusEffect, useRouter } from 'expo-router';

// Define the available colors and modes
type Color = 'default' | 'mono' | 'claude' | 'vercel' | 'twitter' | 'supabase' | null;
const colors: Array<Color> = [
    'default',
    'mono',
    'claude',
    'vercel',
    'twitter',
    'supabase'
];
const modes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];

export default function ThemeSelectorPage() {
    const { mode, color, setMode, setColor, themeClass } = useTheme();
    const router = useRouter();
    const { setTitle, setShowBack } = useHeader()

    useEffect(() => {
        setTitle("Theme Settings");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Theme Settings");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    // Small helper component for the selection buttons
    const OptionButton = ({ onPress, isActive, children }: { onPress: any, isActive: any, children: any }) => (
        <Button
            onPress={onPress}
            variant={isActive ? "default" : "secondary"}
            className="flex-grow"
        >
            <Text className="capitalize">{children}</Text>
        </Button>
    );

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="p-4">
                <View className="">
                    {/* --- Mode Selection Card --- */}
                    <Card className='mt-6'>
                        <CardHeader>
                            <CardTitle>Appearance Mode</CardTitle>
                            <CardDescription>
                                Choose how the app looks. 'System' will match your device's settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <View className="flex-row flex-wrap gap-2">
                                {modes.map((m) => (
                                    <OptionButton
                                        key={m}
                                        onPress={() => setMode(m)}
                                        isActive={mode === m}
                                    >
                                        {m}
                                    </OptionButton>
                                ))}
                            </View>
                        </CardContent>
                    </Card>

                    {/* --- Color Theme Selection Card --- */}
                    <Card className='mt-6'>
                        <CardHeader>
                            <CardTitle>Color Theme</CardTitle>
                            <CardDescription>
                                Select a color accent for the user interface.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <View className="flex-row flex-wrap gap-2">
                                {colors.map((c) => (
                                    <OptionButton
                                        key={c}
                                        // Toggle off if the same color is clicked again
                                        onPress={() => color !== c ? setColor(c) : setColor(null)}
                                        isActive={color === c}
                                    >
                                        {c || 'None'}
                                    </OptionButton>
                                ))}
                            </View>
                        </CardContent>
                    </Card>

                    {/* --- Theme Preview Section --- */}
                    {/* <Card>
                        <CardHeader>
                            <CardTitle>Theme Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Text className="text-foreground">This is how your primary text will look.</Text>
                            <Text className="text-muted-foreground">This is muted text for descriptions.</Text>
                            <View className="flex-row gap-4">
                                <Button variant="default"><Text>Primary</Text></Button>
                                <Button variant="secondary"><Text>Secondary</Text></Button>
                                <Button variant="destructive"><Text>Destructive</Text></Button>
                            </View>
                        </CardContent>
                    </Card> */}

                    <View className='flex flex-row justify-end mt-4'>
                        <Button variant="default" onPress={() => { router.push("/") }} className='px-6'>
                            <Text>Cancel</Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}