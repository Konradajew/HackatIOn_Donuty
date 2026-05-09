import { ActivityIndicator, View } from 'react-native';
import { arc } from '@/lib/arcade-theme';

// OAuth deep-link landing page.
// Auth context handles the code exchange and redirect via onAuthStateChange.
// This screen just shows a spinner while the context catches up.
export default function AuthCallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: arc.bg }}>
      <ActivityIndicator size="large" color={arc.secondaryContainer} />
    </View>
  );
}
