import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { BarChart, Store, Users, ShoppingCart } from "lucide-react-native";
import LucideIcon from "../LucideIcon";

export const WelcomeMessage = () => {
  return (
    <View className="max-w-xl mx-auto rounded-xl p-2 items-center mt-7">
      {/* A more relevant icon */}
      <LucideIcon name="ChartNoAxesColumnIncreasing" size={48} className="mb-4 text-primary" />

      <Text className="text-2xl font-bold text-center mb-2">
        WooCommerce Analytics Agent
      </Text>

      <Text className="text-center leading-6 mb-6">
        I'm ready to analyze your store's data. I can fetch information and create visualizations for you instantly.
      </Text>

      <View className="w-full bg-card p-4 rounded-lg border">
        <Text className="text-sm font-semibold mb-3">Try asking me about:</Text>
        <View className="space-y-2">
          <View className="flex-row items-center">
            <LucideIcon name="ShoppingCart" size={16} className="mr-2 text-primary" />
            <Text className="text-primary/95">"Show my recent orders"</Text>
          </View>
          <View className="flex-row items-center">
            <LucideIcon name="Store" size={16} className="mr-2 text-primary" />
            <Text className="text-primary/95">"What are my top selling products?"</Text>
          </View>
          <View className="flex-row items-center">
            <LucideIcon name="Users" size={16} className="mr-2 text-primary" />
            <Text className="text-primary/95">"How many customers signed up this month?"</Text>
          </View>
          <View className="flex-row items-center">
            <LucideIcon name="ChartNoAxesColumnIncreasing" size={16} className="mr-2 text-primary" />
            <Text className="text-primary/95">"Give me a store overview"</Text>
          </View>
        </View>
      </View>
    </View>
  );
};