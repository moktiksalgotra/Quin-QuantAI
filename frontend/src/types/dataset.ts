export interface ColumnInfo {
  name: string;
  type: string;
}

export interface DatasetInfo {
  columns: ColumnInfo[];
  row_count: number;
  created_at: string;
} 