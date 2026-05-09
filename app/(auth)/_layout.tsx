import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function AuthLayout() {
  const { session, loading, profileLoading, nicknameReady } = useAuth();

  if (loading || profileLoading) return null;
  if (session && nicknameReady) return <Redirect href="/" />;
  if (session && !nicknameReady) return <Redirect href="/pick-nickname" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
