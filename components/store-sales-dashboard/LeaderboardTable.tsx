import React from 'react';
import { Alert, View } from 'react-native';
import { Text } from '@/components/elements/Text';
import { Skeleton } from '@/components/elements/Skeleton';
import { Leaderboard } from '@/lib/dashboard-api';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../elements/table';
import { Button } from '../elements/Button';
import { cn } from '@/lib/utils';
import { FlashList } from '@shopify/flash-list';

interface LeaderboardTableProps {
    data: Leaderboard | undefined;
    isLoading: boolean;
    title: string;
    valueKey: string;
    valueLabel: string;
}

export const LeaderboardTable = ({ data, isLoading, title, valueKey, valueLabel }: LeaderboardTableProps) => {
    console.log("leadbord", title, "data", data)
    if (isLoading) {
        return <Skeleton className="h-64 w-full rounded-lg" />;
    }
    return (
        <View className="bg-card p-4 rounded-lg border border-border">
            <Text className="text-lg font-bold mb-4">{title}</Text>

            <Table aria-labelledby='invoice-table'>
                <TableHeader className='pb-2 border-b border-border'>
                    <TableRow className="flex-row border-b-border">
                        {data?.headers && data.headers.map((column) => (
                            <TableHead
                                key={column.label}
                                className="font-medium min-w-[120px] px-3 py-2"
                            >
                                <Text>{column.label}</Text>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data?.rows || []).map((row, index) => (
                        <TableRow key={index} className="flex-row border-b-border"
                        // className={cn('active:bg-secondary', index % 2 && 'bg-muted/40 ')}
                        >
                            {row.map((cell, cellIndex) => {
                                const cellValue = cell.value;
                                return (
                                    <TableCell
                                        key={`${index}-${cellIndex}`}
                                        className="min-w-[120px] px-3 py-2"
                                    >
                                        <Text numberOfLines={2} ellipsizeMode="tail">
                                            {cellValue}
                                        </Text>
                                    </TableCell>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </View>
    );
};