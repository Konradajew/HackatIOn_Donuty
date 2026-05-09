import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { arc } from '@/lib/arcade-theme';

export default function AuthCallback() {
  const { session, loading, profileLoading, nicknameReady } = useAuth();

  if (!loading && !profileLoading) {
    if (session && nicknameReady) return <Redirect href="/" />;
    if (session && !nicknameReady) return <Redirect href="/pick-nickname" />;
    return <Redirect href="/sign-in" />;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: arc.bg }}>
      <ActivityIndicator size="large" color={arc.secondaryContainer} />
    </View>
  );
}
