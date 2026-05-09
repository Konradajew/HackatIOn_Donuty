import { FiftyFiftyCard } from "@/components/cards/50-50-card";
import { DmgCard } from "@/components/cards/dmg-card";
import { HealCard } from "@/components/cards/heal-card";
import { HideAnsCard } from "@/components/cards/hide-ans-card";
import { PoisonCard } from "@/components/cards/poison-card";
import { TimeCard } from "@/components/cards/time-card";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Home() {
  const { session } = useAuth();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        paddingVertical: 40,
      }}
      className="bg-white px-6"
    >
      <Text className="text-4xl mb-2">🍩</Text>
      <Text className="text-2xl font-bold mb-2 text-gray-900">Donuty</Text>
      <Text className="text-gray-500 mb-6 text-sm">{session?.user.email}</Text>

      <View className="flex-row flex-wrap justify-center gap-4 mb-10">
        <DmgCard />
        <HealCard />
        <FiftyFiftyCard />
        <HideAnsCard />
        <TimeCard />
        <PoisonCard />
      </View>

      <TouchableOpacity
        className="bg-red-500 rounded-xl px-8 py-4 mb-10"
        onPress={() => supabase.auth.signOut()}
      >
        <Text className="text-white font-semibold">Wyloguj się</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
