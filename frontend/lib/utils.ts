import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 时间格式化工具
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN');
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN');
}

export function formatDateRange(startStr: string, endStr: string, locale: string): string {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const sameDay = start.toDateString() === end.toDateString();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (locale === 'zh') {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const datePart = `${start.getMonth() + 1}/${start.getDate()} 周${weekdays[start.getDay()]}`;
    if (sameDay) {
      return `${datePart} · ${time(start)} – ${time(end)}`;
    }
    const endPart = `${end.getMonth() + 1}/${end.getDate()} 周${weekdays[end.getDay()]}`;
    return `${datePart} ${time(start)} – ${endPart} ${time(end)}`;
  }

  const loc = 'en-US';
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' };
  const datePart = start.toLocaleDateString(loc, dateOpts);
  if (sameDay) {
    return `${datePart} ${time(start)} – ${time(end)}`;
  }
  const endDate = end.toLocaleDateString(loc, dateOpts);
  return `${datePart} ${time(start)} – ${endDate} ${time(end)}`;
}
