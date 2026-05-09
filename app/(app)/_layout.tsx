import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { QuestionsProvider } from '@/lib/forum-store';

export default function AppLayout() {
  const { session, loading, profileLoading, nicknameReady } = useAuth();

  if (loading || profileLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!nicknameReady) return <Redirect href="/pick-nickname" />;

  return (
    <QuestionsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </QuestionsProvider>
  );
}
