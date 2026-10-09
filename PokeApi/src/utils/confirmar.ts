import { Alert, Platform } from 'react-native';

/**
 * Pregunta "¿Seguro?" antes de algo que no se puede deshacer.
 * En el navegador Alert.alert no muestra botones, por eso se usa window.confirm.
 */
export function confirmar(titulo: string, mensaje: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }
  return new Promise((resolver) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Eliminar', style: 'destructive', onPress: () => resolver(true) },
    ], { cancelable: true, onDismiss: () => resolver(false) });
  });
}
