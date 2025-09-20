import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
} from 'react';
import { Platform, View } from 'react-native';

type Mode = 'system' | 'light' | 'dark';
type Color = 'default' | 'mono' | 'claude' | 'vercel' | 'twitter' | 'supabase' | null;

interface ThemeContextValue {
    mode: Mode;
    color: Color;
    isDark: boolean;
    setMode: (m: Mode) => void;
    setColor: (c: Color) => void;
    openModel: boolean;
    setOpenModel: (open: boolean) => void;
    themeClass: string;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { colorScheme } = useColorScheme(); // Only read, never write
    const [mode, setMode] = useState<Mode>('system');
    const [color, setColor] = useState<Color>('default');
    const [openModel, setOpenModel] = useState<boolean>(false);
    const [loaded, setLoaded] = useState(false);

    // Load saved settings once on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedMode = await AsyncStorage.getItem('theme-mode') as Mode | null;
                const savedColor = await AsyncStorage.getItem('theme-color') as Color | null;

                if (savedMode && ['system', 'light', 'dark'].includes(savedMode)) {
                    setMode(savedMode);
                }

                if (savedColor !== null) {
                    setColor(savedColor);
                }

                setLoaded(true);

            } catch (error) {
                console.error('Error loading theme settings:', error);
                setLoaded(true);
            }
        };

        loadSettings();
    }, []); // Run only once

    // Save mode to storage when it changes
    useEffect(() => {
        if (loaded) {
            AsyncStorage.setItem('theme-mode', mode).catch(console.error);
        }
    }, [mode, loaded]);

    useEffect(() => {
        if (loaded) {
            if (color && color !== 'default') {
                AsyncStorage.setItem('theme-color', color).catch(console.error);
            } else {
                AsyncStorage.removeItem('theme-color').catch(console.error);
            }
        }
    }, [color, loaded]);

    // Determine if dark mode should be active
    const isDark = (() => {
        if (mode === 'system') {
            return colorScheme === 'dark';
        }
        return mode === 'dark';
    })();

    // const themeClass = `${isDark ? 'dark' : ''} ${color || ''}`.trim();
    const themeClass = React.useMemo(() => {
        try {
            const parts = [];

            // Add color theme first (if not default)
            if (color && color !== 'default') {
                parts.push(color);
            }

            // Add dark mode
            if (isDark) {
                parts.push('dark');
            }

            return parts.join('');
        } catch (error) {
            console.warn('Error constructing theme class:', error);
            return '';
        }
    }, [color, isDark]);

    useEffect(() => {
        if (Platform.OS === 'web' && loaded) {
            document.documentElement.className = themeClass;
        }
    }, [themeClass, loaded]);

    // Simple loading state
    // if (!loaded) {
    //     return <View style={{ flex: 1 }} />;
    // }

    return (
        <ThemeContext.Provider value={{
            mode,
            color,
            isDark,
            setMode,
            setColor,
            openModel,
            setOpenModel,
            themeClass
        }}>
            <View className={`${themeClass} flex-1 h-full w-full mx-auto`} style={{ maxWidth: 800 }}>
                {children}
            </View>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);