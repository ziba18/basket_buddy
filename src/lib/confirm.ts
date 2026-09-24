import { Alert, Platform } from 'react-native';

// Alert.alert is a silent no-op on react-native-web, so a destructive
// button guarded by it would do nothing at all there — fall back to the
// browser's own confirm dialog on web.
export function confirmDestructive(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
