import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Subtitle, Card, AppButton, SectionTitle } from '../components/ui';
import { colors, spacing, font, radius } from '../theme';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';
import {
  householdServings,
  poolSizeFor,
  targetKcalOf,
  POOL_WARN_THRESHOLD,
} from '../engine/household';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AGE_LABEL: Record<string, string> = {
  adulto: 'Adulto',
  adolescente: 'Adolescente',
  nino: 'Niño/a',
};

/** Pantalla "Mi familia": quién come en casa y los gustos de cada uno. */
export default function HouseholdScreen() {
  const nav = useNavigation<Nav>();
  const { profiles, household, addProfile, updateProfile, sync } = useApp();

  const raciones = householdServings(profiles);
  const pool = poolSizeFor(profiles, household);

  return (
    <Screen scroll>
      <Title>Mi familia</Title>
      <Subtitle>
        El menú es uno para todos: se evita lo que no le gusta a nadie y cada uno recibe su ración.
      </Subtitle>

      <View style={{ height: spacing.lg }} />
      <Card style={styles.summary}>
        <View>
          <Text style={styles.summaryBig}>{profiles.length}</Text>
          <Text style={styles.summaryLabel}>personas</Text>
        </View>
        <View>
          <Text style={styles.summaryBig}>{Math.round(raciones * 10) / 10}</Text>
          <Text style={styles.summaryLabel}>raciones</Text>
        </View>
        <View>
          <Text style={[styles.summaryBig, pool < POOL_WARN_THRESHOLD && styles.warn]}>{pool}</Text>
          <Text style={styles.summaryLabel}>platos posibles</Text>
        </View>
      </Card>

      {pool < POOL_WARN_THRESHOLD ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnText}>
            ⚠️ Con los gustos de todos quedan pocas opciones ({pool} platos). El menú perderá
            variedad: revisa los alimentos descartados de algún miembro.
          </Text>
        </Card>
      ) : null}

      <SectionTitle>Quién come en casa</SectionTitle>
      {profiles.map((p) => (
        <Card key={p.id} style={styles.profileCard}>
          <Pressable style={styles.profileRow} onPress={() => nav.navigate('ProfileEdit', { profileId: p.id })}>
            <Text style={styles.avatar}>{p.emoji}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{p.name}</Text>
                {p.isReference ? <Text style={styles.refBadge}>⭐ referencia</Text> : null}
              </View>
              <Text style={styles.meta}>
                {AGE_LABEL[p.ageGroup]} · {targetKcalOf(p)} kcal · ❤️ {p.likes.length} · 🚫{' '}
                {p.dislikes.length}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              onPress={() => updateProfile(p.id, { activeInPlan: !p.activeInPlan })}
              style={[styles.toggle, !p.activeInPlan && styles.toggleOff]}
            >
              <Text style={[styles.toggleText, !p.activeInPlan && styles.toggleTextOff]}>
                {p.activeInPlan ? '✓ Come esta semana' : 'No come esta semana'}
              </Text>
            </Pressable>
            <Pressable onPress={() => nav.navigate('Tastes', { profileId: p.id })} hitSlop={6}>
              <Text style={styles.tastesLink}>Sus gustos →</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <View style={{ height: spacing.md }} />
      <AppButton
        title="Añadir persona"
        icon="➕"
        variant="secondary"
        onPress={() => addProfile({ name: `Persona ${profiles.length + 1}` })}
      />

      <SectionTitle>Compartir entre móviles</SectionTitle>
      <Card>
        <Text style={styles.shareHint}>
          {sync
            ? 'Este móvil comparte los datos con tu familia. Todos veis los mismos planes y la misma lista.'
            : 'Conecta el móvil de tu pareja para que veáis los mismos planes y la misma lista de la compra.'}
        </Text>
        <View style={{ height: spacing.sm }} />
        <AppButton
          title={sync ? 'Ver la sincronización' : 'Compartir con mi familia'}
          icon="📱"
          variant="secondary"
          onPress={() => nav.navigate('FamilySync')}
        />
      </Card>

      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryBig: { fontSize: font.size.xl, fontWeight: font.weight.heavy, color: colors.primary, textAlign: 'center' },
  summaryLabel: { fontSize: font.size.xs, color: colors.textMuted, textAlign: 'center' },
  warn: { color: colors.warning },
  warnCard: { backgroundColor: '#FEF3C7', marginTop: spacing.sm },
  warnText: { fontSize: font.size.sm, color: '#92400E', lineHeight: 20 },
  profileCard: { marginBottom: spacing.sm },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { fontSize: 34 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: font.size.md, fontWeight: font.weight.bold, color: colors.text },
  refBadge: { fontSize: font.size.xs, color: colors.textMuted },
  meta: { fontSize: font.size.xs, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 26, color: colors.textFaint },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  toggle: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  toggleOff: { backgroundColor: colors.cardAlt },
  toggleText: { fontSize: font.size.xs, color: colors.primaryDark, fontWeight: font.weight.bold },
  toggleTextOff: { color: colors.textFaint },
  tastesLink: { fontSize: font.size.sm, color: colors.primary, fontWeight: font.weight.bold },
  shareHint: { fontSize: font.size.xs, color: colors.textMuted, lineHeight: 18 },
});
