import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Title, Subtitle, AppButton, Chip, SectionTitle } from '../components/ui';
import { colors, spacing, font, radius, goalMeta, dietTagMeta, slotMeta } from '../theme';
import { useApp } from '../context/AppContext';
import { DietGoal, DietTag, MealSlot } from '../types';

const GOALS = Object.keys(goalMeta) as DietGoal[];
const SLOTS: MealSlot[] = ['desayuno', 'comida', 'cena', 'snack'];
const TAGS = Object.keys(dietTagMeta) as DietTag[];

export default function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const [goal, setGoal] = useState<DietGoal>('saludable');
  const [people, setPeople] = useState(1);
  const [meals, setMeals] = useState<MealSlot[]>(['desayuno', 'comida', 'cena']);
  const [restrictions, setRestrictions] = useState<DietTag[]>([]);

  const toggleMeal = (s: MealSlot) =>
    setMeals((prev) => (prev.includes(s) ? prev.filter((m) => m !== s) : [...prev, s]));
  const toggleTag = (t: DietTag) =>
    setRestrictions((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text style={styles.logo}>🧾🍳</Text>
        <Title>Recetas del Ticket</Title>
        <Subtitle>
          Convierte tu compra semanal en un plan de comidas hecho a tu medida. Cuéntanos un poco
          sobre ti para empezar.
        </Subtitle>
      </View>

      <SectionTitle>¿Qué buscas normalmente?</SectionTitle>
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <Chip
            key={g}
            label={goalMeta[g].label}
            emoji={goalMeta[g].emoji}
            selected={goal === g}
            onPress={() => setGoal(g)}
          />
        ))}
      </View>

      <SectionTitle>¿Para cuántas personas cocinas?</SectionTitle>
      <View style={styles.stepper}>
        <AppButton title="−" variant="secondary" full={false} onPress={() => setPeople((p) => Math.max(1, p - 1))} style={styles.stepBtn} />
        <Text style={styles.stepValue}>{people}</Text>
        <AppButton title="+" variant="secondary" full={false} onPress={() => setPeople((p) => Math.min(8, p + 1))} style={styles.stepBtn} />
      </View>

      <SectionTitle>¿Qué comidas quieres planificar?</SectionTitle>
      <View style={styles.wrap}>
        {SLOTS.map((s) => (
          <Chip
            key={s}
            label={slotMeta[s].label}
            emoji={slotMeta[s].emoji}
            selected={meals.includes(s)}
            onPress={() => toggleMeal(s)}
          />
        ))}
      </View>

      <SectionTitle>¿Alguna restricción? (opcional)</SectionTitle>
      <View style={styles.wrap}>
        {TAGS.map((t) => (
          <Chip
            key={t}
            label={dietTagMeta[t].label}
            emoji={dietTagMeta[t].emoji}
            selected={restrictions.includes(t)}
            onPress={() => toggleTag(t)}
          />
        ))}
      </View>

      <View style={{ height: spacing.xl }} />
      <AppButton
        title="Empezar"
        icon="🚀"
        onPress={() =>
          completeOnboarding({
            defaultGoal: goal,
            people,
            mealsPerDay: meals.length ? meals : ['comida', 'cena'],
            restrictions,
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.md },
  logo: { fontSize: 52, marginBottom: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  stepBtn: { width: 54, paddingHorizontal: 0 },
  stepValue: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.heavy,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
});
