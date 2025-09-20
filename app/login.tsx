import MobileAuth from "@/components/auth/MobileAuth";
import { SafeAreaView } from "@/components/safe-area-view";
import { useAuth } from "@/context/supabase-provider";
import { handleApiError, handleApiSuccess, showToast as globalShowToast} from "@/lib/toast-utils";
import { supabase } from "@/config/supabase";

export default function LoginPage() {
    const { signIn, setSession } = useAuth();

    // The toast function is simplified as it's just a pass-through
    const showToast = (message: string, variant = "default") => {
        if (variant === 'error') handleApiError(message);
        else if (variant === 'success') handleApiSuccess(message);
        else globalShowToast(message);
    };

    const handleVerifySendOtp = async (user_email: string, user_phone: string, register = true) => {
        if (register) {
            const { data, error } = await supabase.rpc("check_user_existence", { user_email, user_phone: "" });
            if (error) {
                showToast("Error checking user existence", "error");
                return false;
            }
            if (data !== "USER_DOES_NOT_EXIST" && data !== 'USER_EXISTS_NOT_VERIFIED') {
                showToast(`User with this ${data === user_email ? 'email' : 'phone'} already exists.`, "error");
                return false;
            }
        }

        const { error } = await supabase.auth.signInWithOtp({
            email: user_email,
            options: { shouldCreateUser: register }
        });

        if (error) {
            showToast(error.message || "Could not send OTP", "error");
            return false;
        }
        showToast("OTP has been sent to your email!");
        return true;
    };

    const handleVerifyOtp = async (otp: string, user_email: string, user_phone: string, password: string, name: string, register = true) => {
        const { data: { session }, error } = await supabase.auth.verifyOtp({
            email: user_email,
            token: otp,
            type: "email"
        });

        if (error || !session) {
            showToast(error?.message || "Invalid or expired OTP.", "error");
            return false;
        }

        // We have a valid session, now update user details if registering
        if (register) {
            await supabase.auth.setSession(session);
            const { error: updateUserError } = await supabase.auth.updateUser({
                password: password,
                data: { full_name: name }
            });

            if (updateUserError) {
                showToast(updateUserError.message || "Could not save user information.", "error");
                return false;
            }
        }

        // This will trigger the redirect in your main app layout
        setSession(session);
        return true;
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <MobileAuth
                signIn={signIn}
                verifySendOtp={handleVerifySendOtp}
                verifyOtp={handleVerifyOtp}
                toast={showToast}
            />
        </SafeAreaView>
    );
}
