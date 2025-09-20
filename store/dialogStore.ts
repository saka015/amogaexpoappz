import { create } from 'zustand';

export type DialogAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  loading?: boolean;
  variant?: 'default' | 'destructive';
};

export interface DialogState {
  open: boolean;
  title?: string;
  description?: string;
  showCancel?: boolean;
  cancelLabel?: string;
  actions?: DialogAction[];
  onClose?: () => void;
}

interface DialogStore extends DialogState {
  showDialog: (config: Omit<DialogState, 'open'>) => void;
  closeDialog: () => void;
  setActionLoading: (label: string, loading: boolean) => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  open: false,
  showCancel: true,
  cancelLabel: 'Cancel',
  actions: [],
  showDialog: (config) => set({ ...config, open: true }),
  closeDialog: () => {
    const { onClose } = get();
    set({ open: false });
    if (onClose) onClose();
  },
  setActionLoading: (label, loading) => {
    set((state) => ({
      actions: state.actions?.map((a) =>
        a.label === label ? { ...a, loading } : a
      ),
    }));
  },
}));
