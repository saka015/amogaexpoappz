const config = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "",
    APP_SCHEMA: process.env.APP_SCHEMA ?? "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    MAESTRO_SECRET_KEY: process.env.MAESTRO_SECRET_KEY ?? "",
    NODE_ENV: process.env.NODE_ENV,
    STAGE: process.env.STAGE ?? "development",
    EXPO_ACCESS_TOKEN: "",
};

export default config;