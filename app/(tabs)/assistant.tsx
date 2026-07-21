import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatMessage } from "../../lib/types";
import { useData } from "../../lib/store";
import { answerQuestion, SUGGESTED_QUESTIONS } from "../../lib/assistant";
import { colors, font, radius, spacing } from "../../lib/theme";

let msgId = 0;
const nextId = () => `m_${msgId++}`;

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Hi! I'm your inventory assistant. Ask me anything about your stock — I answer from your live data, not guesses. Try one of the suggestions below.",
  createdAt: Date.now(),
};

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { products, transactions } = useData();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = (raw: string) => {
    const question = raw.trim();
    if (!question || thinking) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      text: question,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Simulate the round-trip to a Gemini-backed Cloud Function.
    setTimeout(() => {
      const answer = answerQuestion(question, { products, transactions });
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: answer, createdAt: Date.now() },
      ]);
      setThinking(false);
    }, 650);
  };

  const scrollToEnd = () =>
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={18} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>Grounded in your live inventory</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => <Bubble message={item} />}
        ListFooterComponent={
          thinking ? (
            <View style={[styles.bubble, styles.assistantBubble, styles.typing]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.typingText}>Analyzing your data…</Text>
            </View>
          ) : null
        }
      />

      {/* Suggestions */}
      {messages.length <= 2 && (
        <View style={styles.suggestions}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <Pressable
              key={q}
              style={styles.suggestChip}
              onPress={() => send(q)}
            >
              <Text style={styles.suggestText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your inventory…"
          placeholderTextColor={colors.textFaint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.5 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || thinking}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      {!isUser && (
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && { color: colors.white }]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  headerSub: { fontSize: font.small, color: colors.textMuted },
  messages: { padding: spacing.lg, gap: spacing.md },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  botAvatar: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: font.body, lineHeight: 21, color: colors.text },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    marginTop: spacing.md,
    marginLeft: 34,
  },
  typingText: { fontSize: font.small, color: colors.textMuted },
  suggestions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  suggestChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  suggestText: { fontSize: font.small, color: colors.primary, fontWeight: "600" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
