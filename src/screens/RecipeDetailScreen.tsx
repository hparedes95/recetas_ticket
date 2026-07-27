import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import { Screen, Title, Card, MacroSummary, Badge, EmptyState } from '../components/ui';
import { colors, spacing, font, radius, dietTagMeta, slotMeta } from '../theme';
import { useApp } from '../context/AppContext';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { RootStackParamList } from '../navigation/types';

type DetailRoute = RouteProp<RootStackParamList, 'RecipeDetail'>;

export default function RecipeDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { pantry, getRecipe } = useApp();
  const recipe = getRecipe(route.params.recipeId);

  const availableKeys = useMemo(() => new Set(pantry.map((p) => p.ingredientKey)), [pantry]);

  if (!recipe) {
    return (
      <Screen>
        <EmptyState emoji="🤔" title="Receta no encontrada" />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{recipe.emoji}</Text>
        <Title>{recipe.name}</Title>
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>⏱️ {recipe.timeMinutes} min</Text>
          <Text style={styles.metaItem}>🍽️ {recipe.servings} ración{recipe.servings > 1 ? 'es' : ''}</Text>
          <Text style={styles.metaItem}>
            {recipe.slot.map((s) => slotMeta[s].emoji).join(' ')}
          </Text>
        </View>
        {recipe.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {recipe.tags.map((t) => (
              <Badge key={t} label={`${dietTagMeta[t]?.emoji ?? ''} ${dietTagMeta[t]?.label ?? t}`} />
            ))}
          </View>
        ) : null}
      </View>

      <Card>
        <MacroSummary macros={recipe.macros} label="Por ración" />
      </Card>

      <Text style={styles.sectionTitle}>Ingredientes</Text>
      <Card style={{ paddingVertical: spacing.xs }}>
        {recipe.ingredients.map((ing, i) => {
          const def = INGREDIENT_BY_KEY[ing.key];
          const have = availableKeys.has(ing.key) || ing.staple || def?.staple;
          return (
            <View key={`${ing.key}-${i}`} style={styles.ingRow}>
              <Text style={styles.ingEmoji}>{def?.emoji ?? '•'}</Text>
              <Text style={styles.ingName}>
                {ing.name}
                {ing.quantity ? `  ·  ${ing.quantity}${ing.unit ? ` ${ing.unit}` : ''}` : ''}
              </Text>
              {have ? (
                <Text style={[styles.ingStatus, { color: colors.success }]}>✓</Text>
              ) : (
                <Text style={[styles.ingStatus, { color: colors.warning }]}>comprar</Text>
              )}
            </View>
          );
        })}
      </Card>

      <Text style={styles.sectionTitle}>Preparación</Text>
      <Card>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  heroEmoji: { fontSize: 64, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  metaItem: { fontSize: font.size.sm, color: colors.textMuted, fontWeight: font.weight.semibold },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, justifyContent: 'center' },

  sectionTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ingEmoji: { fontSize: 20, width: 26, textAlign: 'center' },
  ingName: { flex: 1, fontSize: font.size.md, color: colors.text },
  ingStatus: { fontSize: font.size.sm, fontWeight: font.weight.bold },

  stepRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: colors.primaryDark, fontWeight: font.weight.bold, fontSize: font.size.sm },
  stepText: { flex: 1, fontSize: font.size.md, color: colors.text, lineHeight: 22 },
});
