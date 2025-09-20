import * as React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import * as Popover from '@rn-primitives/popover';
import * as Checkbox from '@rn-primitives/checkbox';
import { cn } from '../../lib/utils';
import LucideIcon from '../LucideIcon';
import { Text } from './Text';

// --- Context for state management ---
interface MultiSelectContextValue {
  value: string[];
  onChange: (value: string[]) => void;
  options: { label: string; value: string }[];
}

const MultiSelectContext = React.createContext<MultiSelectContextValue | null>(null);

const useMultiSelectContext = () => {
  const context = React.useContext(MultiSelectContext);
  if (!context) {
    throw new Error('useMultiSelectContext must be used within a MultiSelect provider');
  }
  return context;
};

// --- Main Component ---
interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: { label: string; value: string }[];
  children: React.ReactNode;
}

const MultiSelect = ({ value, onChange, options, children }: MultiSelectProps) => {
  const contextValue = React.useMemo(() => ({ value, onChange, options }), [value, onChange, options]);
  return (
    <MultiSelectContext.Provider value={contextValue}>
      <Popover.Root>{children}</Popover.Root>
    </MultiSelectContext.Provider>
  );
};

// --- Trigger Component ---
interface MultiSelectTriggerProps {
  placeholder?: string;
  className?: string;
}

// FIX #1: Update the ref type here from React.ElementRef<typeof Pressable>
const MultiSelectTrigger = React.forwardRef<React.ElementRef<typeof Popover.Trigger>, MultiSelectTriggerProps>(
  ({ placeholder = 'Select options...', className, ...props }, ref) => {
    const { value, options } = useMultiSelectContext();
    const selectedLabels = options
      .filter((option) => value.includes(option.value))
      .map((option) => option.label);

    return (
      <Popover.Trigger
        ref={ref}
        className={cn(
          'flex flex-row h-10 native:h-12 items-center text-sm justify-between rounded-md border border-input bg-background px-3 py-2',
          className
        )}
        {...props}
      >
        <View className="flex-1 flex-row flex-wrap gap-1">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((label) => (
              <View key={label} className="bg-secondary rounded-md px-2 py-1">
                <Text className="text-secondary-foreground text-xs">{label}</Text>
              </View>
            ))
          ) : (
            <Text className="text-muted-foreground">{placeholder}</Text>
          )}
        </View>
        <LucideIcon name="ChevronDown" size={16} className="text-foreground opacity-50 ml-2" />
      </Popover.Trigger>
    );
  }
);
MultiSelectTrigger.displayName = 'MultiSelectTrigger';


// --- Content Component ---
interface MultiSelectContentProps {
  className?: string;
  children: React.ReactNode;
}

const MultiSelectContent = ({ className, children }: MultiSelectContentProps) => {
  return (
    <Popover.Portal>
      <Popover.Content
        className={cn(
            'w-[var(--radix-popover-trigger-width)] max-h-60 rounded-md border border-border bg-popover p-1 shadow-md',
            className
        )}
        sideOffset={5}
      >
        <ScrollView>{children}</ScrollView>
      </Popover.Content>
    </Popover.Portal>
  );
};

// --- Item Component ---
interface MultiSelectItemProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

const MultiSelectItem = ({ value: itemValue, children, className }: MultiSelectItemProps) => {
    const { value, onChange } = useMultiSelectContext();
    const isSelected = value.includes(itemValue);

    const handlePress = () => {
        if (isSelected) {
            onChange(value.filter((v) => v !== itemValue));
        } else {
            onChange([...value, itemValue]);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            className={cn(
                'relative flex flex-row w-full items-center rounded-sm py-1.5 pl-8 pr-2 active:bg-accent web:outline-none web:focus:bg-accent',
                className
            )}
        >
            <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <Checkbox.Root
                    checked={isSelected}
                    onCheckedChange={handlePress}
                    className="h-4 w-4 rounded-sm border border-primary web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2"
                >
                    <Checkbox.Indicator>
                        <LucideIcon name="Check" size={12} className="text-primary" />
                    </Checkbox.Indicator>
                </Checkbox.Root>
            </View>
            {children}
        </Pressable>
    );
};


export {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectContent,
  MultiSelectItem,
};