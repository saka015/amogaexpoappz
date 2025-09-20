import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';

interface SideDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isVisible, onClose, children }) => {
  const insets = useSafeAreaInsets();

  if (!isVisible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} className="z-50">

      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            className="bg-black/60" 
            onPress={onClose} 
          />
      </Animated.View>

      <Animated.View
        entering={SlideInRight.duration(300)}
        exiting={SlideOutRight.duration(300)}
        style={[
          styles.drawer,
          { paddingTop: insets.top, paddingBottom: insets.bottom }
        ]}
        className="absolute top-0 bottom-0 right-0 w-[85%] max-w-[400px] bg-background border-l border-border"
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 24,
      },
    }),
  },
});