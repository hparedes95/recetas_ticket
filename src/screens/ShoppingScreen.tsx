import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Subtitle, Card, AppButton, EmptyState, Badge } from '../components/ui';
import { colors, spacing, font, radius, goalMeta } from '../theme';
import { useApp } from '../context/AppContext';
import { confirmAction, notify } from '../utils/dialog';
import { INGREDIENT_BY_KEY } from '../data/ingredients';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ShoppingScreen() {
  const nav = useNavigation<Nav>();
  const {
    shopping,
    selectedPlan,
    buildShoppingFromSelected,
    toggleShoppingItem,
    addBoughtToPantry,
    clearShopping,
  } = useApp();

  if (shopping.length === 0) {
    return (
      <Screen>
        <View style={{ padding: spacing.lg }}>
          <Title>Compra</Title>
        </View>
        <EmptyState
          emoji="🛒"
          title="Lista de la compra vacía"
          subtitle={
            selectedPlan
              ? 'Genera la lista con lo que falta para tu plan elegido.'
              : 'Elige un plan y crearemos la lista con lo que te falta comprar.'
          }
          action={
            selectedPlan ? (
              <AppButton title="Crear lista del plan" icon="✨" onPress={buildShoppingFromSelected} />
            ) : (
              <AppButton
                title="Ir a planes"
                icon="📋"
                onPress={() => nav.navigate('Main', { screen: 'Planes' })}
              />
            )
          }
        />
      </Screen>
    );
  }

  const checkedCount = shopping.filter((s) => s.checked).length;

  const confirmBought = () => {
    const n = addBoughtToPantry();
    if (n > 0) {
      notify('¡Añadido!', `${n} producto${n > 1 ? 's' : ''} pasaron a tu despensa.`);
    }
  };

  return (
    <Screen scroll>
      <Title>Lista de la compra</Title>
      {selectedPlan ? (
        <View style={styles.planTag}>
          <Badge
            label={`${goalMeta[selectedPlan.goal].emoji} Para: ${selectedPlan.title}`}
            color={goalMeta[selectedPlan.goal].color}
            soft={goalMeta[selectedPlan.goal].soft}
          />
        </View>
      ) : null}
      <Subtitle>
        Marca lo que vayas cogiendo. Al terminar, pásalo a tu despensa y actualizará tus planes.
      </Subtitle>

      <View style={{ height: spacing.lg }} />
      <Card style={{ paddingVertical: spacing.xs }}>
        {shopping.map((item) => {
          const def = INGREDIENT_BY_KEY[item.key];
          return (
            <Pressable key={item.key} style={styles.row} onPress={() => toggleShoppingItem(item.key)}>
              <View style={[styles.checkbox, item.checked && styles.checkboxOn]}>
                {item.checked ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.rowEmoji}>{def?.emoji ?? '🛒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, item.checked && styles.rowNameChecked]}>{item.name}</Text>
                {item.quantity ? (
                  <Text style={styles.rowQty}>
                    {item.quantity} {item.unit ?? ''}
                  </Text>
                ) : null}
              </View>
              {item.usedIn > 1 ? (
                <Text style={styles.usedIn}>×{item.usedIn}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </Card>

      <View style={{ height: spacing.lg }} />
      <AppButton
        title={
          checkedCount > 0
            ? `Añadir ${checkedCount} a la despensa`
            : 'Marca lo que hayas comprado'
        }
        icon="✅"
        disabled={checkedCount === 0}
        onPress={confirmBought}
      />
      <View style={{ height: spacing.sm }} />
      <View style={styles.secondaryRow}>
        <AppButton
          title="Regenerar"
          icon="🔄"
          variant="ghost"
          full={false}
          style={{ flex: 1 }}
          onPress={buildShoppingFromSelected}
        />
        <AppButton
          title="Vaciar"
          icon="🗑️"
          variant="ghost"
          full={false}
          style={{ flex: 1 }}
          onPress={() =>
            confirmAction({
              title: 'Vaciar lista',
              message: '¿Vaciar la lista de la compra?',
              confirmText: 'Vaciar',
              destructive: true,
              onConfirm: clearShopping,
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  planTag: { marginTop: spacing.sm, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: font.weight.bold, fontSize: font.size.sm },
  rowEmoji: { fontSize: 22 },
  rowName: { fontSize: font.size.md, color: colors.text, fontWeight: font.weight.medium },
  rowQty: { fontSize: font.size.xs, color: colors.primary, fontWeight: font.weight.semibold, marginTop: 1 },
  rowNameChecked: { textDecorationLine: 'line-through', color: colors.textFaint },
  usedIn: { fontSize: font.size.xs, color: colors.textMuted, fontWeight: font.weight.bold },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
});
