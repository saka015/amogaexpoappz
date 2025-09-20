export class WooCommerceAPIClient {
    private url: string;
    private spaceName: string;
    private consumerKey: string;
    private consumerSecret: string;

    constructor(settings: { url: string; consumerKey: string; consumerSecret: string }, spaceName: string | null = null) {
        if (!settings.url || !settings.consumerKey || !settings.consumerSecret) {
            throw new Error("WooCommerce API client requires url, consumerKey, and consumerSecret.");
        }
        this.url = settings.url.endsWith('/') ? settings.url : `${settings.url}/`;
        this.spaceName = spaceName ? spaceName : '/wc/v3/'
        this.consumerKey = settings.consumerKey;
        this.consumerSecret = settings.consumerSecret;
    }

    private async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT', body: any = null, queryParams: Record<string, any> = {}): Promise<T> {
        const params = new URLSearchParams({
            consumer_key: this.consumerKey,
            consumer_secret: this.consumerSecret,
        });

        for (const key in queryParams) {
            if (queryParams[key] !== undefined) {
                params.append(key, queryParams[key].toString());
            }
        }

        const fullUrl = `${this.url}wp-json${this.spaceName}${endpoint}?${params.toString()}`;

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(fullUrl, options);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'WooCommerce API request failed.');
        }

        const responseText = await response.text();
        return responseText ? JSON.parse(responseText) : null as any;
    }

    async get<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
        return this.request<T>(endpoint, 'GET', null, params);
    }

    async post<T>(endpoint: string, data: any): Promise<T> {
        return this.request<T>(endpoint, 'POST', data);
    }

    async put<T>(endpoint: string, data: any): Promise<T> {
        return this.request<T>(endpoint, 'PUT', data);
    }
}