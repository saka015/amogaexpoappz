import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { BarChart, Store, Users, ShoppingCart } from "lucide-react-native";
import LucideIcon from "../LucideIcon";
import { Card, CardContent } from "../elements/Card";
import { Tabs, TabsList, TabsTrigger } from "../elements/Tabs";
import { useState } from "react";
import ChartDisplay from "./chart-display";
import { DataTable } from "./data-table";

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "function" | "data" | "tool";
  content: string;
  toolInvocations?: any[];
  favorite?: boolean;
  bookmark?: boolean;
};

export const CardsMessage = ({ m, themeClass, chartConfig, tableData }: { m: Message; themeClass: any; chartConfig: any; tableData: any; }) => {

  const [activeTab, setActiveTab] = useState("chart")
  const showTabs = chartConfig && tableData;

  return (
    <>
      {showTabs ?
        (
          <Card className="mt-2">
            <CardContent className="p-1">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab as any}
                className='w-full max-w-[400px] mx-auto flex-col gap-1.5'
              >
                <TabsList className='flex-row'>
                  <TabsTrigger value='chart' className='flex-1'>
                    <Text>Chart</Text>
                  </TabsTrigger>
                  <TabsTrigger value='table' className='flex-1'>
                    <Text>Table</Text>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === "chart" && (
                <View className="mt-4">
                  <ChartDisplay
                    // key={`chart-${m.id}-${m.favorite && 'favorited'}-${m.bookmark && 'bookmarked'}-cn${m.content.length}-${new Date().getTime()}`}
                    key={`chart-${m.id}-${themeClass}`}
                    config={chartConfig}
                    dom={{
                      matchContents: true
                    }}
                    themeClass={themeClass}
                    childItem={showTabs}
                  />
                </View>
              )}
              {activeTab === "table" && (
                <View className="mt-4">
                  <DataTable key={`table-${m.id}`} data={tableData} />
                </View>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {chartConfig && (
              <View className="mt-2">
                <ChartDisplay
                  // key={`chart-${m.id}-${m.favorite && 'favorited'}-${m.bookmark && 'bookmarked'}-cn${m.content.length}`}
                  key={`chart-${m.id}-${themeClass}`}
                  config={chartConfig}
                  dom={{
                    matchContents: true
                  }}
                  themeClass={themeClass}
                />
              </View>
            )}

            {/* Display table if available */}
            {tableData && (
              <View className="mt-4">
                <DataTable key={`table-${m.id}`} data={tableData} />
              </View>
            )}
          </>
        )
      }
    </>
  );
};