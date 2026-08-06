import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Subtitle, Card, AppButton, SectionTitle, Badge } from '../components/ui';
import { colors, spacing, font, radius, goalMeta, shadow } from '../theme';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { pantry, selectedPlan, plans, regeneratePlans, recommendWeek, getRecipe } = useApp();

  const greeting = getGreeting();

  // Flujo "recomiéndame": la app propone la semana y deja la compra lista.
  const onRecommend = () => {
    const plan = recommendWeek();
    nav.navigate('PlanDetail', { planId: plan.id });
  };

  return (
    <Screen scroll>
      <Text style={styles.kicker}>{greeting}</Text>
      <Title>¿Qué cocinamos esta semana?</Title>

      {/* Flujo recomendado: plan primero, compra después */}
      <Card style={styles.recCard}>
        <Text style={styles.addEmoji}>✨</Text>
        <Text style={styles.addTitle}>Recomiéndame la semana</Text>
        <Text style={styles.addSub}>
          Te proponemos el menú según tu objetivo y te decimos justo qué comprar.
        </Text>
        <AppButton title="Crear mi semana" icon="🍽️" onPress={onRecommend} />
      </Card>

      {/* Añadir la compra */}
      <Card style={styles.addCard}>
        <Text style={styles.addEmoji}>🧾</Text>
        <Text style={styles.addTitle}>Añade tu compra</Text>
        <Text style={styles.addSub}>
          Escanea o escribe el ticket, o ve añadiendo productos mientras compras.
        </Text>
        <View style={styles.addBtns}>
          <AppButton
            title="Añadir ticket"
            icon="📷"
            onPress={() => nav.navigate('AddTicket')}
            style={{ flex: 1 }}
            full={false}
          />
          <AppButton
            title="Modo compra"
            icon="🛒"
            variant="secondary"
            onPress={() => nav.navigate('ShoppingMode')}
            style={{ flex: 1 }}
            full={false}
          />
        </View>
      </Card>

      {/* Despensa */}
      <Pressable onPress={() => nav.navigate('Main', { screen: 'Despensa' })}>
        <Card style={styles.rowCard}>
          <Text style={styles.rowEmoji}>🥦</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Tu despensa</Text>
            <Text style={styles.rowSub}>
              {pantry.length > 0
                ? `${pantry.length} producto${pantry.length > 1 ? 's' : ''} disponible${
                    pantry.length > 1 ? 's' : ''
                  }`
                : 'Aún no has añadido productos'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Card>
      </Pressable>

      {/* Planes */}
      <SectionTitle>Tu plan semanal</SectionTitle>
      {selectedPlan ? (
        <Pressable onPress={() => nav.navigate('PlanDetail', { planId: selectedPlan.id })}>
          <Card style={{ borderLeftWidth: 5, borderLeftColor: goalMeta[selectedPlan.goal].color }}>
            <View style={styles.planHeader}>
              <Text style={styles.planEmoji}>{goalMeta[selectedPlan.goal].emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{selectedPlan.title}</Text>
                <Text style={styles.planSub}>
                  {selectedPlan.avgDailyMacros.kcal} kcal/día · {selectedPlan.meals.length} comidas
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
            <View style={styles.previewRow}>
              {selectedPlan.meals.slice(0, 6).map((m, i) => {
                const r = getRecipe(m.recipeId);
                return (
                  <Text key={i} style={styles.previewEmoji}>
                    {r?.emoji ?? '🍽️'}
                  </Text>
                );
              })}
            </View>
            {selectedPlan.missing.length > 0 ? (
              <Badge
                label={`Faltan ${selectedPlan.missing.length} ingredientes por comprar`}
                color={colors.warning}
                soft="#FEF3C7"
              />
            ) : (
              <Badge label="¡Tienes todo lo necesario! 🎉" />
            )}
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Text style={styles.rowSub}>
            {pantry.length > 0
              ? 'Genera planes de comida a partir de lo que tienes en la despensa.'
              : 'Añade primero algunos productos y luego genera tus planes.'}
          </Text>
          <View style={{ height: spacing.md }} />
          <AppButton
            title={plans.length > 0 ? 'Ver planes' : 'Crear mis planes'}
            icon="✨"
            onPress={() => {
              if (plans.length === 0) regeneratePlans();
              nav.navigate('Main', { screen: 'Planes' });
            }}
          />
        </Card>
      )}
    </Screen>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches 🌙';
  if (h < 14) return 'Buenos días ☀️';
  if (h < 21) return 'Buenas tardes 🌤️';
  return 'Buenas noches 🌙';
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: font.size.md,
    color: colors.textMuted,
    fontWeight: font.weight.semibold,
    marginBottom: 2,
  },
  addCard: { marginTop: spacing.xl, backgroundColor: colors.primaryDark },
  recCard: { marginTop: spacing.xl, backgroundColor: colors.accent },
  addEmoji: { fontSize: 34 },
  addTitle: {
    fontSize: font.size.xl,
    fontWeight: font.weight.heavy,
    color: '#fff',
    marginTop: spacing.sm,
  },
  addSub: { fontSize: font.size.sm, color: '#D9F5E4', marginTop: 4, lineHeight: 20 },
  addBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },

  rowCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowEmoji: { fontSize: 30 },
  rowTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  rowSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2, lineHeight: 20 },
  chevron: { fontSize: 28, color: colors.textFaint, fontWeight: font.weight.regular },

  planHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planEmoji: { fontSize: 30 },
  planTitle: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text },
  planSub: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.lg,
    flexWrap: 'wrap',
  },
  previewEmoji: { fontSize: 26 },
});
