import '../global.css';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// Supabase SDK console.errors "Invalid Refresh Token" when AsyncStorage holds a
// stale session — the SDK handles cleanup correctly (fires SIGNED_OUT) so this
// is cosmetic noise. Suppress it here; LogBox is a no-op in production builds.
LogBox.ignoreLogs([/Invalid Refresh Token/]);
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
    SpaceGrotesk_400Regular, SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium, JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider } from '@/lib/auth-context';
import {SafeAreaProvider, SafeAreaView} from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        SpaceGrotesk_400Regular,
        SpaceGrotesk_500Medium,
        SpaceGrotesk_600SemiBold,
        SpaceGrotesk_700Bold,
        JetBrainsMono_400Regular,
        JetBrainsMono_500Medium,
        JetBrainsMono_700Bold,
    });


    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) return null;



    return (
      <SafeAreaProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="light" backgroundColor="13121c" />
        </AuthProvider>
      </SafeAreaProvider>
  );
}
