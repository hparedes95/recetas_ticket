import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, font, radius } from '../theme';
import { confirmAction } from '../utils/dialog';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Captura errores de render para que un fallo no deje la app en blanco. Muestra
 * un mensaje amable en español y permite recargar (en web) o reintentar.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn('Error capturado por ErrorBoundary:', error?.message);
  }

  handleRetry = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ error: null });
    }
  };

  /** Salida de emergencia si los datos guardados dejan la app inservible. */
  handleReset = () => {
    confirmAction({
      title: 'Empezar de cero',
      message:
        'Se borrarán los datos de ESTE móvil (despensa, planes y gustos). Si compartes ' +
        'con tu familia, se recuperan al volver a conectar con el código.',
      confirmText: 'Borrar y empezar',
      destructive: true,
      onConfirm: () => {
        void AsyncStorage.clear().finally(this.handleRetry);
      },
    });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.emoji}>🍳</Text>
          <Text style={styles.title}>Vaya, algo se ha atascado</Text>
          <Text style={styles.subtitle}>
            Ha ocurrido un error inesperado. Puedes reintentar; tus datos siguen guardados.
          </Text>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>

          {/* El detalle técnico se muestra a propósito: sin él, un fallo en el
              móvil es imposible de diagnosticar. */}
          <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailInner}>
            <Text style={styles.detailText} selectable>
              {error.message || String(error)}
              {error.stack ? `\n\n${error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
            </Text>
          </ScrollView>

          <Pressable style={styles.reset} onPress={this.handleReset}>
            <Text style={styles.resetText}>Sigue fallando: empezar de cero</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: { fontSize: font.size.lg, fontWeight: font.weight.bold, color: colors.text, textAlign: 'center' },
  subtitle: {
    fontSize: font.size.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  buttonText: { color: colors.white, fontWeight: font.weight.bold, fontSize: font.size.md },
  detailBox: {
    maxHeight: 160,
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
  },
  detailInner: { padding: spacing.md },
  detailText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  reset: { marginTop: spacing.lg, padding: spacing.sm },
  resetText: { fontSize: font.size.sm, color: colors.textMuted, textDecorationLine: 'underline' },
});
