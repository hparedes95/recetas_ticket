import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Card, AppButton, MacroSummary, EmptyState } from '../components/ui';
import { colors, spacing, font, radius, goalMeta, slotMeta, dayNamesFull } from '../theme';
import { useApp } from '../context/AppContext';
import { RECIPE_BY_ID } from '../data/recipes';
import { MealSlot, PlannedMeal } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'PlanDetail'>;

const SLOT_ORDER: MealSlot[] = ['desayuno', 'comida', 'cena', 'snack'];

export default function PlanDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const { plans, selectPlan, buildShoppingFromSelected } = useApp();

  const plan = useMemo(
    () => plans.find((p) => p.id === route.params.planId),
    [plans, route.params.planId],
  );

  useEffect(() => {
    if (plan) selectPlan(plan.id);
  }, [plan, selectPlan]);

  const byDay = useMemo(() => {
    const days: PlannedMeal[][] = Array.from({ length: 7 }, () => []);
    if (plan) {
      for (const m of plan.meals) days[m.day].push(m);
      for (const d of days)
        d.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
    }
    return days;
  }, [plan]);

  if (!plan) {
    return (
      <Screen>
        <EmptyState emoji="🤔" title="Plan no encontrado" subtitle="Vuelve a generar tus planes." />
      </Screen>
    );
  }

  const meta = goalMeta[plan.goal];

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 34 }}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Title>{plan.title}</Title>
          <Text style={styles.subtitle}>{plan.subtitle}</Text>
        </View>
      </View>

      <View style={{ height: spacing.lg }} />
      <Card>
        <MacroSummary macros={plan.avgDailyMacros} label="Media por día" />
        {plan.calorieTarget ? (
          <Text style={styles.targetNote}>
            🎯 Tu objetivo: {plan.calorieTarget} kcal
            {plan.macroSplit
              ? `  ·  P${plan.macroSplit.protein} · C${plan.macroSplit.carbs} · G${plan.macroSplit.fat}`
              : ''}
          </Text>
        ) : null}
      </Card>

      <View style={{ height: spacing.md }} />
      <AppButton
        title={
          plan.missing.length > 0
            ? `Ver lista de la compra (${plan.missing.length})`
            : 'Ver lista de la compra'
        }
        icon="🛒"
        onPress={() => {
          buildShoppingFromSelected();
          nav.navigate('Main', { screen: 'Compra' });
        }}
      />

      {byDay.map((meals, day) => (
        <View key={day}>
          <Text style={styles.dayTitle}>{dayNamesFull[day]}</Text>
          <Card style={{ paddingVertical: spacing.xs }}>
            {meals.length === 0 ? (
              <Text style={styles.emptyDay}>Sin comidas planificadas</Text>
            ) : (
              meals.map((m, i) => {
                const r = RECIPE_BY_ID[m.recipeId];
                if (!r) return null;
                return (
                  <Pressable
                    key={`${m.slot}-${i}`}
                    onPress={() => nav.navigate('RecipeDetail', { recipeId: r.id })}
                    style={styles.mealRow}
                  >
                    <Text style={styles.mealEmoji}>{r.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealSlot}>
                        {slotMeta[m.slot].emoji} {slotMeta[m.slot].label}
                      </Text>
                      <Text style={styles.mealName}>{r.name}</Text>
                    </View>
                    <View style={styles.mealMeta}>
                      <Text style={styles.mealKcal}>
                        {Math.round(r.macros.kcal * (m.portionFactor ?? 1))} kcal
                      </Text>
                      <Text
                        style={[
                          styles.mealCoverage,
                          { color: m.coverage >= 0.99 ? colors.success : colors.warning },
                        ]}
                      >
                        {m.coverage >= 0.99 ? '✓ Lo tienes' : `${Math.round(m.coverage * 100)}%`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subtitle: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  targetNote: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    fontWeight: font.weight.semibold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  dayTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyDay: { fontSize: font.size.sm, color: colors.textFaint, paddingVertical: spacing.md },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mealEmoji: { fontSize: 28 },
  mealSlot: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: font.weight.semibold },
  mealName: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text, marginTop: 1 },
  mealMeta: { alignItems: 'flex-end' },
  mealKcal: { fontSize: font.size.xs, color: colors.textMuted },
  mealPortion: { fontSize: 10, color: colors.textFaint, marginTop: 1 },
  mealCoverage: { fontSize: font.size.xs, fontWeight: font.weight.bold, marginTop: 2 },
});
