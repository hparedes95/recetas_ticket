import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Screen, Title, Subtitle, Card, AppButton, Chip, SectionTitle } from '../components/ui';
import { colors, spacing, font, goalMeta, dietTagMeta, slotMeta } from '../theme';
import { useApp } from '../context/AppContext';
import { DietGoal, DietTag, MealSlot } from '../types';
import { TargetPicker } from '../components/TargetPicker';

const GOALS = Object.keys(goalMeta) as DietGoal[];
const SLOTS: MealSlot[] = ['desayuno', 'comida', 'cena', 'snack'];
const TAGS = Object.keys(dietTagMeta) as DietTag[];

export default function PreferencesScreen() {
  const { preferences, updatePreferences, regeneratePlans } = useApp();
  const p = preferences;

  const toggleMeal = (s: MealSlot) => {
    const next = p.mealsPerDay.includes(s)
      ? p.mealsPerDay.filter((m) => m !== s)
      : [...p.mealsPerDay, s];
    updatePreferences({ mealsPerDay: next.length ? next : p.mealsPerDay });
  };
  const toggleTag = (t: DietTag) => {
    const next = p.restrictions.includes(t)
      ? p.restrictions.filter((x) => x !== t)
      : [...p.restrictions, t];
    updatePreferences({ restrictions: next });
  };

  return (
    <Screen scroll>
      <Title>Ajustes</Title>
      <Subtitle>Tus preferencias afectan a los planes y recetas que te proponemos.</Subtitle>

      <SectionTitle>Objetivo preferido</SectionTitle>
      <View style={styles.wrap}>
        {GOALS.map((g) => (
          <Chip
            key={g}
            label={goalMeta[g].label}
            emoji={goalMeta[g].emoji}
            selected={p.defaultGoal === g}
            onPress={() => updatePreferences({ defaultGoal: g })}
          />
        ))}
      </View>

      <SectionTitle>Personas</SectionTitle>
      <View style={styles.stepper}>
        <AppButton title="−" variant="secondary" full={false} style={styles.stepBtn} onPress={() => updatePreferences({ people: Math.max(1, p.people - 1) })} />
        <Text style={styles.stepValue}>{p.people}</Text>
        <AppButton title="+" variant="secondary" full={false} style={styles.stepBtn} onPress={() => updatePreferences({ people: Math.min(8, p.people + 1) })} />
      </View>

      <SectionTitle>Comidas a planificar</SectionTitle>
      <View style={styles.wrap}>
        {SLOTS.map((s) => (
          <Chip
            key={s}
            label={slotMeta[s].label}
            emoji={slotMeta[s].emoji}
            selected={p.mealsPerDay.includes(s)}
            onPress={() => toggleMeal(s)}
          />
        ))}
      </View>

      <SectionTitle>Restricciones</SectionTitle>
      <View style={styles.wrap}>
        {TAGS.map((t) => (
          <Chip
            key={t}
            label={dietTagMeta[t].label}
            emoji={dietTagMeta[t].emoji}
            selected={p.restrictions.includes(t)}
            onPress={() => toggleTag(t)}
          />
        ))}
      </View>

      <SectionTitle>Calorías y macros</SectionTitle>
      <Card>
        <TargetPicker
          calorieTarget={p.calorieTarget}
          macroSplit={p.macroSplit}
          onChange={(next) => updatePreferences(next)}
        />
      </Card>

      <View style={{ height: spacing.xl }} />
      <AppButton
        title="Aplicar y regenerar planes"
        icon="🔄"
        onPress={() => {
          regeneratePlans();
          Alert.alert('Planes actualizados', 'Hemos vuelto a generar tus planes con las nuevas preferencias.');
        }}
      />

      <View style={{ height: spacing.xxl }} />
      <Card style={{ backgroundColor: colors.cardAlt }}>
        <Text style={styles.about}>Recetas del Ticket · versión 1.0.0</Text>
        <Text style={styles.aboutSub}>
          Planifica tus comidas semanales a partir de tu compra. Hecho con Expo + React Native.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  about: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.text },
  aboutSub: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
});
