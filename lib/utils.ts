import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 合并 Tailwind/NativeWind 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
