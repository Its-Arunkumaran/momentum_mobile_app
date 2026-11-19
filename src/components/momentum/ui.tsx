import Feather from "@expo/vector-icons/Feather";
import { type ComponentProps, type ReactNode, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMomentum } from "@/lib/store";
export const light = {
  bg: "#F7F8F2",
  card: "#FFFFFF",
  text: "#223B35",
  muted: "#738078",
  line: "#E5EAE2",
  primary: "#246751",
  soft: "#E8F1E7",
  accent: "#D6ED9A",
  amber: "#95651E",
  warning: "#FFF4DC",
  danger: "#AE4545",
};
export const dark = {
  bg: "#121E1B",
  card: "#1B2B25",
  text: "#ECF2E7",
  muted: "#A1B3A7",
  line: "#304239",
  primary: "#A2D5B8",
  soft: "#293F31",
  accent: "#D6ED9A",
  amber: "#F3D48F",
  warning: "#3C3221",
  danger: "#FFAAAA",
};
export function usePalette() {
  const { data } = useMomentum();
  const scheme = useColorScheme();
  return data.appearance === "Dark" ||
    (data.appearance === "System" && scheme === "dark")
    ? dark
    : light;
}
export function Icon({
  name,
  size = 20,
  color,
}: {
  name: ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: ComponentProps<typeof Feather>["color"];
}) {
  const c = usePalette();
  return <Feather name={name} size={size} color={color ?? c.text} />;
}
export function Txt({
  children,
  size = 15,
  bold = false,
  muted = false,
  style,
}: {
  children: ReactNode;
  size?: number;
  bold?: boolean;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const c = usePalette();
  return (
    <Text
      style={[
        {
          color: muted ? c.muted : c.text,
          fontSize: size,
          lineHeight: size * 1.45,
          fontWeight: bold ? "700" : "400",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, style]}
    >
      {children}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: c.line,
          padding: 22,
          gap: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary,
  danger,
  disabled,
  icon,
  compact,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Feather>["name"];
  compact?: boolean;
}) {
  const c = usePalette();
  const fg = danger ? c.danger : secondary ? c.primary : c.bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingVertical: compact ? 9 : 14,
        paddingHorizontal: compact ? 14 : 20,
        borderRadius: 14,
        backgroundColor: secondary || danger ? c.soft : c.primary,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Row style={{ gap: 8 }}>
        {icon && <Icon name={icon} size={17} color={fg} />}
        <Txt bold size={compact ? 13 : 15} style={{ color: fg }}>
          {title}
        </Txt>
      </Row>
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.line,
        backgroundColor: selected ? c.soft : c.card,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Txt
        size={13}
        bold={selected}
        style={{ color: selected ? c.primary : c.muted }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  maxLength = 120,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad";
  maxLength?: number;
}) {
  const c = usePalette();
  return (
    <View style={{ gap: 7 }}>
      <Txt size={13} bold>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={{
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.line,
          color: c.text,
          padding: 15,
          borderRadius: 12,
          fontSize: 15,
          minHeight: multiline ? 100 : 50,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const c = usePalette();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          backgroundColor: "#10291DAA",
          justifyContent: "center",
          alignItems: "center",
          padding: 18,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.card,
            width: "100%",
            maxWidth: 540,
            maxHeight: "90%",
            borderRadius: 26,
          }}
        >
          <Row
            style={{
              justifyContent: "space-between",
              padding: 22,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <Txt bold size={21}>
              {title}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              hitSlop={12}
              style={{ padding: 8 }}
            >
              <Icon name="x" />
            </Pressable>
          </Row>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 22, gap: 20 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Section({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = usePalette();
  return (
    <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
      <Txt bold size={19}>
        {title}
      </Txt>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={10}
          style={{ paddingVertical: 8 }}
        >
          <Txt size={13} bold style={{ color: c.primary }}>
            {action} →
          </Txt>
        </Pressable>
      )}
    </Row>
  );
}
export function Page({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const c = usePalette();
  const { error, dismissError } = useMomentum();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 24,
          paddingBottom: 32,
          width: "100%",
          maxWidth: 1000,
          alignSelf: "center",
          gap: 22,
        }}
      >
        <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <Row style={{ gap: 9 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="trending-up" size={18} color={c.bg} />
            </View>
            <Txt bold size={19} style={{ letterSpacing: -0.5 }}>
              momentum
            </Txt>
          </Row>
          <Txt size={10} muted>
            YOUR SPACE TO GROW
          </Txt>
        </Row>
        <View style={{ gap: 5 }}>
          {eyebrow && (
            <Txt
              size={11}
              bold
              style={{ color: c.primary, letterSpacing: 1.8 }}
            >
              {eyebrow}
            </Txt>
          )}
          <Txt size={32} bold style={{ letterSpacing: -1 }}>
            {title}
          </Txt>
          {subtitle && <Txt muted>{subtitle}</Txt>}
        </View>
        {!!error && (
          <Card style={{ backgroundColor: c.warning }}>
            <Txt>{error}</Txt>
            <Button title="Dismiss" secondary onPress={dismissError} />
          </Card>
        )}
        {children}
        <Txt size={11} muted style={{ textAlign: "center", marginTop: 10 }}>
          Small steps. A life that feels like yours.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <View
      style={{
        backgroundColor: c.warning,
        padding: 16,
        borderRadius: 14,
        gap: 5,
      }}
    >
      <Row>
        <Icon name="info" size={17} color={c.amber} />
        <Txt size={12} bold style={{ color: c.amber }}>
          PROTOTYPE · NO DEVICE BLOCKING
        </Txt>
      </Row>
      <Txt size={13} style={{ color: c.amber }}>
        {children}
      </Txt>
    </View>
  );
}
export function ProgressBar({ value }: { value: number }) {
  const c = usePalette();
  return (
    <View
      style={{
        height: 7,
        borderRadius: 4,
        backgroundColor: c.line,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, value * 100))}%`,
          backgroundColor: c.primary,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const run = async (fn: () => Promise<void>, success = "") => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, setMessage, run };
}
export const common = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  grow: { flex: 1, minWidth: 240 },
});
