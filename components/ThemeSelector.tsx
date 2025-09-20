import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    Modal,
    Pressable,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/context/theme-context';
import { Text } from '@/components/elements/Text';
import { Button } from './elements/Button';
import LucideIcon from './LucideIcon';
import { DropdownMenuItem, DropdownMenuShortcut } from './elements/DropdownMenu';

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

export default function ThemeSelector({ }: { }) {
    const { mode, color, setMode, setColor, isDark, openModel: visible, setOpenModel: setVisible } = useTheme();
    // const [visible, setVisible] = useState(false);

    const themeClass = `${isDark ? 'dark' : ''} ${color}`;
    return (
        <>
            {/* {!isInMenu ? (
                <TouchableOpacity
                    onPress={() => setVisible(true)}
                    className="bg-muted px-4 py-2 rounded-xl border border-border"
                >
                    <Text className="text-muted-foreground">Open Theme Settings</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    onPress={() => setVisible(true)}
                    className="relative flex flex-row web:cursor-default gap-2 items-center rounded-sm px-2 py-1.5 native:py-2 web:outline-none web:focus:bg-accent active:bg-accent web:hover:bg-accent group"
                >
                    <Text><LucideIcon name="Palette" size={16} /></Text>
                    <Text>Theme Settings</Text>
                    <DropdownMenuShortcut>
                        <Text className="text-xs">Ctrl+T</Text>
                    </DropdownMenuShortcut>
                </TouchableOpacity>
            )} */}

            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={() => setVisible && setVisible(false)}
                className={`${themeClass}`}
            >
                <Pressable
                    className={`flex-1 bg-background/50 justify-center items-center px-4 ${themeClass}`}
                    onPress={() => setVisible && setVisible(false)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className="bg-background w-full rounded-2xl p-6 space-y-6 max-w-xl"
                    >
                        <Text className="text-foreground text-xl font-semibold text-center">
                            Theme Settings
                        </Text>

                        {/* Mode selection */}
                        <View className="mt-3">
                            <Text className="text-foreground text-base font-medium">Mode:</Text>
                            <View className="flex-row flex-wrap gap-2 mt-1">
                                {modes.map((m) => (
                                    <Button
                                        key={m}
                                        onPress={() => setMode(m)}
                                        variant={mode === m ? "default" : "secondary"}
                                    >
                                        <Text className="capitalize">{m}</Text>
                                    </Button>
                                ))}
                            </View>
                        </View>

                        {/* Color selection */}
                        <View className="mt-3">
                            <Text className="text-foreground text-base font-medium">Color Theme:</Text>
                            <View className="flex-row flex-wrap gap-2 mt-1">
                                {colors.map((c) => (
                                    <Button
                                        key={c}
                                        onPress={() => color !== c ? setColor(c) : setColor(null)}
                                        variant={color === c ? "default" : "secondary"}
                                    >
                                        <Text className="capitalize">{c}</Text>
                                    </Button>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={() => setVisible && setVisible(false)}
                            className="mt-6 bg-secondary px-4 py-2 rounded-lg self-center"
                        >
                            <Text className="text-secondary-foreground">Close</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
