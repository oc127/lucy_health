import { View, Text } from "react-native";

type Props = {
  label: string;
  value: number;
  unit: string;
  color: string;
};

// 宏量营养卡片（卡路里/碳水/脂肪/纤维）—— 次要指标，弱于蛋白质。
export function MacroCard({ label, value, unit, color }: Props) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-3 shadow-sm">
      <View className="mb-1 h-1.5 w-8 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-lg font-bold text-gray-800">
        {Math.round(value)}
        <Text className="text-xs font-normal text-gray-400"> {unit}</Text>
      </Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}
