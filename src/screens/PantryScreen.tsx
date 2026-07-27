import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Card, AppButton, EmptyState, Badge, SectionTitle } from '../components/ui';
import { colors, spacing, font, radius } from '../theme';
import { useApp } from '../context/AppContext';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { CATEGORY_META } from '../data/catalog';
import { Product } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const sourceMeta: Record<Product['source'], { label: string; color: string; soft: string }> = {
  foto: { label: 'Ticket', color: colors.primary, soft: colors.primarySoft },
  manual: { label: 'Manual', color: '#7C3AED', soft: '#EDE9FE' },
  compra: { label: 'Compra', color: colors.accent, soft: colors.accentSoft },
  documento: { label: 'Documento', color: '#0EA5E9', soft: '#E0F2FE' },
};

export default function PantryScreen() {
  const nav = useNavigation<Nav>();
  const { pantry, removeProduct, clearPantry, regeneratePlans } = useApp();

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of pantry) {
      const cat = INGREDIENT_BY_KEY[p.ingredientKey]?.category ?? 'otro';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).sort(
      (a, b) => (CATEGORY_META[a[0] as keyof typeof CATEGORY_META]?.order ?? 99) -
        (CATEGORY_META[b[0] as keyof typeof CATEGORY_META]?.order ?? 99),
    );
  }, [pantry]);

  if (pantry.length === 0) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <Title>Despensa</Title>
        </View>
        <EmptyState
          emoji="🧺"
          title="Tu despensa está vacía"
          subtitle="Añade tu ticket de la compra o ve marcando productos en modo compra para empezar a planificar."
          action={
            <View style={{ gap: spacing.sm }}>
              <AppButton title="Añadir ticket" icon="📷" onPress={() => nav.navigate('AddTicket')} />
              <AppButton
                title="Modo compra"
                icon="🛒"
                variant="secondary"
                onPress={() => nav.navigate('ShoppingMode')}
              />
            </View>
          }
        />
      </Screen>
    );
  }

  const confirmClear = () =>
    Alert.alert('Vaciar despensa', '¿Seguro que quieres eliminar todos los productos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: clearPantry },
    ]);

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Title>Despensa</Title>
        <Pressable onPress={confirmClear} hitSlop={10}>
          <Text style={styles.clear}>Vaciar</Text>
        </Pressable>
      </View>
      <Text style={styles.count}>{pantry.length} productos disponibles</Text>

      <View style={styles.addRow}>
        <AppButton title="Ticket" icon="📷" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => nav.navigate('AddTicket')} />
        <AppButton title="Modo compra" icon="🛒" variant="secondary" full={false} style={{ flex: 1 }} onPress={() => nav.navigate('ShoppingMode')} />
      </View>

      {grouped.map(([cat, items]) => (
        <View key={cat}>
          <SectionTitle>
            {CATEGORY_META[cat as keyof typeof CATEGORY_META]?.emoji ?? '🛒'}{'  '}
            {CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label ?? 'Otros'}
          </SectionTitle>
          <Card style={{ paddingVertical: spacing.xs }}>
            {items.map((p) => {
              const def = INGREDIENT_BY_KEY[p.ingredientKey];
              const sm = sourceMeta[p.source];
              return (
                <View key={p.id} style={styles.row}>
                  <Text style={styles.rowEmoji}>{def?.emoji ?? '🛒'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{p.displayName}</Text>
                    {p.quantity ? (
                      <Text style={styles.rowQty}>
                        {p.quantity}
                        {p.unit ? ` ${p.unit}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label={sm.label} color={sm.color} soft={sm.soft} />
                  <Pressable hitSlop={10} onPress={() => removeProduct(p.id)} style={{ marginLeft: spacing.md }}>
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </View>
      ))}

      <View style={{ height: spacing.xl }} />
      <AppButton
        title="Generar planes con esto"
        icon="✨"
        onPress={() => {
          regeneratePlans();
          nav.navigate('Main', { screen: 'Planes' });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { color: colors.danger, fontWeight: font.weight.bold, fontSize: font.size.sm },
  count: { fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowEmoji: { fontSize: 24 },
  rowName: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  rowQty: { fontSize: font.size.xs, color: colors.textFaint, marginTop: 1 },
  remove: { fontSize: font.size.md, color: colors.textFaint },
});
