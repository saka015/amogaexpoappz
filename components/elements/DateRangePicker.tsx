import React, { useState } from 'react';
import { Modal, Platform, TouchableOpacity, View, SafeAreaView } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Button } from './Button';
import { Text } from './Text';
import LucideIcon from '../LucideIcon';
import { useTheme } from '@/context/theme-context';

type DateRange = { startDate: string | null; endDate: string | null };

type DateRangePickerProps = {
  range: DateRange;
  onApply: (range: DateRange) => void;
};

// Formats a date for display, e.g., "May 01, 2025"
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Select Date';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

export const DateRangePicker = ({ range, onApply }: DateRangePickerProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(range);
  const {themeClass} = useTheme()

  const handleDayPress = (day: DateData) => {
    if (!tempRange.startDate || (tempRange.startDate && tempRange.endDate)) {
      // Start new selection
      setTempRange({ startDate: day.dateString, endDate: null });
    } else {
      // Complete the range
      const newEndDate = new Date(day.dateString) > new Date(tempRange.startDate) ? day.dateString : tempRange.startDate;
      const newStartDate = new Date(day.dateString) > new Date(tempRange.startDate) ? tempRange.startDate : day.dateString;
      setTempRange({ startDate: newStartDate, endDate: newEndDate });
    }
  };

  const handleApply = () => {
    onApply(tempRange);
    setIsModalVisible(false);
  };
  
  const getMarkedDates = () => {
    let marked: any = {};
    if (tempRange.startDate) {
        marked[tempRange.startDate] = { startingDay: true, color: '#5067FF', textColor: 'white' };
        if (tempRange.endDate) {
            let currentDate = new Date(tempRange.startDate);
            const endDate = new Date(tempRange.endDate);
            while (currentDate <= endDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                marked[dateString] = { ...marked[dateString], color: '#D6DFFF', textColor: 'black' };
                currentDate.setDate(currentDate.getDate() + 1);
            }
            marked[tempRange.endDate] = { endingDay: true, color: '#5067FF', textColor: 'white' };
        }
    }
    return marked;
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        className="flex-row items-center bg-card border border-border rounded-md px-3 py-2"
      >
        <LucideIcon name="Calendar" size={16} className="text-muted-foreground mr-2" />
        <Text className="text-foreground">
            {formatDate(range.startDate)} - {formatDate(range.endDate)}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
        className={themeClass}
      >
        <SafeAreaView className="flex-1 justify-center items-center p-4">
          <View className="w-full max-w-sm bg-card rounded-xl shadow-lg">
            <Calendar
              current={tempRange.startDate || new Date().toISOString().split('T')[0]}
              onDayPress={handleDayPress}
              markingType="period"
              markedDates={getMarkedDates()}
              theme={{ /* Your custom theme from DatePicker.tsx */ }}
            />
            <View className="flex-row justify-end p-4 border-t border-border">
                <Button variant="ghost" onPress={() => setIsModalVisible(false)}><Text>Cancel</Text></Button>
                <Button onPress={handleApply} className="ml-2"><Text>Apply</Text></Button>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};