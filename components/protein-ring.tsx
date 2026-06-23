import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "../constants/theme";

type Props = {
  current: number; // 已摄入蛋白质 (g)
  target: number; // 目标蛋白质 (g)
  size?: number;
};

// 蛋白质进度环 —— 首页主指标（GLP-1 用户保肌肉的核心）。
export function ProteinRing({ current, target, size = 200 }: Props) {
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  const dashoffset = circumference * (1 - pct);
  const gap = Math.max(0, Math.round(target - current));

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.primary[100]}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.protein}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-4xl font-bold text-primary-700">
          {Math.round(current)}
          <Text className="text-lg font-medium text-gray-400"> / {target}g</Text>
        </Text>
        <Text className="mt-1 text-xs font-medium text-protein">蛋白质</Text>
        {gap > 0 ? (
          <Text className="mt-1 text-[11px] text-gray-400">还差 {gap}g</Text>
        ) : (
          <Text className="mt-1 text-[11px] text-primary-500">今日已达标 🎉</Text>
        )}
      </View>
    </View>
  );
}
