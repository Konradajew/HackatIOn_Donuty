import { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useMatchmaking } from '@/lib/use-matchmaking';
import { arc } from '@/lib/arcade-theme';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();
  const { state, matchId, error, quickMatch, practiceVsBot, cancel } = useMatchmaking();

  useEffect(() => {
    if (state === 'matched' && matchId != null) {
      router.replace({ pathname: '/game', params: { matchId: String(matchId) } } as never);
    }
  }, [state, matchId]);

  const isSearching = state === 'requesting' || state === 'queued';
  const isBotStarting = state === 'bot_starting';

  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-4xl mb-2">🍩</Text>
      <Text className="text-2xl font-bold mb-2 text-gray-900">Donuty</Text>
      <Text className="text-gray-500 mb-10 text-sm">{session?.user.email}</Text>

      {error ? (
        <Text style={{ color: arc.primaryContainer, marginBottom: 8, fontSize: 12 }}>{error}</Text>
      ) : null}

      {isSearching ? (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          <ActivityIndicator color={arc.secondaryContainer} />
          <Text style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, color: arc.secondaryContainer, letterSpacing: 1 }}>
            SZUKAM PRZECIWNIKA...
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: arc.surfaceHigh, padding: 12, width: '100%', alignItems: 'center' }}
            onPress={cancel}
          >
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, color: arc.ink }}>
              Anuluj
            </Text>
          </TouchableOpacity>
        </View>
      ) : isBotStarting ? (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          <ActivityIndicator color={arc.tertiary} />
          <Text style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, color: arc.tertiary, letterSpacing: 1 }}>
            URUCHAMIAM BOTKA...
          </Text>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={{ backgroundColor: arc.secondaryContainer, padding: 16, marginBottom: 12, width: '100%', alignItems: 'center' }}
            onPress={quickMatch}
          >
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#13121c', letterSpacing: 0.5 }}>
              Quick Match ▶
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: arc.secondaryContainer + 'aa', padding: 16, marginBottom: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: arc.secondaryContainer }}
            onPress={practiceVsBot}
          >
            <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#13121c', letterSpacing: 0.5 }}>
              Practice vs Bot 🤖
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        className="bg-pink-500 rounded-xl px-8 py-4 mb-4 w-full items-center"
        onPress={() => router.push('/forum' as never)}
      >
        <Text className="text-white font-semibold">Forum</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-red-500 rounded-xl px-8 py-4 w-full items-center"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-white font-semibold">Wyloguj się</Text>
      </TouchableOpacity>
    </View>
  );
}
