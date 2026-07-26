import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Title, Subtitle, AppButton } from '../components/ui';
import { colors, spacing, font, radius, shadow } from '../theme';
import { useApp } from '../context/AppContext';
import { getCatalogGroups } from '../data/catalog';
import { normalizeText } from '../data/ingredients';
import { productFromKey, productFromText } from '../engine/ticketParser';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ShoppingModeScreen() {
  const nav = useNavigation<Nav>();
  const { pantry, addProducts, removeProduct } = useApp();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => getCatalogGroups(), []);
  const addedKeys = useMemo(() => new Set(pantry.map((p) => p.ingredientKey)), [pantry]);

  const q = normalizeText(query);
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            normalizeText(it.name).includes(q) ||
            it.keywords.some((k) => normalizeText(k).includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const toggle = (key: string) => {
    if (addedKeys.has(key)) {
      const existing = pantry.find((p) => p.ingredientKey === key);
      if (existing) removeProduct(existing.id);
    } else {
      const product = productFromKey(key, 'compra');
      if (product) addProducts([product]);
    }
  };

  const addCustom = () => {
    if (!query.trim()) return;
    addProducts([productFromText(query, 'compra')]);
    setQuery('');
  };

  const noMatches = q.length > 0 && filteredGroups.length === 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Title>Modo compra 🛒</Title>
        <Subtitle>Toca los productos que vas metiendo en el carro. Se añaden a tu despensa.</Subtitle>
        <TextInput
          style={styles.search}
          placeholder="Buscar o añadir producto…"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {noMatches ? (
          <View style={styles.noMatch}>
            <Text style={styles.noMatchText}>Sin resultados para “{query}”.</Text>
            <AppButton
              title={`Añadir “${query.trim()}” igualmente`}
              icon="➕"
              variant="secondary"
              onPress={addCustom}
            />
          </View>
        ) : null}

        {filteredGroups.map((g) => (
          <View key={g.category} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.groupTitle}>
              {g.emoji}  {g.label}
            </Text>
            <View style={styles.itemWrap}>
              {g.items.map((it) => {
                const active = addedKeys.has(it.key);
                return (
                  <Pressable
                    key={it.key}
                    onPress={() => toggle(it.key)}
                    style={[styles.item, active && styles.itemActive]}
                  >
                    <Text style={styles.itemEmoji}>{it.emoji}</Text>
                    <Text style={[styles.itemText, active && styles.itemTextActive]}>{it.name}</Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerCount}>{pantry.length}</Text>
          <Text style={styles.footerLabel}>en la despensa</Text>
        </View>
        <AppButton
          title="Terminar compra"
          icon="✅"
          full={false}
          style={{ flex: 1, marginLeft: spacing.lg }}
          onPress={() => nav.navigate('Main', { screen: 'Planes' })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  search: {
    marginTop: spacing.lg,
    height: 48,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: font.size.md,
    color: colors.text,
  },
  listContent: { padding: spacing.lg, paddingBottom: 120 },
  groupTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  itemWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  itemActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  itemEmoji: { fontSize: 18 },
  itemText: { fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.text },
  itemTextActive: { color: colors.primaryDark, fontWeight: font.weight.bold },
  check: { color: colors.primary, fontWeight: font.weight.bold, marginLeft: 2 },

  noMatch: { marginBottom: spacing.lg, gap: spacing.md },
  noMatchText: { fontSize: font.size.md, color: colors.textMuted },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.floating,
  },
  footerCount: { fontSize: font.size.xl, fontWeight: font.weight.heavy, color: colors.primary },
  footerLabel: { fontSize: font.size.xs, color: colors.textMuted },
});
