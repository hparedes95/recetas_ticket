import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, spacing } from '../theme';
import { Macros } from '../types';

/** Contenedor base de pantalla, con fondo y área segura */
export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function SectionTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
        {content}
      </Pressable>
    );
  }
  return content;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  full = true,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        full && styles.btnFull,
        variantStyles[variant].container,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.btnText, variantStyles[variant].text]}>
          {icon ? `${icon}  ` : ''}
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  emoji,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({ label, color = colors.primary, soft }: { label: string; color?: string; soft?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft ?? colors.primarySoft }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/** Barra de progreso simple 0..1 */
export function ProgressBar({ value, color = colors.primary }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function EmptyState({
  emoji,
  title,
  subtitle,
  action,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

/** Resumen de macros por ración/día */
export function MacroSummary({ macros, label }: { macros: Macros; label?: string }) {
  return (
    <View>
      {label ? <Text style={styles.macroLabel}>{label}</Text> : null}
      <View style={styles.macroRow}>
        <MacroPill value={`${macros.kcal}`} unit="kcal" tint={colors.accent} tintSoft={colors.accentSoft} />
        <MacroPill value={`${macros.protein}g`} unit="Proteína" tint="#7C3AED" tintSoft="#EDE9FE" />
        <MacroPill value={`${macros.carbs}g`} unit="Carbos" tint="#0EA5E9" tintSoft="#E0F2FE" />
        <MacroPill value={`${macros.fat}g`} unit="Grasas" tint="#CA8A04" tintSoft="#FEF9C3" />
      </View>
    </View>
  );
}

function MacroPill({
  value,
  unit,
  tint,
  tintSoft,
}: {
  value: string;
  unit: string;
  tint: string;
  tintSoft: string;
}) {
  return (
    <View style={[styles.macroPill, { backgroundColor: tintSoft }]}>
      <Text style={[styles.macroValue, { color: tint }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
    </View>
  );
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: '#fff' },
  },
  secondary: {
    container: { backgroundColor: colors.primarySoft },
    text: { color: colors.primaryDark },
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
    text: { color: colors.text },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: '#fff' },
  },
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  pressed: { opacity: 0.7 },

  title: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.heavy,
    color: colors.text,
  },
  subtitle: {
    fontSize: font.size.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 22,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: colors.text,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },

  btn: {
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  btnFull: { alignSelf: 'stretch' },
  btnText: { fontSize: font.size.md, fontWeight: font.weight.bold },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.text },
  chipTextSelected: { color: '#fff' },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: font.size.xs, fontWeight: font.weight.bold },

  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: { fontSize: 60, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: font.size.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  macroLabel: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    fontWeight: font.weight.semibold,
    marginBottom: spacing.sm,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroPill: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  macroValue: { fontSize: font.size.lg, fontWeight: font.weight.heavy },
  macroUnit: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: font.weight.medium },
});
