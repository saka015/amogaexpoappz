import React, { useState, useRef } from 'react';
import {
  Modal,
  Platform,
  TouchableOpacity,
  View,
  SafeAreaView,
  StyleSheet
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars'; // Import from the library
import { Button } from './Button';
import { Text } from './Text';

// Define the props for our component
type DatePickerProps = {
  value: string; // The selected date string, e.g., "2025-02-20"
  onSelect: (date: string) => void;
  children: React.ReactNode;
};

export const DatePicker = ({ value, onSelect, children }: DatePickerProps) => {
  // === WEB IMPLEMENTATION ===
  if (Platform.OS === 'web') {
    const inputRef = useRef<HTMLInputElement>(null);

    // This function programmatically opens the browser's native date picker
    const handleOpenPicker = () => {
      try {
        inputRef.current?.showPicker();
      } catch (error) {
        console.error("Browser does not support showPicker():", error);
      }
    };

    return (
      <View>
        <TouchableOpacity onPress={handleOpenPicker}>
          {children}
        </TouchableOpacity>
        {/* 
          This is a hidden input that handles the native date picking logic.
          Clicking the visible children component triggers this input.
        */}
        <input
          ref={inputRef}
          type="date"
          value={value || ''}
          onChange={(e) => onSelect(e.target.value)}
          style={styles.hiddenInput}
        />
      </View>
    );
  }

  // === MOBILE IMPLEMENTATION (iOS / Android) ===
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleDayPress = (day: DateData) => {
    onSelect(day.dateString);
    setIsModalVisible(false); // Close modal immediately on selection
  };

  return (
    <>
      <TouchableOpacity onPress={() => setIsModalVisible(true)}>
        {children}
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView className="flex-1 justify-center items-center bg-black/60">
          <View className="w-11/12 max-w-sm bg-card rounded-xl shadow-lg p-4">
            <Calendar
              current={value || new Date().toISOString().split('T')[0]}
              onDayPress={handleDayPress}
              markedDates={{
                [value]: {
                  selected: true,
                  disableTouchEvent: true,
                  selectedColor: '#007bff', // Or your primary theme color
                  selectedTextColor: 'white',
                },
              }}
              // You can customize the theme here to match your shadcn theme
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#007bff',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#007bff',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                arrowColor: '#007bff',
                monthTextColor: '#2d4150',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 16,
              }}
            />
            <Button variant="ghost" onPress={() => setIsModalVisible(false)} className="mt-4">
              <Text>Close</Text>
            </Button>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};


// StyleSheet for the hidden web input
const styles = StyleSheet.create({
    hiddenInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none'
    }
})