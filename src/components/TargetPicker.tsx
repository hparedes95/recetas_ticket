import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Chip, AppButton } from './ui';
import {
  colors,
  font,
  radius,
  spacing,
  CALORIE_PRESETS,
  CALORIE_MIN,
  CALORIE_MAX,
  CALORIE_STEP,
  DEFAULT_CALORIE_TARGET,
  DEFAULT_MACRO_SPLIT,
  MACRO_SPLITS,
  macroGramsFor,
  macroColors,
} from '../theme';
import { MacroSplit } from '../types';

interface Props {
  calorieTarget: number | null;
  macroSplit: MacroSplit | null;
  onChange: (next: { calorieTarget: number | null; macroSplit: MacroSplit | null }) => void;
}

/** Selector de objetivo de calorías + reparto de macros. Reutilizable en onboarding y ajustes. */
export function TargetPicker({ calorieTarget, macroSplit, onChange }: Props) {
  const enabled = calorieTarget !== null;
  const kcal = calorieTarget ?? DEFAULT_CALORIE_TARGET;
  const split = macroSplit ?? DEFAULT_MACRO_SPLIT;
  const grams = macroGramsFor(kcal, split);

  const toggle = (on: boolean) => {
    if (on) onChange({ calorieTarget: DEFAULT_CALORIE_TARGET, macroSplit: DEFAULT_MACRO_SPLIT });
    else onChange({ calorieTarget: null, macroSplit: null });
  };

  const setKcal = (v: number) => {
    const clamped = Math.max(CALORIE_MIN, Math.min(CALORIE_MAX, v));
    onChange({ calorieTarget: clamped, macroSplit: split });
  };

  const setSplit = (s: MacroSplit) => onChange({ calorieTarget: kcal, macroSplit: s });

  return (
    <View>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Objetivo de calorías y macros</Text>
          <Text style={styles.switchSub}>
            {enabled
              ? 'Los planes intentarán acercarse a estos valores.'
              : 'Automático según tu objetivo. Actívalo para fijar tus números.'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {enabled ? (
        <View style={styles.body}>
          {/* Calorías */}
          <Text style={styles.label}>Calorías al día</Text>
          <View style={styles.kcalRow}>
            <AppButton
              title="−"
              variant="secondary"
              full={false}
              style={styles.stepBtn}
              onPress={() => setKcal(kcal - CALORIE_STEP)}
            />
            <View style={styles.kcalValueWrap}>
              <Text style={styles.kcalValue}>{kcal}</Text>
              <Text style={styles.kcalUnit}>kcal</Text>
            </View>
            <AppButton
              title="+"
              variant="secondary"
              full={false}
              style={styles.stepBtn}
              onPress={() => setKcal(kcal + CALORIE_STEP)}
            />
          </View>
          <View style={styles.presetRow}>
            {CALORIE_PRESETS.map((c) => (
              <Chip key={c} label={`${c}`} selected={kcal === c} onPress={() => setKcal(c)} />
            ))}
          </View>

          {/* Reparto de macros */}
          <Text style={[styles.label, { marginTop: spacing.lg }]}>Reparto de macros</Text>
          <View style={styles.presetRow}>
            {MACRO_SPLITS.map((s) => {
              const active =
                split.protein === s.protein && split.carbs === s.carbs && split.fat === s.fat;
              return (
                <Chip
                  key={s.key}
                  label={s.label}
                  emoji={s.emoji}
                  selected={active}
                  onPress={() => setSplit({ protein: s.protein, carbs: s.carbs, fat: s.fat })}
                />
              );
            })}
          </View>

          {/* Resumen en gramos */}
          <View style={styles.summary}>
            <MacroChunk
              label="Proteína"
              pct={split.protein}
              grams={grams.protein}
              tint={macroColors.protein.color}
              soft={macroColors.protein.soft}
            />
            <MacroChunk
              label="Carbos"
              pct={split.carbs}
              grams={grams.carbs}
              tint={macroColors.carbs.color}
              soft={macroColors.carbs.soft}
            />
            <MacroChunk
              label="Grasas"
              pct={split.fat}
              grams={grams.fat}
              tint={macroColors.fat.color}
              soft={macroColors.fat.soft}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MacroChunk({
  label,
  pct,
  grams,
  tint,
  soft,
}: {
  label: string;
  pct: number;
  grams: number;
  tint: string;
  soft: string;
}) {
  return (
    <View style={[styles.chunk, { backgroundColor: soft }]}>
      <Text style={[styles.chunkPct, { color: tint }]}>{pct}%</Text>
      <Text style={styles.chunkGrams}>{grams} g</Text>
      <Text style={styles.chunkLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  switchSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  body: { marginTop: spacing.lg },
  label: {
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  stepBtn: { width: 54, paddingHorizontal: 0 },
  kcalValueWrap: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  kcalValue: { fontSize: font.size.xxl, fontWeight: font.weight.heavy, color: colors.text },
  kcalUnit: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.semibold },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  chunk: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  chunkPct: { fontSize: font.size.lg, fontWeight: font.weight.heavy },
  chunkGrams: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.semibold, marginTop: 2 },
  chunkLabel: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
