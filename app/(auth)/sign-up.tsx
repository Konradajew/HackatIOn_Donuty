import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Błąd rejestracji', error.message);
    else Alert.alert('Sukces!', 'Sprawdź email, aby potwierdzić konto.');
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-3xl font-bold mb-8 text-center text-gray-900">Rejestracja</Text>

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
        placeholder="Hasło (min. 6 znaków)"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className="bg-blue-600 rounded-xl p-4 items-center mb-4 disabled:opacity-50"
        onPress={signUp}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Rejestrowanie…' : 'Zarejestruj się'}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-in" className="text-center text-blue-600 text-sm">
        Masz już konto? Zaloguj się
      </Link>
    </View>
  );
}
