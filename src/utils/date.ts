export const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function orderDate(createTime: string): string {
  return createTime.slice(0, 10);
}

export function formatDateCN(value: string): string {
  const date = parseYmd(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatMonthCN(year: number, month: number): string {
  return `${year}年${month}月`;
}

/** 返回 6×7 的日期矩阵（周一为每周第一天） */
export function monthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - offset);
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w += 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}
