import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Błąd logowania', error.message);
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold mb-8 text-center text-gray-900">Zaloguj się</Text>

      <TextInput
        className="border border-gray-300 rounded-xl p-4 mb-4 text-base text-gray-900"
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <TextInput
        className="border border-gray-300 rounded-xl p-4 mb-6 text-base text-gray-900"
        placeholder="Hasło"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-blue-600 rounded-xl p-4 items-center mb-4 disabled:opacity-50"
        onPress={signIn}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Logowanie…' : 'Zaloguj się'}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-up" className="text-center text-blue-600 text-sm">
        Nie masz konta? Zarejestruj się
      </Link>
    </View>
  );
}
