import { useDialogStore } from '@/store/dialogStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './elements/alert-dialog';
import { ActivityIndicator, Text } from 'react-native';

export function GlobalDialog() {
  const {
    open,
    title,
    description,
    showCancel,
    cancelLabel,
    actions,
    closeDialog,
  } = useDialogStore();

  if (!open) return null;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          {showCancel && (
            <AlertDialogCancel onPress={closeDialog}>
              <Text className='text-secondary-foreground'>{cancelLabel}</Text>
            </AlertDialogCancel>
          )}
          {actions?.map((action) => (
            <AlertDialogAction
              key={action.label}
              onPress={async () => {
                if (action.onPress) {
                  useDialogStore.getState().setActionLoading(action.label, true);
                  await action.onPress();
                  useDialogStore.getState().setActionLoading(action.label, false);
                }
              }}
            >
              <Text className={`${action.variant === "default" ? "text-primary-foreground" : "text-secondary-foreground"}`} >
                {action.loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  action.label
                )}
              </Text>
            </AlertDialogAction>
          ))}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
