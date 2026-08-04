import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/AppText';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: number;
  flex?: number;
  render: (item: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  minWidth?: number;
  style?: ViewStyle;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  minWidth = 760,
  style,
}: DataTableProps<T>) {
  return (
    <View style={[styles.frame, style]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { minWidth }]}>
          <View style={styles.headerRow}>
            {columns.map(column => (
              <View
                key={column.key}
                style={[styles.cell, { width: column.width, flex: column.flex }]}
              >
                <AppText variant="label" color={Colors.gray}>
                  {column.header}
                </AppText>
              </View>
            ))}
          </View>

          {data.map(item => (
            <View key={keyExtractor(item)} style={styles.dataRow}>
              {columns.map(column => (
                <View
                  key={column.key}
                  style={[styles.cell, { width: column.width, flex: column.flex }]}
                >
                  {column.render(item)}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
  },
  table: {
    width: '100%',
  },
  headerRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[800],
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  dataRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  cell: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
