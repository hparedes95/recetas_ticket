import React, { useState } from 'react';
import { Linking, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen, Title, Subtitle, Card, AppButton, SectionTitle } from '../components/ui';
import { colors, spacing, font, radius } from '../theme';
import { useApp } from '../context/AppContext';
import { generateFamilyCode, normalizeFamilyCode } from '../engine/sync';
import { confirmAction, notify } from '../utils/dialog';

/**
 * Pantalla "Compartir con mi familia": conecta este móvil con los de la familia
 * usando una base de datos gratuita de Firebase y un código de familia.
 */
export default function FamilySyncScreen() {
  const { sync, syncStatus, syncError, lastSyncAt, enableSync, disableSync, syncNow } = useApp();
  const [dbUrl, setDbUrl] = useState(sync?.databaseUrl ?? '');
  const [code, setCode] = useState(sync?.familyCode ?? '');
  const [busy, setBusy] = useState(false);

  const connect = async (familyCode: string) => {
    const url = dbUrl.trim();
    if (!url) {
      notify('Falta la dirección', 'Pega la URL de tu base de datos de Firebase.');
      return;
    }
    setBusy(true);
    try {
      await enableSync({ databaseUrl: url, familyCode: normalizeFamilyCode(familyCode) });
      setCode(normalizeFamilyCode(familyCode));
      notify('¡Conectado!', 'Este móvil ya comparte los datos con tu familia.');
    } catch (e) {
      notify('No se pudo conectar', e instanceof Error ? e.message : 'Revisa la dirección y el código.');
    } finally {
      setBusy(false);
    }
  };

  const createFamily = () => connect(generateFamilyCode());

  const shareCode = async () => {
    if (!sync) return;
    try {
      await Share.share({
        message:
          `Únete a nuestra familia en Recetas del Ticket 🍳\n\n` +
          `1. Abre: https://hparedes95.github.io/recetas_ticket/\n` +
          `2. Ajustes → Compartir con mi familia\n` +
          `3. Base de datos: ${sync.databaseUrl}\n` +
          `4. Código: ${sync.familyCode}`,
      });
    } catch {
      // el usuario canceló
    }
  };

  const confirmDisconnect = () =>
    confirmAction({
      title: 'Dejar de compartir',
      message: 'Este móvil dejará de sincronizarse. Tus datos se quedan aquí.',
      confirmText: 'Desconectar',
      destructive: true,
      onConfirm: disableSync,
    });

  const statusText =
    syncStatus === 'ok'
      ? `✅ Sincronizado${lastSyncAt ? ` · ${new Date(lastSyncAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ''}`
      : syncStatus === 'syncing'
        ? '🔄 Sincronizando…'
        : syncStatus === 'error'
          ? `⚠️ ${syncError ?? 'Error'}`
          : 'Sin conectar';

  return (
    <Screen scroll>
      <Title>Compartir con mi familia</Title>
      <Subtitle>
        Conecta varios móviles para ver los mismos planes, la misma despensa y la misma lista de la
        compra. Es gratis y usa tu propia base de datos de Firebase.
      </Subtitle>

      {sync ? (
        <>
          <View style={{ height: spacing.lg }} />
          <Card style={styles.connected}>
            <Text style={styles.status}>{statusText}</Text>
            <Text style={styles.codeLabel}>Código de familia</Text>
            <Text style={styles.code}>{sync.familyCode}</Text>
            <Text style={styles.hint}>
              Quien tenga este código y la dirección puede ver y editar los datos de la familia.
            </Text>
          </Card>

          <View style={{ height: spacing.md }} />
          <AppButton title="Invitar a alguien" icon="📤" onPress={shareCode} />
          <View style={{ height: spacing.sm }} />
          <AppButton
            title="Sincronizar ahora"
            icon="🔄"
            variant="secondary"
            onPress={() => void syncNow()}
          />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Dejar de compartir" icon="🔌" variant="ghost" onPress={confirmDisconnect} />
        </>
      ) : (
        <>
          <SectionTitle>1. Tu base de datos (una sola vez)</SectionTitle>
          <Card>
            <Text style={styles.hint}>
              Crea un proyecto gratis en Firebase, activa <Text style={styles.b}>Realtime
              Database</Text> y pega aquí su dirección.
            </Text>
            <View style={{ height: spacing.sm }} />
            <TextInput
              style={styles.input}
              placeholder="https://tu-proyecto.firebaseio.com"
              placeholderTextColor={colors.textFaint}
              value={dbUrl}
              onChangeText={setDbUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://console.firebase.google.com/')}
            >
              Abrir la consola de Firebase →
            </Text>
          </Card>

          <SectionTitle>2. Crear o unirse</SectionTitle>
          <Card>
            <Text style={styles.hint}>
              Si eres el primero, crea la familia. Si alguien ya la creó, pide su código.
            </Text>
            <View style={{ height: spacing.md }} />
            <AppButton
              title={busy ? 'Conectando…' : 'Crear familia'}
              icon="👨‍👩‍👧"
              onPress={createFamily}
            />
            <View style={{ height: spacing.lg }} />
            <Text style={styles.codeLabel}>…o unirse con un código</Text>
            <TextInput
              style={styles.input}
              placeholder="ABCD-EFGH-IJKL-MNOP"
              placeholderTextColor={colors.textFaint}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={{ height: spacing.sm }} />
            <AppButton
              title={busy ? 'Conectando…' : 'Unirme a la familia'}
              icon="🔗"
              variant="secondary"
              onPress={() => connect(code)}
            />
          </Card>

          {syncStatus === 'error' && syncError ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>⚠️ {syncError}</Text>
            </Card>
          ) : null}
        </>
      )}

      <View style={{ height: spacing.xl }} />
      <Card style={{ backgroundColor: colors.cardAlt }}>
        <Text style={styles.hint}>
          🔒 Los datos viajan a tu propia base de datos de Firebase, no a un servidor nuestro.
          Cualquiera con el código puede verlos, así que compártelo solo con tu familia.
        </Text>
      </Card>
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  connected: { backgroundColor: colors.primarySoft },
  status: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.primaryDark },
  codeLabel: {
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  code: {
    fontSize: font.size.lg,
    fontWeight: font.weight.heavy,
    color: colors.text,
    letterSpacing: 1.5,
  },
  hint: { fontSize: font.size.xs, color: colors.textMuted, lineHeight: 18 },
  b: { fontWeight: font.weight.bold, color: colors.text },
  input: {
    height: 48,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: font.size.sm,
    color: colors.text,
  },
  link: {
    fontSize: font.size.sm,
    color: colors.primary,
    fontWeight: font.weight.semibold,
    marginTop: spacing.md,
  },
  errorCard: { backgroundColor: '#FEE2E2', marginTop: spacing.md },
  errorText: { fontSize: font.size.sm, color: '#991B1B' },
});
