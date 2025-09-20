import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/supabase-provider';
import { Text } from '@/components/elements/Text';
import { Button } from '@/components/elements/Button';
import { WooCommerceAPIClient } from '@/lib/woo-api-client';
import { DateRangePicker } from '@/components/elements/DateRangePicker';
import { StatCard } from '@/components/store-sales-dashboard/StatCard';
import { LeaderboardTable } from '@/components/store-sales-dashboard/LeaderboardTable';
import { fetchRevenueStats, fetchLeaderboards, transformLeaderboardData, RevenueStats, Leaderboard } from '@/lib/dashboard-api';
import { Tabs, TabsList, TabsTrigger } from '@/components/elements/Tabs';
import { handleApiError } from '@/lib/toast-utils';
import { subDays } from 'date-fns';
import { MiniChartCard } from '@/components/store-sales-dashboard/MiniChartCard';
import ChartDisplay from '@/components/analyticassistant/chart-display';
import { Skeleton } from '@/components/elements/Skeleton';
import { useTheme } from '@/context/theme-context';
import { useHeader } from '@/context/header-context';
import { useDialogStore } from '@/store/dialogStore';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

export default function StoreSalesDashboardPage() {
    const router = useRouter()
    const { storeSettings } = useAuth();
    const { themeClass } = useTheme()
    const [activeTab, setActiveTab] = useState('overview');
    const [isLoading, setIsLoading] = useState(true);

    const [dateRange, setDateRange] = useState({
        startDate: toYYYYMMDD(subDays(new Date(), 30)),
        endDate: toYYYYMMDD(new Date()),
    });

    const [revenueData, setRevenueData] = useState<RevenueStats | null>(null);
    const [leaderboardData, setLeaderboardData] = useState<Leaderboard[] | null>(null);
    const { setTitle, setShowBack } = useHeader()
    const showDialog = useDialogStore((s) => s.showDialog);

    const wooApiClient = useMemo(() => {
        if (!storeSettings?.woocommerce?.url || !storeSettings?.woocommerce?.consumerKey || !storeSettings?.woocommerce?.consumerSecret) {
            showDialog({
                title: 'Configure WooCommerce Settings',
                description: 'Please set up your WooCommerce URL, Consumer Key, and Consumer Secret in the settings.',
                showCancel: false,
                actions: [
                    {
                        label: 'Go to Settings',
                        variant: 'default',
                        onPress: () => {
                            router.push('/store-settings');
                        },
                    }
                ],
            })
        } else {
            return new WooCommerceAPIClient(storeSettings.woocommerce, '/wc-analytics/');
        }
        return null;
    }, [storeSettings]);

    useEffect(() => {
        setTitle("Store Sales Board");
        setShowBack(false);
        return () => {
            setTitle("");
            setShowBack(false);
        };
    }, [setTitle, setShowBack]);

    useFocusEffect(
        useCallback(() => {
            setTitle("Store Sales Board");
            setShowBack(false);
        }, [setTitle, setShowBack])
    );

    const fetchData = useCallback(async () => {
        if (!wooApiClient || !dateRange.startDate || !dateRange.endDate) return;
        setIsLoading(true);
        try {
            const [revenue, leaderboards] = await Promise.all([
                fetchRevenueStats(wooApiClient, dateRange.startDate, dateRange.endDate),
                fetchLeaderboards(wooApiClient, dateRange.startDate, dateRange.endDate),
            ]);
            setRevenueData(revenue);
            setLeaderboardData(leaderboards);
        } catch (error: any) {
            handleApiError(error, "Failed to fetch dashboard data");
        } finally {
            setIsLoading(false);
        }
    }, [wooApiClient, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const findLeaderboard = (id: string) => leaderboardData?.find(lb => lb.id === id);

    const combinedSalesChartData = useMemo(() => {
        if (!revenueData) return null;
        const labels = revenueData.intervals.map(i => new Date(i.interval).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        return {
            type: 'line',
            title: 'Sales Performance',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Net Revenue',
                        data: revenueData.intervals.map(i => i.subtotals.net_revenue),
                        borderColor: '#4f46e5', // Indigo (Primary)
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 2,
                    },
                    {
                        label: 'Total Sales',
                        data: revenueData.intervals.map(i => i.subtotals.total_sales),
                        borderColor: '#22c55e', // Green
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 2,
                    },
                    {
                        label: 'Gross Sales',
                        data: revenueData.intervals.map(i => i.subtotals.gross_sales),
                        borderColor: '#f59e0b', // Amber
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderWidth: 2,
                    },
                    {
                        label: 'Taxes',
                        data: revenueData.intervals.map(i => i.subtotals.taxes),
                        borderColor: '#6366f1', // Indigo Light
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderDash: [5, 5], // Dashed line for secondary metric
                        borderWidth: 2,
                    },
                    {
                        label: 'Shipping',
                        data: revenueData.intervals.map(i => i.subtotals.shipping),
                        borderColor: '#0ea5e9', // Sky Blue
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderDash: [5, 5],
                        borderWidth: 2,
                    },
                    {
                        label: 'Coupons',
                        data: revenueData.intervals.map(i => i.subtotals.coupons),
                        borderColor: '#ef4444', // Red
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: false,
                        borderDash: [5, 5],
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' as const } }
            },
        };
    }, [revenueData]);

    // For the Overview mini charts
    const overviewChartMetrics = useMemo(() => {
        if (!revenueData) return { labels: [], datasets: {} };
        const labels = revenueData.intervals.map(i => i.interval);
        return {
            labels,
            datasets: {
                total_sales: revenueData.intervals.map(i => i.subtotals.total_sales),
                net_revenue: revenueData.intervals.map(i => i.subtotals.net_revenue),
                orders_count: revenueData.intervals.map(i => i.subtotals.orders_count),

                avg_order_value: revenueData.intervals.map(i => i.subtotals.avg_order_value),
                num_items_sold: revenueData.intervals.map(i => i.subtotals.num_items_sold),
                refunds: revenueData.intervals.map(i => i.subtotals.refunds),
                shipping: revenueData.intervals.map(i => i.subtotals.shipping),
                coupons_count: revenueData.intervals.map(i => i.subtotals.coupons_count),
                taxes: revenueData.intervals.map(i => i.subtotals.taxes),
            }
        };
    }, [revenueData]);

    const topProductsData = useMemo(() => transformLeaderboardData(findLeaderboard('products'), 'items_sold', 'Items Sold'), [leaderboardData]);
    const topCustomersData = useMemo(() => transformLeaderboardData(findLeaderboard('customers'), 'total_spend', 'Total Spend'), [leaderboardData]);

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-4">
                <View className="flex-row native:flex-col justify-between items-center">
                    <View className='native:mb-4'>
                        <Text className="text-2xl font-bold">Hi, Welcome back 👋</Text>
                    </View>
                    <DateRangePicker range={dateRange} onApply={setDateRange as any} />
                </View>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                    <TabsList className="flex flex-row">
                        <TabsTrigger value="overview"><Text>Overview</Text></TabsTrigger>
                        <TabsTrigger value="sales"><Text>Sales</Text></TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* --- Overview Tab --- */}
                {activeTab === 'overview' && (
                    <View className="mt-4">
                        <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Total Sales"
                                total={revenueData?.totals.total_sales || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.total_sales || []}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Net Sales"
                                total={revenueData?.totals.net_revenue || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.net_revenue || []}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Orders"
                                total={revenueData?.totals.orders_count || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.orders_count || []}
                                isCurrency={false}
                            />

                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Average order value"
                                total={revenueData?.totals.avg_order_value || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.avg_order_value || []}
                                isCurrency={false}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Items sold"
                                total={revenueData?.totals.num_items_sold || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.num_items_sold || []}
                                isCurrency={false}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Returns"
                                total={revenueData?.totals.refunds || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.refunds || []}
                                isCurrency={false}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Shipping"
                                total={revenueData?.totals.shipping || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.shipping || []}
                                isCurrency={false}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Discounted orders"
                                total={revenueData?.totals.coupons_count || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.coupons_count || []}
                                isCurrency={false}
                            />
                            <MiniChartCard
                                themeClass={themeClass}
                                isLoading={isLoading}
                                title="Taxes"
                                total={revenueData?.totals.taxes || 0}
                                labels={overviewChartMetrics.labels}
                                data={overviewChartMetrics.datasets.taxes || []}
                                isCurrency={false}
                            />
                        </View>
                        <View className='h-4' />
                        <LeaderboardTable
                            isLoading={isLoading}
                            title="Top Products - Items Sold"
                            data={findLeaderboard('products')}
                            valueKey="items_sold"
                            valueLabel="Items Sold"
                        />
                        <View className='h-4' />
                        <LeaderboardTable
                            isLoading={isLoading}
                            title="Top Customers - Total Spend"
                            data={findLeaderboard('customers')}
                            valueKey="total_spend"
                            valueLabel="Total Spend"
                        />
                    </View>
                )}

                {/* --- Sales Tab --- */}
                {activeTab === 'sales' && (
                    <View className="mt-4">
                        <View className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard isLoading={isLoading} title="Gross Sales" value={revenueData?.totals.gross_sales || 0} />
                            <StatCard isLoading={isLoading} title="Refunds" value={revenueData?.totals.refunds || 0} />
                            <StatCard isLoading={isLoading} title="Coupons" value={revenueData?.totals.coupons || 0} />
                            <StatCard isLoading={isLoading} title="Net Revenue" value={revenueData?.totals.net_revenue || 0} />
                            <StatCard isLoading={isLoading} title="Taxes" value={revenueData?.totals.taxes || 0} />
                            <StatCard isLoading={isLoading} title="Shipping" value={revenueData?.totals.shipping || 0} />
                            <StatCard isLoading={isLoading} title="Total Sales" value={revenueData?.totals.total_sales || 0} />
                            <StatCard isLoading={isLoading} title="Orders" value={revenueData?.totals.orders_count || 0} isCurrency={false} />
                        </View>

                        <View className='mt-4'>
                            {isLoading ? (
                                <View className="bg-card rounded-lg border border-border h-80">
                                    <Skeleton className="h-full w-full" />
                                </View>

                            ) : combinedSalesChartData && (
                                <ChartDisplay
                                    config={combinedSalesChartData}
                                    cardClass="p-4"
                                    themeClass={themeClass}
                                    dom={{
                                        matchContents: true
                                    }}
                                />
                            )}
                        </View>
                    </View>
                )}

            </View>
        </ScrollView>
    );
}
