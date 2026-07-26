import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Subtitle, Card, AppButton, EmptyState, ProgressBar } from '../components/ui';
import { colors, spacing, font, radius, goalMeta } from '../theme';
import { useApp } from '../context/AppContext';
import { MealPlan } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function avgCoverage(plan: MealPlan): number {
  if (plan.meals.length === 0) return 0;
  return plan.meals.reduce((s, m) => s + m.coverage, 0) / plan.meals.length;
}

export default function PlansScreen() {
  const nav = useNavigation<Nav>();
  const { plans, selectedPlanId, selectPlan, regeneratePlans, pantry } = useApp();

  if (plans.length === 0) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <Title>Planes</Title>
        </View>
        <EmptyState
          emoji="✨"
          title="Aún no hay planes"
          subtitle={
            pantry.length > 0
              ? 'Genera varias opciones de menú semanal a partir de tu despensa.'
              : 'Añade productos a tu despensa y luego genera tus planes de comida.'
          }
          action={
            <AppButton
              title="Generar planes"
              icon="✨"
              onPress={() => {
                regeneratePlans();
              }}
            />
          }
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Title>Elige tu plan</Title>
      <Subtitle>
        Distintos menús para toda la semana con lo que tienes. Toca uno para ver el detalle.
      </Subtitle>

      <View style={{ height: spacing.lg }} />

      {plans.map((plan) => {
        const meta = goalMeta[plan.goal];
        const cov = avgCoverage(plan);
        const selected = plan.id === selectedPlanId;
        return (
          <Pressable
            key={plan.id}
            onPress={() => {
              selectPlan(plan.id);
              nav.navigate('PlanDetail', { planId: plan.id });
            }}
            style={{ marginBottom: spacing.md }}
          >
            <Card
              style={[
                styles.planCard,
                { borderColor: selected ? meta.color : colors.border, borderWidth: selected ? 2 : 1 },
              ]}
            >
              <View style={styles.planTop}>
                <View style={[styles.iconBubble, { backgroundColor: meta.soft }]}>
                  <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    {selected ? (
                      <View style={[styles.selectedTag, { backgroundColor: meta.color }]}>
                        <Text style={styles.selectedTagText}>Elegido</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.planSub}>{plan.subtitle}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: meta.color }]}>{plan.avgDailyMacros.kcal}</Text>
                  <Text style={styles.statLabel}>kcal/día</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: meta.color }]}>
                    {plan.avgDailyMacros.protein}g
                  </Text>
                  <Text style={styles.statLabel}>proteína/día</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: meta.color }]}>{plan.missing.length}</Text>
                  <Text style={styles.statLabel}>por comprar</Text>
                </View>
              </View>

              <View style={styles.coverageRow}>
                <Text style={styles.coverageLabel}>
                  Cubierto con tu despensa · {Math.round(cov * 100)}%
                </Text>
                <ProgressBar value={cov} color={meta.color} />
              </View>
            </Card>
          </Pressable>
        );
      })}

      <View style={{ height: spacing.md }} />
      <AppButton title="Regenerar opciones" icon="🔄" variant="ghost" onPress={regeneratePlans} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  planCard: { gap: spacing.lg },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planTitle: { fontSize: font.size.lg, fontWeight: font.weight.heavy, color: colors.text },
  planSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  selectedTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  selectedTagText: { color: '#fff', fontSize: 11, fontWeight: font.weight.bold },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: font.size.xl, fontWeight: font.weight.heavy },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  coverageRow: { gap: spacing.sm },
  coverageLabel: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: font.weight.semibold },
});
