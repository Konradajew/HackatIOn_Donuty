import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
