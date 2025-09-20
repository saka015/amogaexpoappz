import { toast } from "sonner-native";

/**
 * Handles API errors by displaying a toast notification.
 * @param error The error object or message string.
 * @param title The title of the toast notification.
 * @param defaultMessage A default message to use if the error object doesn't have a message.
 */
export function handleApiError(
  error: any,
  title: string = "Operation Failed",
  defaultMessage: string = "An unexpected error occurred."
) {
  console.error("API Error:", error);
  const description = typeof error === 'string' ? error : error?.message || defaultMessage;
  toast.error(title, {
    description,
  });
}

/**
 * Displays a success toast notification.
 * @param title The title of the toast.
 * @param description An optional description for the toast.
 */
export function handleApiSuccess(title: string, description?: string) {
  toast.success(title, {
    description,
  });
}

/**
 * Displays a generic toast notification.
 * @param message The main message or title of the toast.
 * @param description An optional description for the toast.
 */
export function showToast(message: string, type: 'default' | 'success' | 'error' = 'default', description?: string) {
  if (type === 'error') {
    toast.error(message, { description });
  } else if (type === 'success') {
    toast.success(message, { description });
  } else {
    toast(message, { description });
  }
}
