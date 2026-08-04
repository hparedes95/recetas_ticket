import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, font, radius } from '../theme';

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

  render() {
    if (this.state.error) {
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
});
