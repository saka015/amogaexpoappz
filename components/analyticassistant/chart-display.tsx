'use dom';
import '../../global.css';

import { useEffect, useRef, useState } from 'react'; // Removed useCallback
import { Card, CardContent, CardHeader, CardTitle } from '../primitives/card';
import { Alert, AlertDescription } from '../primitives/alert';
import { AlertCircle } from 'lucide-react';
import { View } from 'react-native';

export default function ChartDisplay({
    config, themeClass, cardClass, minHeight, childItem
}: {
    config: {
        type: string
        data: any
        options: any
        title?: string
    };
    themeClass: string;
    cardClass?: string;
    minHeight?: number;
    childItem?: boolean;
    dom?: import('expo/dom').DOMProps;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Guard against missing canvas ref
        if (!canvasRef.current) {
            return;
        }

        let isComponentMounted = true;

        // Simplified: Define the async function directly inside the effect.
        const initializeChart = async () => {
            try {
                if (!isComponentMounted || !canvasRef.current) return;

                setIsLoading(true);
                setError(null);

                const { Chart, registerables } = await import("chart.js");
                Chart.register(...registerables);

                // If a chart instance already exists, destroy it first.
                if (chartRef.current) {
                    chartRef.current.destroy();
                }

                if (!config || !config.data || !config.data.labels || !config.data.datasets) {
                    throw new Error("Invalid chart configuration provided.");
                }

                // Create the new chart instance
                chartRef.current = new Chart(canvasRef.current, {
                    type: config.type as any,
                    data: config.data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        ...config.options,
                    },
                });

                if (isComponentMounted) setIsLoading(false);

            } catch (err) {
                console.error("Chart loading error:", err);
                if (isComponentMounted) {
                    setError((err as any).message || "Failed to load chart");
                    setIsLoading(false);
                }
            }
        };

        initializeChart();

        // The cleanup function is crucial.
        return () => {
            isComponentMounted = false;
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
        // 
        // THE CRITICAL FIX: The dependency is now a stringified version of the config.
        // This forces the effect to re-run whenever the *content* of the config changes,
        // not just its memory reference.
        //
    }, [JSON.stringify(config)]);


    if (error) {
        return (
            <Card>
                <CardContent className="p-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Failed to load chart: {error}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <View className={`${themeClass} flex flex-1 size-full flex-col ${childItem ? "bg-card" : "bg-background"}`}>
            <Card className={`${themeClass} ${cardClass} flex flex-1 size-full flex-col`}>
                {config.title && (
                    <CardHeader>
                        <CardTitle className="text-lg">{config.title}</CardTitle>
                    </CardHeader>
                )}
                <CardContent className="size-full p-0">
                    <div
                        style={{ width: "100%", minHeight: minHeight ? minHeight : 300, position: "relative" }}
                    >
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
                                <div className="animate-spin h-6 w-6 border-t-2 border-primary rounded-full" />
                            </div>
                        )}
                        <canvas
                            ref={canvasRef}
                            style={{
                                display: isLoading ? "none" : "block",
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </View>
    );
}