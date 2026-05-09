import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-4xl mb-2">🍩</Text>
      <Text className="text-2xl font-bold mb-2 text-gray-900">Donuty</Text>
      <Text className="text-gray-500 mb-10 text-sm">{session?.user.email}</Text>

      <TouchableOpacity
        style={{ backgroundColor: '#00ebd7', padding: 16, marginBottom: 12, width: '100%', alignItems: 'center' }}
        onPress={() => router.push('/game' as never)}
      >
        <Text style={{ fontFamily: 'SpaceGrotesk_700Bold', fontSize: 16, color: '#13121c', letterSpacing: 0.5 }}>
          Quick Match ▶
        </Text>
      </TouchableOpacity>

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
