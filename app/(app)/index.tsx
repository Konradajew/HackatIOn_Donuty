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
        className="bg-pink-500 rounded-xl px-8 py-4 mb-4"
        onPress={() => router.push('/forum' as never)}
      >
        <Text className="text-white font-semibold">Forum</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-red-500 rounded-xl px-8 py-4"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-white font-semibold">Wyloguj się</Text>
      </TouchableOpacity>
    </View>
  );
}
