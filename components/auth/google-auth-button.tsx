import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { useAuth } from "@/context/supabase-provider";
import { extractParamsFromQuery, extractParamsFromUrl } from "@/lib/utils";

export function GoogleAuthButton() {
    const { getGoogleOAuthUrl, setOAuthSession } = useAuth();
    const [loading, setLoading] = useState(false);

    const onSignInWithGoogle = async () => {
        setLoading(true);
        try {
            const redirectUrl = Platform.OS === "web"
                ? window.location.origin + "/authenticating"
                : "storchat://authenticating";


            console.log("redirectUrl", redirectUrl)
            const url = await getGoogleOAuthUrl(redirectUrl);
            if (!url) return;

            const result = await WebBrowser.openAuthSessionAsync(
                url,
                redirectUrl,
                {
                    showInRecents: true,
                }
            );

            if (result.type === "success" && result.url) {
                // Try to extract params from both hash and query string
                let data = extractParamsFromUrl(result.url);
                if (!data.access_token || !data.refresh_token) {
                    data = extractParamsFromQuery(result.url);
                }
                if (!data.access_token || !data.refresh_token) return;

                setOAuthSession({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                });
                // Optionally store Google's access token if needed
                // await SecureStore.setItemAsync("google-access-token", JSON.stringify(data.provider_token));
            }
        } catch (error) {
            // Handle error here
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (Platform.OS !== "web") {
            WebBrowser.warmUpAsync();
            return () => {
                WebBrowser.coolDownAsync();
            };
        }
        return undefined;
    }, []);

    return (
        <Button
            disabled={loading}
            onPress={onSignInWithGoogle}
            className="web:m-4"
        >
            <Text>{loading ? "Loading..." : "Sign in with Google"}</Text>
        </Button>
    );
}
