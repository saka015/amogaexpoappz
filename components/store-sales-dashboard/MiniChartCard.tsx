import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/elements/Text';
import { Skeleton } from '@/components/elements/Skeleton';
import ChartDisplay from '../analyticassistant/chart-display'; // Your existing ChartDisplay

interface MiniChartCardProps {
    title: string;
    total: number | string;
    data: number[]; // An array of numbers for the chart
    labels: string[]; // Corresponding labels for the data points
    isLoading: boolean;
    isCurrency?: boolean;
    themeClass?: string;
}

export const MiniChartCard = ({ title, total, data, labels, isLoading, isCurrency = true, themeClass = '' }: MiniChartCardProps) => {
    if (isLoading) {
        return <Skeleton className="h-40 w-full rounded-lg" />;
    }

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: title,
                    data: data,
                    borderColor: '#5067FF', // Primary color
                    borderWidth: 2,
                    pointRadius: 0, // Hide points for a sparkline look
                    fill: false,
                    tension: 0.4,
                },
            ],
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                // x: { display: false }, // Hide X-axis
                // y: { display: false }, // Hide Y-axis
            },
        },
    };

    return (
        <View className="bg-card p-4 rounded-lg border border-border">
            <Text className="text-muted-foreground">{title}</Text>
            <Text className="text-2xl font-bold text-foreground mt-1">
                {isCurrency ? `RM ${Number(total).toFixed(2)}` : total}
            </Text>
            <View className="mt-2 h-[200px]">
                <ChartDisplay
                    config={chartConfig}
                    themeClass={`${themeClass} bg-card`}
                    minHeight={200}
                    dom={{
                        matchContents: true
                    }}
                />
            </View>
        </View>
    );
};