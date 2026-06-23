// Mira 主题配色 token —— 薄荷绿 / 青色调（温和、亲和、非临床感）
// 同时被 tailwind.config.js（NativeWind 类）和 constants/theme.ts（运行时颜色）引用。
const colors = {
  // 主品牌色：薄荷青
  primary: {
    50: "#E6F7F4",
    100: "#C2EDE6",
    200: "#8FDDD1",
    300: "#5CCBBA",
    400: "#33B8A4",
    500: "#16A38D", // 主色
    600: "#0F8675",
    700: "#0C6A5D",
    800: "#0A5249",
    900: "#073D37",
  },
  // 蛋白质强调色（首页主指标）—— 温暖珊瑚，区别于卡路里的中性色
  protein: "#FF8A65",
  // 宏量营养辅助色
  macro: {
    calories: "#94A3B8",
    carbs: "#F4B740",
    fat: "#F58FB0",
    fiber: "#7AC74F",
  },
};

module.exports = { colors };
