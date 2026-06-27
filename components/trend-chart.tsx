import { View, Text } from "react-native";
import { Colors } from "../constants/theme";

type Point = { date: string; protein: number; calories: number };

type Props = {
  data: Point[];
  target: number; // 蛋白质目标，用于参考线与达标着色
};

// 蛋白质 7 日柱状图（View 实现，无额外依赖）。达标当天高亮，未达标偏灰。
export function TrendChart({ data, target }: Props) {
  const max = Math.max(target, ...data.map((d) => d.protein), 1);
  const chartHeight = 140;

  return (
    <View>
      <View
        className="flex-row items-end justify-between"
        style={{ height: chartHeight }}
      >
        {data.map((d) => {
          const h = Math.max(4, (d.protein / max) * chartHeight);
          const hit = d.protein >= target;
          return (
            <View key={d.date} className="flex-1 items-center justify-end">
              <Text className="mb-1 text-[9px] text-gray-400">{d.protein}</Text>
              <View
                style={{
                  height: h,
                  width: 14,
                  backgroundColor: hit ? Colors.protein : Colors.primary[200],
                  borderRadius: 7,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="mt-1 flex-row justify-between">
        {data.map((d) => (
          <Text key={d.date} className="flex-1 text-center text-[9px] text-gray-400">
            {d.date.slice(5)}
          </Text>
        ))}
      </View>
      <Text className="mt-2 text-center text-[11px] text-gray-400">
        蛋白质目标 {target}g/天 · 珊瑚色为达标日
      </Text>
    </View>
  );
}
