import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DisclaimerBar } from "./disclaimer-bar";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  showDisclaimer?: boolean;
};

// 所有页面通用的 SafeArea 容器（含底部固定免责声明）。
export function ScreenContainer({
  children,
  scroll = true,
  showDisclaimer = true,
}: Props) {
  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-5">{children}</View>
      )}
      {showDisclaimer && <DisclaimerBar />}
    </SafeAreaView>
  );
}
