import { tool, type Tool, type ToolExecutionOptions } from "ai"
import { z } from "zod"
import { createChartConfig } from "./chart-helper"
import { runUserCode } from "./sandbox-runner"

interface WooCommerceConfig {
    url: string
    consumerKey: string
    consumerSecret: string
}

interface APIResponse<T> {
    data: T[]
    total: number
    totalPages: number
    currentPage: number
    perPage: number
}

export function createInjectedAndLoggedTool(
    config: {
        name: string;
        description: string;
        parameters: z.ZodType<any, any, any>;
        execute: (args: any, injected?: any) => Promise<any>;
    },
    injectedParams?: any
): Tool<any, any> {
    const sdkCompatibleExecute = async (
        args: any,
        options: ToolExecutionOptions
    ): Promise<any> => {
        const toolName = config.name;
        console.log(`\n--- 🛠️ EXECUTING TOOL: ${toolName} ---`);
        console.log('   Arguments:', JSON.stringify(args, null, 2));

        try {
            // Conditionally call the appropriate execute function
            const result =
                injectedParams !== undefined
                    ? await config.execute(args, injectedParams) // Call with injected params
                    : await config.execute(args); // Call without injected params

            console.log('   ✅ Result:', JSON.stringify(result));
            console.log(`--- ✅ TOOL ${toolName} FINISHED ---\n`);
            return result;
        } catch (error) {
            console.error(`   🔴 ERROR in tool ${toolName}:`, error);
            console.log(`--- 🔴 TOOL ${toolName} FAILED ---\n`);
            throw error;
        }
    };

    return tool({
        description: config.description,
        parameters: config.parameters,
        execute: sdkCompatibleExecute,
    });
}

/**
 * Automatically handles pagination to fetch all items from a WooCommerce API endpoint.
 * @param wooAPI The WooCommerce API client instance.
 * @param endpoint The endpoint to fetch from (e.g., 'products', 'orders', 'coupons').
 * @param params The initial query parameters. The function will manage the 'page' parameter.
 * @returns A promise that resolves to an array of all items.
 */
async function fetchAll(
    wooAPI: WooCommerceAPI,
    endpoint: string,
    params: Record<string, any> = {}
): Promise<any[]> {
    let allItems: any[] = [];
    let currentPage = 1;
    const perPage = params.per_page || 100;
    let keepFetching = true;

    console.log("fetchAll", endpoint, params)

    while (keepFetching) {
        const currentParams = { ...params, per_page: perPage, page: currentPage };

        // It should call the internal makeRequest, not a tool.
        // And we check the `data` property of the response.
        const response = await (wooAPI as any).makeRequest(endpoint, currentParams);

        if (response && Array.isArray(response.data) && response.data.length > 0) {
            allItems = allItems.concat(response.data);
            currentPage++;
        } else {
            keepFetching = false;
        }
    }
    console.log("allItemsallItems", allItems)
    return allItems;
}

export class WooCommerceAPI {
    private config: WooCommerceConfig
    private baseUrl: string

    constructor(config: WooCommerceConfig) {
        this.config = config
        // Clean up URL and ensure it's properly formatted
        const cleanUrl = config.url.replace(/\/$/, "")
        this.baseUrl = `${cleanUrl}/wp-json/wc/v3`
    }

    private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<APIResponse<T>> {
        try {
            // const url = new URL(`${this.baseUrl}${endpoint}`)
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const url = new URL(`${this.baseUrl}${cleanEndpoint}`);

            // Add authentication
            url.searchParams.append("consumer_key", this.config.consumerKey)
            url.searchParams.append("consumer_secret", this.config.consumerSecret)

            // Add other parameters
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, value.toString())
                }
            })

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "WooCommerce-Analytics-Agent/1.0",
                },
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown error")
                throw new Error(`WooCommerce API Error: ${response.status} - ${errorText}`)
            }

            const data = await response.json()

            // Extract pagination info from headers
            const total = Number.parseInt(response.headers.get("X-WP-Total") || "0")
            const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "1")
            const currentPage = Number.parseInt(params.page || "1")
            const perPage = Number.parseInt(params.per_page || "20")

            return {
                data: Array.isArray(data) ? data : [data],
                total,
                totalPages,
                currentPage,
                perPage,
            }
        } catch (error: any) {
            // CATCH SPECIFIC FETCH/NETWORK ERRORS
            if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
                const cause = error.cause as { code: string };
                if (cause.code === 'ENOTFOUND' || cause.code === 'ECONNREFUSED' || cause.code === 'ETIMEDOUT') {
                    // This is a definitive network error
                    throw new Error(`Network Error: Unable to connect to the store at ${this.config.url}. Please ask the user to verify the URL is correct and the store is online.`);
                }
            }
            // Fallback for other generic fetch errors
            if (error.message.includes("fetch")) {
                throw new Error(`Network Error: A connection could not be made to ${this.config.url}. The server may be down or a firewall may be blocking the connection.`);
            }
            // Re-throw other types of errors
            throw error;
        }
    }

    async testConnection() {
        try {
            await this.makeRequest("/")
            return true
        } catch (error) {
            throw new Error(`Connection test failed: ${(error as any).message}`)
        }
    }

    async getProducts(params: Record<string, any> = {}) {
        return this.makeRequest("/products", {
            orderby: "date",
            order: "desc",
            ...params,
        })
    }

    async getOrders(params: Record<string, any> = {}) {
        return this.makeRequest("/orders", {
            orderby: "date",
            order: "desc",
            ...params,
        })
    }

    async getCoupons(params: Record<string, any> = {}) {
        return this.makeRequest("/coupons", params)
    }

    async getCustomers(params: Record<string, any> = {}) {
        return this.makeRequest("/customers", {
            orderby: "registered_date",
            order: "desc",
            ...params,
        })
    }

    async getReports() {
        const reports: any = {}

        try {
            const salesReport = await this.makeRequest("/reports/sales")
            reports.sales = salesReport.data
        } catch (error) {
            console.warn("Sales reports not available:", (error as any).message)
            reports.sales = []
        }

        try {
            const topSellersReport = await this.makeRequest("/reports/top_sellers")
            reports.top_sellers = topSellersReport.data
        } catch (error) {
            console.warn("Top sellers report not available:", (error as any).message)
            reports.top_sellers = []
        }

        return reports
    }

    // Helper method to get basic store stats
    async getStoreStats() {
        try {
            const [products, orders, customers] = await Promise.allSettled([
                this.getProducts({ per_page: 1 }),
                this.getOrders({ per_page: 10 }),
                this.getCustomers({ per_page: 1 }),
            ])

            const stats: any = {
                totalProducts: 0,
                recentOrders: [],
                totalCustomers: 0,
                totalRevenue: 0,
            }

            if (products.status === "fulfilled") {
                stats.totalProducts = products.value.total
            }

            if (orders.status === "fulfilled") {
                stats.recentOrders = orders.value.data
                stats.totalRevenue = orders.value.data.reduce((sum: any, order: any) => {
                    return sum + (Number.parseFloat(order.total) || 0)
                }, 0)
            }

            if (customers.status === "fulfilled") {
                stats.totalCustomers = customers.value.total
            }

            return stats
        } catch (error) {
            throw new Error(`Failed to get store stats: ${(error as any).message}`)
        }
    }

    async getStoreOverview(period: 'week' | 'month' | 'last_month' | 'year' = 'month') {
        const today = new Date();
        let afterDate: string | undefined;

        switch (period) {
            case 'week':
                afterDate = new Date(today.setDate(today.getDate() - 7)).toISOString();
                break;
            case 'month':
                afterDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
                break;
            case 'last_month':
                afterDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
                break;
            case 'year':
                afterDate = new Date(today.getFullYear(), 0, 1).toISOString();
                break;
        }

        const [products, orders, customers, coupons] = await Promise.all([
            this.getProducts({ per_page: 1 }),
            this.getOrders({ after: afterDate, per_page: 100, status: 'completed,processing' }), // fetch more to calculate totals
            this.getCustomers({ after: afterDate, per_page: 1 }),
            this.getCoupons({ per_page: 1 }),
        ]);

        const totalRevenue = orders.data.reduce((sum: number, order: any) => sum + parseFloat(order.total || '0'), 0);
        const top5Products = orders.data
            .flatMap((o: any) => o.line_items)
            .reduce((acc, item) => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
                return acc;
            }, {} as Record<string, number>);

        const sortedTop5 = Object.entries(top5Products)
            .sort(([, a]: any, [, b]: any) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }));

        return {
            period,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalOrders: orders.total,
            totalNewCustomers: customers.total,
            averageOrderValue: orders.total > 0 ? parseFloat((totalRevenue / orders.total).toFixed(2)) : 0,
            topSellingProducts: sortedTop5,
            totalProductsInStore: products.total,
            totalCouponsAvailable: coupons.total
        };
    }

    // New method to get data with flexible parameters
    async getData(endpoint: string, params: Record<string, any> = {}) {
        return this.makeRequest(endpoint, params)
    }
}

export const createWooCommerceTools = (wooAPI: any | null) => ({
    getProducts: createInjectedAndLoggedTool({
        name: "getProducts",
        description: "Fetch products from WooCommerce store with flexible parameters",
        parameters: z.object({
            per_page: z.number().optional().default(20).describe("Number of products to fetch"),
            page: z.number().optional().default(1).describe("Page number for pagination"),
            orderby: z.enum(["date", "id", "include", "title", "slug", "modified"]).optional().default("date"),
            order: z.enum(["asc", "desc"]).optional().default("desc"),
            status: z.enum(["any", "draft", "pending", "private", "publish"]).optional().default("publish"),
            category: z.string().optional().describe("Product category ID or slug"),
            search: z.string().optional().describe("Search term for products"),
            after: z.string().optional().describe("ISO date string to get products after this date"),
            before: z.string().optional().describe("ISO date string to get products before this date"),
            stock_status: z.enum(["instock", "outofstock", "onbackorder"]).optional().default("instock"),
            on_sale: z.boolean().optional().describe("Set to true to fetch only on-sale products."),
            featured: z.boolean().optional().describe("Set to true to fetch only featured products."),
            min_price: z.string().optional().describe("Minimum price for the product range."),
            max_price: z.string().optional().describe("Maximum price for the product range."),
        }),
        execute: async ({ per_page, page, orderby, order, status, category, search, after, before }) => {
            if (!wooAPI) {
                return {
                    success: false,
                    error: "WooCommerce API is not configured. Please guide the user to the settings page.",
                };
            }
            try {


                const params = {
                    per_page,
                    page,
                    orderby,
                    order,
                    status,
                    ...(category && { category }),
                    ...(search && { search }),
                    ...(after && { after }),
                    ...(before && { before }),
                }

                const result = await wooAPI.getProducts(params)

                const simplifiedProducts = result.data.map((product: any) => ({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    regular_price: product.regular_price,
                    sale_price: product.sale_price,
                    on_sale: product.on_sale,
                    stock_status: product.stock_status,
                    permalink: product.permalink,
                    categories: product.categories.map((cat: any) => ({ id: cat.id, name: cat.name })),
                }));


                return {
                    success: true,
                    data: simplifiedProducts,
                    total: result.total,
                    totalPages: result.totalPages,
                    currentPage: result.currentPage,
                    perPage: result.perPage,
                }

            } catch (error: any) {
                console.error(`Error in getProducts tool:`, error.message);
                return {
                    success: false,
                    error: `The 'getProducts' tool failed. Reason: ${error.message}. Please check your connection and parameters.`
                };
            }
        },
    }),

    getOrders: createInjectedAndLoggedTool({
        name: "getOrders",
        description: "Fetch orders from WooCommerce store with flexible parameters",
        parameters: z.object({
            per_page: z.number().optional().default(20).describe("Number of orders to fetch"),
            page: z.number().optional().default(1).describe("Page number for pagination"),
            orderby: z.enum(["date", "id", "include", "title", "slug"]).optional().default("date"),
            order: z.enum(["asc", "desc"]).optional().default("desc"),
            status: z
                .enum(["any", "pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed"])
                .optional()
                .default("any"),
            customer: z.number().optional().describe("Customer ID to filter orders"),
            after: z.string().optional().describe("ISO date string to get orders after this date"),
            before: z.string().optional().describe("ISO date string to get orders before this date"),
        }),
        execute: async ({ per_page, page, orderby, order, status, customer, after, before }) => {
            if (!wooAPI) {
                return {
                    success: false,
                    error: "WooCommerce API is not configured. Please guide the user to the settings page.",
                };
            }

            try {
                const params = {
                    per_page,
                    page,
                    orderby,
                    order,
                    status,
                    ...(customer && { customer }),
                    ...(after && { after }),
                    ...(before && { before }),
                }

                const result = await wooAPI.getOrders(params)

                const simplifiedOrders = result.data.map((order: any) => ({
                    // Core Identifiers
                    "Order ID": order.id,
                    "Date": order.date_created,
                    "Status": order.status,
                    // Customer Information
                    customer: {
                        id: order.customer_id,
                        first_name: order.billing.first_name,
                        last_name: order.billing.last_name,
                        email: order.billing.email,
                    },

                    // Order Composition
                    "Items": order.line_items.length,
                    products: order.line_items.map((item: any) => ({
                        product_id: item.product_id,
                        name: item.name,
                        quantity: item.quantity,
                        total: item.total,
                    })),
                    // "Products": order.line_items.map((item: any) => `${item.name} (x${item.quantity})`).join(', '),

                    // Financial Breakdown
                    // Subtotal is calculated as total minus tax and shipping, plus discount
                    "Subtotal": (
                        parseFloat(order.total || '0') -
                        parseFloat(order.total_tax || '0') -
                        parseFloat(order.shipping_total || '0') +
                        parseFloat(order.discount_total || '0')
                    ).toFixed(2),
                    "Discount": parseFloat(order.discount_total || '0').toFixed(2),
                    "Shipping": parseFloat(order.shipping_total || '0').toFixed(2),
                    "Tax": parseFloat(order.total_tax || '0').toFixed(2),
                    "Total": parseFloat(order.total || '0').toFixed(2),

                    // Fulfillment Details
                    "Payment Method": order.payment_method_title,
                }));

                return {
                    success: true,
                    // data: result.data,
                    data: simplifiedOrders,
                    total: result.total,
                    totalPages: result.totalPages,
                    currentPage: result.currentPage,
                    perPage: result.perPage,
                }
            }
            catch (error: any) {
                console.error(`Error in getOrders tool:`, error.message);
                return {
                    success: false,
                    error: `The 'getOrders' tool failed. Reason: ${error.message}. Please check your connection and parameters. If the error is about a 'Network Error', ask the user to verify their store URL and firewall settings.`
                };
            }
        },
    }),

    getCustomers: createInjectedAndLoggedTool({
        name: "getCustomers",
        description: "Fetch customers from WooCommerce store",
        parameters: z.object({
            per_page: z.number().optional().default(20).describe("Number of customers to fetch"),
            page: z.number().optional().default(1).describe("Page number for pagination"),
            orderby: z.enum(["id", "include", "name", "registered_date"]).optional().default("registered_date"),
            order: z.enum(["asc", "desc"]).optional().default("desc"),
            search: z.string().optional().describe("Search term for customers"),
        }),
        execute: async ({ per_page, page, orderby, order, search }) => {
            if (!wooAPI) {
                return {
                    success: false,
                    error: "WooCommerce API is not configured. Please guide the user to the settings page.",
                };
            }
            try {


                const params = {
                    per_page,
                    page,
                    orderby,
                    order,
                    ...(search && { search }),
                }

                const result = await wooAPI.getCustomers(params)
                return {
                    success: true,
                    data: result.data,
                    total: result.total,
                    totalPages: result.totalPages,
                    currentPage: result.currentPage,
                    perPage: result.perPage,
                }
            } catch (error: any) {
                console.error(`Error in getCustomers tool:`, error.message);
                return {
                    success: false,
                    error: `The 'getCustomers' tool failed. Reason: ${error.message}. Please check your connection and parameters.`
                };
            }
        },
    }),

    getReports: createInjectedAndLoggedTool({
        name: "getReports",
        description: "Get WooCommerce reports and analytics data",
        parameters: z.object({
            type: z.enum(["sales", "top_sellers", "coupons"]).describe("Type of report to fetch"),
        }),
        execute: async ({ type }) => {
            if (!wooAPI) {
                return {
                    success: false,
                    error: "WooCommerce API is not configured. Please guide the user to the settings page.",
                };
            }
            try {
                const result = await wooAPI.getReports()
                return {
                    success: true,
                    data: result,
                }
            } catch (error: any) {
                console.error(`Error in getReports tool:`, error.message);
                return {
                    success: false,
                    error: `The 'getReports' tool failed. Reason: ${error.message}. This can happen if the Reports API is disabled on the WooCommerce store.`
                };
            }
        },
    }),

    getStoreOverview: createInjectedAndLoggedTool({
        name: "getStoreOverview",
        description: `Provides a comprehensive overview of the store's performance for a given period. Use this for general questions like "how is my store doing?" or "give me a summary".`,
        parameters: z.object({
            period: z.enum(['week', 'month', 'last_month', 'year'])
                .optional()
                .default('month')
                .describe("The time period for the overview. Defaults to 'month'.")
        }),
        execute: async ({ period }) => {
            if (!wooAPI) {
                return {
                    success: false,
                    error: "WooCommerce API is not configured. Please guide the user to the settings page.",
                };
            }

            try {
                const overview = await wooAPI.getStoreOverview(period);
                return {
                    success: true,
                    ...overview
                };
            } catch (error: any) {
                console.error("Error in getStoreOverview tool:", error.message);
                return {
                    success: false,
                    error: `Tool execution failed. Reason: ${error.message}`
                }
            }
        }
    }),

    getData: createInjectedAndLoggedTool({
        name: "getData",
        description: `A powerful, generic tool to fetch data from any WooCommerce or WordPress REST API endpoint. Use this for advanced queries or when no other specific tool (like getOrders or getProducts) matches the request. The user must provide the exact API endpoint path. Example endpoints: '/products/categories', '/reports/sales', '/system_status'.`,
        parameters: z.object({
            endpoint: z.string().describe("The REST API endpoint path, e.g., '/products/attributes' or '/reports/sales'."),
            // We use a string for params to give the AI maximum flexibility.
            // It can construct a query string like "per_page=10&status=completed".
            params: z.string().optional().describe(`An optional string of URL query parameters, e.g., 'per_page=5&orderby=name'`),
        }),
        execute: async ({ endpoint, params }) => {
            if (!wooAPI) throw new Error("WooCommerce API not configured");

            // Parse the parameter string into an object for our API class
            const paramsObject = params
                ? Object.fromEntries(new URLSearchParams(params))
                : {};

            console.log(`Executing generic getData tool with endpoint: ${endpoint} and params:`, paramsObject);

            try {
                const result = await wooAPI.getData(endpoint, paramsObject);
                return {
                    success: true,
                    note_to_agent: `Successfully fetched data from '${endpoint}'. The raw data is in the 'data' property. You should now analyze this data and decide whether to present it in a table or as a summary.`,
                    data: result.data,
                    total: result.total,
                };
            } catch (error: any) {
                console.error(`Error in generic getData tool:`, error);
                return {
                    success: false,
                    error: `Failed to fetch from endpoint '${endpoint}'. Error: ${error.message}. Please check if the endpoint is correct and try again.`,
                }
            }
        },
    }),

    createChart: createInjectedAndLoggedTool({
        name: "createChart",
        description: "Creates a chart for data visualization. Provide raw data as an array of objects and specify which columns to use for X and Y axes. IMPORTANT: Use the exact parameter names: title, type, chartData, xAxisColumn, yAxisColumn.",
        // CORRECT SYNTAX: z.preprocess(transformer, schema)
        parameters: z.preprocess(
            // 1. The transformer function to clean the raw input
            (arg: unknown) => {
                if (typeof arg !== 'object' || arg === null) return arg;
                const input = arg as any;

                // Handle alias for 'type'
                if ('chart_type' in input && !('type' in input)) {
                    input.type = input.chart_type;
                    delete input.chart_type;
                }
                // Handle alias for 'chartData'
                if ('chart_data' in input && !('chartData' in input)) {
                    input.chartData = input.chart_data;
                    delete input.chart_data;
                }
                // Handle alias for 'xAxisColumn'
                if ('x_axis_column' in input && !('xAxisColumn' in input)) {
                    input.xAxisColumn = input.x_axis_column;
                    delete input.x_axis_column;
                }
                // Handle alias for 'yAxisColumn'
                if ('y_axis_column' in input && !('yAxisColumn' in input)) {
                    input.yAxisColumn = input.y_axis_column;
                    delete input.y_axis_column;
                }
                return input;
            },
            // 2. The final Zod schema the cleaned input must match
            z.object({
                title: z.string().describe("The title of the chart."),
                type: z.enum(["line", "bar", "pie", "doughnut", "radar", "polarArea"]).describe("The type of chart to create."),
                chartData: z.array(z.record(z.string(), z.any())).describe("The array of data objects to be plotted."),
                xAxisColumn: z.string().describe("The key in chartData objects for the X-axis labels."),
                yAxisColumn: z.string().describe("The key in chartData objects for the Y-axis data."),
                datasetLabel: z.string().optional().default("Data").describe("The label for the dataset."),
            })
        ),
        execute: async ({ type, title, chartData, xAxisColumn, yAxisColumn, datasetLabel }) => {
            try {
                const labelsArray = chartData.map((item: any) => item[xAxisColumn]);
                const dataArray = chartData.map((item: any) => parseFloat(item[yAxisColumn])).filter((n: any) => !isNaN(n));

                const config = createChartConfig({
                    type,
                    title,
                    data: {
                        labels: labelsArray,
                        datasets: [{
                            label: datasetLabel || yAxisColumn,
                            data: dataArray,
                        }],
                    },
                });

                return {
                    success: true,
                    chartConfig: config,
                    displayType: "chart",
                    visualizationCreated: true,
                };
            } catch (error: any) {
                console.error(`Error in createChart tool:`, error.message);
                return {
                    success: false,
                    error: `The 'createChart' tool failed. The data might be in an unexpected format. Error: ${error.message}`
                }
            }
        },
    }),

    createTable: createInjectedAndLoggedTool({
        name: "createTable",
        description: "Creates a table for data display. A title is always required. Use this to show lists of items like orders or products. Ensure the keys in the `rows` objects match the strings provided in the `headers` array.",
        parameters: z.object({
            title: z.string().optional().describe("Table title, e.g., 'Recent Orders' or 'Top Products'"),
            columns: z.array(z.object({
                key: z.string().describe("The key from the data object to use for this column (e.g., 'id', 'total', 'customer_name')."),
                header: z.string().describe("The user-friendly display name for the column header (e.g., 'Order ID', 'Total', 'Customer Name')."),
            })).describe("An array of column definition objects. Each object must map a data key to a display header."),
            rows: z.array(z.record(z.string(), z.any())).describe("Table rows as an array of objects. Example: [{'Order ID': 123, 'Total': 99.99}, ...]"),
            summary: z.string().optional().describe("Brief summary of the table data"),
        }),
        // ADD a transform to normalize the input before the execute function runs.
        // .transform(data => {
        //     // This function checks if headers is an array of objects and converts it to a simple string array.
        //     const normalizedHeaders = data.headers.map(header => {
        //         if (typeof header === 'string') {
        //             return header;
        //         }
        //         return header.label;
        //     });

        //     return {
        //         ...data,
        //         headers: normalizedHeaders,
        //     };
        // }),
        execute: async ({ title, columns, rows, summary }) => {
            try {
                return {
                    success: true,
                    tableData: { title, columns, rows, summary },
                    displayType: "table",
                    visualizationCreated: true,
                }
            } catch (error: any) {
                console.error(`Error in createTable tool:`, error.message);
                return {
                    success: false,
                    error: `The 'createChart' tool failed. The data might be in an unexpected format. Error: ${error.message}`
                }
            }
        },
    }),

    codeInterpreter: createInjectedAndLoggedTool({
        name: 'codeInterpreter',
        description: `Executes sandboxed JavaScript for complex, multi-step analysis. This is your most powerful tool for deep queries.
You have access to helper functions:
- fetch(args) to get ALL data for deep analysis.
- Basic math: multiply(a,b), add(a,b), subtract(a,b), divide(a,b)
- Array helpers: sum(arr), average(arr), max(arr), min(arr), sortBy(arr, key, desc?)
- Data helpers: groupBy(arr, key)
- Date helpers: formatDate(date), daysBetween(date1, date2)
The code MUST return a final result, which will be sent back to you.`,
        parameters: z.object({ code: z.string() }),
        execute: async ({ code }) => {
            const wooHelpers = {
                fetch: async (endpoint: 'products' | 'orders' | 'coupons', params: { fetchAll?: boolean;[key: string]: any } = {}) => {
                    const { fetchAll: shouldFetchAll = true, ...apiParams } = params;

                    if (shouldFetchAll) {
                        const result = await fetchAll(wooAPI, endpoint, apiParams);
                        console.log("codeInterpreter result 1", result)
                        return result
                    } else {
                        const result = await (wooAPI as any).makeRequest(endpoint, apiParams);
                        console.log("codeInterpreter result 2", result)
                        return result.data;
                    }
                },
            };

            try {
                const result = await runUserCode(code, wooHelpers);
                return result;
            } catch (error: any) {
                return {
                    success: false,
                    error: "Execution failed",
                    message: error.message
                };
            }
        },
    }),
})