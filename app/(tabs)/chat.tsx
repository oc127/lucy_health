import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DisclaimerBar } from "../../components/disclaimer-bar";
import { useChatHistory, useSendChat, type ChatMsg } from "../../lib/data";
import { Colors } from "../../constants/theme";

export default function Chat() {
  const historyQ = useChatHistory();
  const sendChat = useSendChat();
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const messages = historyQ.data ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || sendChat.isPending) return;
    setText("");
    await sendChat.mutateAsync(msg);
  };

  return (
    <SafeAreaView className="flex-1 bg-primary-50" edges={["top", "left", "right"]}>
      <View className="border-b border-gray-100 px-5 py-3">
        <Text className="text-lg font-bold text-primary-800">Mira</Text>
        <Text className="text-xs text-gray-400">
          你的营养好朋友 · 不提供医疗建议
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 && !historyQ.isLoading ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-4xl">🌿</Text>
            <Text className="mt-3 text-center text-base font-medium text-primary-700">
              嗨，我是 Mira
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              用药期吃不下、容易恶心、不知道怎么补蛋白质？随时跟我聊聊吧～
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => <Bubble msg={item} />}
          />
        )}

        {sendChat.isPending && (
          <View className="flex-row items-center px-5 pb-1">
            <ActivityIndicator size="small" color={Colors.primary[500]} />
            <Text className="ml-2 text-xs text-gray-400">Mira 正在输入…</Text>
          </View>
        )}

        <View className="flex-row items-end gap-2 border-t border-gray-100 bg-white px-4 py-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="和 Mira 说点什么…"
            multiline
            className="max-h-24 flex-1 rounded-2xl bg-primary-50 px-4 py-2.5 text-gray-800"
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sendChat.isPending}
            className={`mb-0.5 items-center justify-center rounded-full px-4 py-2.5 ${
              text.trim() ? "bg-primary-500 active:bg-primary-600" : "bg-gray-300"
            }`}
          >
            <Text className="font-semibold text-white">发送</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <DisclaimerBar />
    </SafeAreaView>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <View
      className={`mb-2 max-w-[82%] rounded-2xl px-4 py-2.5 ${
        isUser ? "self-end bg-primary-500" : "self-start bg-white"
      }`}
    >
      <Text className={isUser ? "text-white" : "text-gray-800"}>{msg.content}</Text>
      {msg.flagged === "crisis" && (
        <Text className="mt-1 text-[10px] text-red-400">⚠ 安全提示</Text>
      )}
    </View>
  );
}
