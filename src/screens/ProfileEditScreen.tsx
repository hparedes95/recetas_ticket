import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen, Title, Card, AppButton, Chip, SectionTitle } from '../components/ui';
import { colors, spacing, font, dietTagMeta } from '../theme';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/types';
import { AgeGroup, DietTag } from '../types';
import { TargetPicker } from '../components/TargetPicker';
import { confirmAction } from '../utils/dialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'ProfileEdit'>;

const TAGS = Object.keys(dietTagMeta) as DietTag[];
const AGES: { key: AgeGroup; label: string; emoji: string }[] = [
  { key: 'adulto', label: 'Adulto', emoji: '🧑' },
  { key: 'adolescente', label: 'Adolescente', emoji: '🧒' },
  { key: 'nino', label: 'Niño/a', emoji: '👶' },
];
const EMOJIS = ['🙂', '👩', '🧑', '👨', '👧', '🧒', '👶', '👵', '👴', '🐶'];

/** Ficha de un miembro de la familia. */
export default function ProfileEditScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { profiles, updateProfile, removeProfile, setReferenceProfile } = useApp();
  const profile = profiles.find((p) => p.id === route.params.profileId);

  if (!profile) {
    return (
      <Screen>
        <Title>Persona no encontrada</Title>
      </Screen>
    );
  }

  const toggleTag = (t: DietTag) => {
    const next = profile.restrictions.includes(t)
      ? profile.restrictions.filter((x) => x !== t)
      : [...profile.restrictions, t];
    updateProfile(profile.id, { restrictions: next });
  };

  const confirmDelete = () =>
    confirmAction({
      title: `Quitar a ${profile.name}`,
      message: '¿Seguro que quieres quitar a esta persona de la familia?',
      confirmText: 'Quitar',
      destructive: true,
      onConfirm: () => {
        removeProfile(profile.id);
        nav.goBack();
      },
    });

  return (
    <Screen scroll>
      <Title>{profile.emoji} {profile.name}</Title>

      <SectionTitle>Nombre</SectionTitle>
      <TextInput
        style={styles.input}
        value={profile.name}
        onChangeText={(t) => updateProfile(profile.id, { name: t })}
        placeholder="Nombre"
        placeholderTextColor={colors.textFaint}
      />

      <SectionTitle>Avatar</SectionTitle>
      <View style={styles.wrap}>
        {EMOJIS.map((e) => (
          <Chip
            key={e}
            label={e}
            selected={profile.emoji === e}
            onPress={() => updateProfile(profile.id, { emoji: e })}
          />
        ))}
      </View>

      <SectionTitle>Edad</SectionTitle>
      <View style={styles.wrap}>
        {AGES.map((a) => (
          <Chip
            key={a.key}
            label={a.label}
            emoji={a.emoji}
            selected={profile.ageGroup === a.key}
            onPress={() => updateProfile(profile.id, { ageGroup: a.key })}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Determina el tamaño de su ración y sus calorías por defecto.
      </Text>

      <SectionTitle>Sus gustos</SectionTitle>
      <Card>
        <Text style={styles.hint}>
          ❤️ {profile.likes.length} favoritos · 🚫 {profile.dislikes.length} descartados
        </Text>
        <View style={{ height: spacing.sm }} />
        <AppButton
          title="Elegir lo que le gusta y lo que no"
          icon="🍽️"
          variant="secondary"
          onPress={() => nav.navigate('Tastes', { profileId: profile.id })}
        />
      </Card>

      <SectionTitle>Restricciones</SectionTitle>
      <View style={styles.wrap}>
        {TAGS.map((t) => (
          <Chip
            key={t}
            label={dietTagMeta[t].label}
            emoji={dietTagMeta[t].emoji}
            selected={profile.restrictions.includes(t)}
            onPress={() => toggleTag(t)}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Las restricciones se aplican a TODO el menú familiar, por seguridad.
      </Text>

      <SectionTitle>Calorías y macros</SectionTitle>
      <Card>
        <TargetPicker
          calorieTarget={profile.calorieTarget}
          macroSplit={profile.macroSplit}
          onChange={(next) => updateProfile(profile.id, next)}
        />
      </Card>

      <View style={{ height: spacing.lg }} />
      {!profile.isReference ? (
        <AppButton
          title="Ajustar el menú a sus calorías"
          icon="⭐"
          variant="secondary"
          onPress={() => setReferenceProfile(profile.id)}
        />
      ) : (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <Text style={styles.refText}>
            ⭐ El menú se ajusta a las calorías de {profile.name}. El resto recibe su ración
            proporcional.
          </Text>
        </Card>
      )}

      {profiles.length > 1 ? (
        <>
          <View style={{ height: spacing.xl }} />
          <AppButton title="Quitar de la familia" icon="🗑️" variant="ghost" onPress={confirmDelete} />
        </>
      ) : null}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: font.size.md,
    color: colors.text,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { fontSize: font.size.xs, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  refText: { fontSize: font.size.sm, color: colors.primaryDark, lineHeight: 20 },
});
