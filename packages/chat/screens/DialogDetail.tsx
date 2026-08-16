// DialogDetail.js
import React, { useRef, useEffect, useState } from "react";
import { View, ScrollView, SafeAreaView, StyleSheet } from "react-native";
import { useTheme } from "app/theme";
import MessageInput from "./MessageInput";
import MessageBubble from "./MessageBubble";
import { dialogDetails } from "./mockData";

const DialogDetail = ({ route }: { route: any }) => {
  const theme = useTheme();
  const { dialogId } = route.params;
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [messages, setMessages] = useState<
    Array<{
      sender: string;
      message: string;
      avatar: any;
      id?: string;
      messageId?: string;
      dbKey?: string;
    }>
  >([]);

  useEffect(() => {
    const selectedDialog = dialogDetails.find(
      (dialog) => dialog.id === dialogId
    );
    if (selectedDialog) {
      setMessages(selectedDialog.messages || []);
    }
  }, [dialogId]);

  const handleSend = (text: string) => {
    const newMessage = {
      sender: "user",
      message: text,
      avatar: require("./assets/user-avatar.png"),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    scrollToBottom();

    setTimeout(() => {
      const aiResponse = {
        sender: "ai",
        message: "收到你的消息，我会尽快处理。",
        avatar: require("./assets/ai-avatar.png"),
      };
      setMessages((prev) => [...prev, aiResponse]);
      scrollToBottom();
    }, 1000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, index) => (
            <MessageBubble
              key={msg.id ?? msg.messageId ?? msg.dbKey ?? index}
              message={msg}
            />
          ))}
        </ScrollView>
        <MessageInput onSend={handleSend} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    flexGrow: 1,
  },
});

export default DialogDetail;
