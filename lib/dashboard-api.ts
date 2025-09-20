import { WooCommerceAPIClient } from './woo-api-client'; // The client we created previously

// --- Type Definitions ---
export interface RevenueStats {
    totals: {
        orders_count: number,
        num_items_sold: number,
        gross_sales: number,
        total_sales: number,
        coupons: number,
        coupons_count: number,
        refunds: number,
        taxes: number,
        shipping: number,
        net_revenue: number,
        avg_items_per_order: number,
        avg_order_value: number,
        total_customers: number,
    };
    intervals: Array<{
        interval: string; // e.g., "2025-06-15"
        subtotals: {
            orders_count: number,
            num_items_sold: number,
            gross_sales: number,
            total_sales: number,
            coupons: number,
            coupons_count: number,
            refunds: number,
            taxes: number,
            shipping: number,
            net_revenue: number,
            avg_items_per_order: number,
            avg_order_value: number,
            total_customers: number,
        };
    }>;
}

export interface Leaderboard {
    id: string; // e.g., "products"
    label: string;
    headers: Array<{
        label: string
    }>
    // rows: Array<{
    //     id: number;
    //     label: string;
    //     values: Record<string, number | string>;
    // }>;
    rows: Array<{
        display: string;
        value: string;
    }>[];
}

// --- API Functions ---
export const fetchRevenueStats = async (apiClient: WooCommerceAPIClient, from: string, to: string): Promise<RevenueStats> => {
    const fields = ['gross_sales', 'refunds', 'coupons', 'net_revenue', 'taxes', 'shipping', 'total_sales', 'orders_count'];
    const params = {
        order: 'asc',
        interval: 'day',
        per_page: 100,
        after: `${from}T00:00:00`,
        before: `${to}T23:59:59`,
        fields: fields.join(','),
    };
    return apiClient.get('reports/revenue/stats', params);
};

export const fetchLeaderboards = async (apiClient: WooCommerceAPIClient, from: string, to: string): Promise<Leaderboard[]> => {
    const params = {
        after: `${from}T00:00:00`,
        before: `${to}T23:59:59`,
        per_page: 6,
    };
    return apiClient.get('leaderboards', params);
};

export const transformLeaderboardData = (leaderboard: Leaderboard | undefined, valueKey: string, valueLabel: string) => {
    if (!leaderboard) {
        return { headers: [], rows: [] };
    }

    const headers = [{ label: leaderboard.label }, { label: valueLabel }];
    const rows = leaderboard.rows.map(row => ([
        { display: row.label, value: row.label },
        { display: String(row.values[valueKey]), value: String(row.values[valueKey]) }
    ]));

    return { headers, rows };
};