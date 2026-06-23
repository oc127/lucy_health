import { View, Text } from "react-native";

// 固定医疗免责声明 —— 按合规要求显示在每个主要页面底部。
export function DisclaimerBar() {
  return (
    <View className="border-t border-gray-100 bg-white/80 px-4 py-2">
      <Text className="text-center text-[11px] text-gray-400">
        Mira is not a medical service. 不提供医疗建议、诊断或药物推荐。
      </Text>
    </View>
  );
}
