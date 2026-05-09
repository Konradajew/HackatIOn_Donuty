import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { QuestionsProvider } from '@/lib/forum-store';

export default function AppLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <QuestionsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </QuestionsProvider>
  );
}
