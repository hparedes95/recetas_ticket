// Diálogos multiplataforma.
// `Alert` de React Native NO funciona en web (react-native-web lo ignora), así
// que en web usamos window.confirm/alert y en iOS/Android el Alert nativo.
import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/** Confirmación con acción destructiva/aceptar. Ejecuta onConfirm si el usuario acepta. */
export function confirmAction(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}): void {
  const {
    title,
    message = '',
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    destructive,
    onConfirm,
    onCancel,
  } = opts;

  if (isWeb) {
    const ok = typeof window !== 'undefined' && window.confirm(message ? `${title}\n\n${message}` : title);
    if (ok) onConfirm();
    else onCancel?.();
    return;
  }

  Alert.alert(title, message || undefined, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Aviso informativo. En web muestra window.alert; onOk se ejecuta al cerrar. */
export function notify(title: string, message?: string, onOk?: () => void): void {
  if (isWeb) {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    onOk?.();
    return;
  }
  Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
}
