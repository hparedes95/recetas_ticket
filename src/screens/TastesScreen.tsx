import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen, Title, Subtitle, Card, SectionTitle, AppButton } from '../components/ui';
import { colors, spacing, font, radius } from '../theme';
import { useApp } from '../context/AppContext';
import { INGREDIENTS } from '../data/ingredients';
import { CATEGORY_META } from '../data/catalog';
import { normalizeText } from '../data/ingredients';

type Taste = 'like' | 'dislike' | null;

/**
 * Pantalla "Mis gustos": el usuario marca lo que le encanta (se prioriza en los
 * planes) y lo que no quiere ver (nunca aparece en sus comidas).
 */
export default function TastesScreen() {
  const { preferences, updatePreferences } = useApp();
  const [query, setQuery] = useState('');

  const likes = new Set(preferences.likes ?? []);
  const dislikes = new Set(preferences.dislikes ?? []);

  const groups = useMemo(() => {
    const q = normalizeText(query);
    const items = INGREDIENTS.filter(
      (d) =>
        d.category !== 'bebida' &&
        d.category !== 'dulce' &&
        d.staple !== true &&
        (!q || normalizeText(d.name).includes(q) || d.keywords.some((k) => normalizeText(k).includes(q))),
    );
    const byCat = new Map<string, typeof items>();
    for (const it of items) {
      if (!byCat.has(it.category)) byCat.set(it.category, []);
      byCat.get(it.category)!.push(it);
    }
    return Array.from(byCat.entries()).sort(
      (a, b) =>
        (CATEGORY_META[a[0] as keyof typeof CATEGORY_META]?.order ?? 99) -
        (CATEGORY_META[b[0] as keyof typeof CATEGORY_META]?.order ?? 99),
    );
  }, [query]);

  const tasteOf = (key: string): Taste =>
    likes.has(key) ? 'like' : dislikes.has(key) ? 'dislike' : null;

  /** Cicla: neutro → me gusta → no quiero → neutro */
  const cycle = (key: string) => {
    const current = tasteOf(key);
    const nextLikes = new Set(likes);
    const nextDislikes = new Set(dislikes);
    nextLikes.delete(key);
    nextDislikes.delete(key);
    if (current === null) nextLikes.add(key);
    else if (current === 'like') nextDislikes.add(key);
    updatePreferences({ likes: [...nextLikes], dislikes: [...nextDislikes] });
  };

  const clearAll = () => updatePreferences({ likes: [], dislikes: [] });

  return (
    <Screen scroll>
      <Title>Mis gustos</Title>
      <Subtitle>
        Toca un alimento para marcarlo. Una vez ❤️ te gusta (saldrá más), dos veces 🚫 no lo quieres
        (no aparecerá en tus planes), y otra vez lo dejas neutro.
      </Subtitle>

      <View style={{ height: spacing.lg }} />
      <TextInput
        style={styles.search}
        placeholder="Buscar alimento…"
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={setQuery}
      />

      {(likes.size > 0 || dislikes.size > 0) && (
        <>
          <View style={{ height: spacing.md }} />
          <Card style={styles.summary}>
            <Text style={styles.summaryText}>
              ❤️ {likes.size} favorito{likes.size === 1 ? '' : 's'} · 🚫 {dislikes.size} descartado
              {dislikes.size === 1 ? '' : 's'}
            </Text>
            <Pressable onPress={clearAll} hitSlop={8}>
              <Text style={styles.clear}>Limpiar</Text>
            </Pressable>
          </Card>
        </>
      )}

      {groups.map(([cat, items]) => (
        <View key={cat}>
          <SectionTitle>
            {CATEGORY_META[cat as keyof typeof CATEGORY_META]?.emoji ?? '🛒'}{'  '}
            {CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label ?? 'Otros'}
          </SectionTitle>
          <View style={styles.grid}>
            {items.map((d) => {
              const t = tasteOf(d.key);
              return (
                <Pressable
                  key={d.key}
                  onPress={() => cycle(d.key)}
                  style={[
                    styles.item,
                    t === 'like' && styles.itemLike,
                    t === 'dislike' && styles.itemDislike,
                  ]}
                >
                  <Text style={styles.itemEmoji}>{d.emoji}</Text>
                  <Text
                    style={[
                      styles.itemName,
                      t === 'dislike' && styles.itemNameDislike,
                    ]}
                    numberOfLines={1}
                  >
                    {d.name}
                  </Text>
                  {t ? <Text style={styles.itemMark}>{t === 'like' ? '❤️' : '🚫'}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {groups.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No encontramos ese alimento.</Text>
        </Card>
      ) : null}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: colors.text,
  },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryText: { fontSize: font.size.sm, color: colors.textMuted },
  clear: { fontSize: font.size.sm, color: colors.danger, fontWeight: font.weight.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemLike: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  itemDislike: { backgroundColor: colors.cardAlt, borderColor: colors.border, opacity: 0.75 },
  itemEmoji: { fontSize: 16 },
  itemName: { fontSize: font.size.sm, color: colors.text, fontWeight: font.weight.medium },
  itemNameDislike: { textDecorationLine: 'line-through', color: colors.textFaint },
  itemMark: { fontSize: 12 },
  empty: { fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center' },
});
