import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/elements/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/elements/Card"
import { Badge } from "@/components/elements/Badge"
import { Platform, ScrollView, StyleSheet } from "react-native"
import { Text } from "../elements/Text"

interface Column {
    key: string;
    header: string;
}

interface DataTableProps {
    title?: string
    columns: Column[]
    rows: any[][]
    summary?: string
}

export function DataTable({ data }: { data: DataTableProps }) {

    const formatCellValue = (value: any) => {
        if (typeof value === "number") {
            // Format currency if it looks like a price
            if (value > 0 && value < 10000 && value.toString().includes(".")) {
                return `$${value.toFixed(2)}`
            }
            // Format large numbers with commas
            if (value > 1000) {
                return value.toLocaleString()
            }
        }
        return value
    }

    return (
        <Card>
            {data?.title && false && (
                <CardHeader>
                    <CardTitle className="text-lg">{data.title}</CardTitle>
                    {data.summary && (
                        <Badge variant="secondary" className="w-fit">
                            <Text>{data.summary}</Text>
                        </Badge>
                    )}
                </CardHeader>
            )}
            <CardContent className="p-2">
                <ScrollView style={styles.messagesScrollView} nestedScrollEnabled>
                    <ScrollView horizontal nestedScrollEnabled>
                        <Table>
                            <TableHeader>
                                <TableRow className="flex-row border-b-border">
                                    {data.columns && data.columns.map((column) => (
                                        <TableHead
                                            key={column.key}
                                            className="font-medium min-w-[120px] px-3 py-2"
                                        >
                                            <Text>{column.header}</Text>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {([...data.rows]).map((rowObject, rowIndex) => (
                                    <TableRow key={rowIndex} className="flex-row border-b-border">
                                        {data.columns && data.columns.map((column) => {
                                            const cellValue = rowObject[column.key as any];
                                            return (
                                                <TableCell
                                                    key={`${rowIndex}-${column.key}`}
                                                    className="min-w-[120px] px-3 py-2"
                                                >
                                                    <Text numberOfLines={2} ellipsizeMode="tail">
                                                        {formatCellValue(cellValue)}
                                                    </Text>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollView>
                </ScrollView>
            </CardContent>
        </Card>
    )
}

const styles = StyleSheet.create({
    messagesScrollView: {
        ...Platform.select({
            web: { maxHeight: 400 }
        })
    },
});    