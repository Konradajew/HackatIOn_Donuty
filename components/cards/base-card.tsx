import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SvgProps } from "react-native-svg";

interface BaseCardProps {
  type: string; // np. DMG, HEAL
  topValue: string; // np. 4, 13
  centerIcon: React.ComponentType<SvgProps>; // SVG component
  category: string; // np. MATH, CHEM
  mainColor: string; // Kolor neonu
}

export const BaseCard: React.FC<BaseCardProps> = ({
  type,
  topValue,
  centerIcon: CenterIcon,
  category,
  mainColor,
}) => {
  return (
    <View style={[styles.cardContainer]}>
      {/* Górny pasek */}
      <View style={[styles.header, { backgroundColor: mainColor }]}>
        <Text style={styles.headerText}>{type}</Text>
        <Text style={styles.headerText}>{topValue}</Text>
      </View>

      {/* Środek karty (tu można wstawić SVG dla pasków) */}
      <View style={styles.centerBox}>
        <View style={{ width: 60, height: 60 }}>
          <CenterIcon width="100%" height="100%" />
        </View>
      </View>

      {/* Dolny tekst */}
      <View style={styles.footer}>
        <Text style={styles.categoryText}>{category}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 140,
    height: 200,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "#12121A", // Ciemne tło kart
    padding: 6,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  headerText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  centerBox: {
    flex: 1,
    borderWidth: 1,
    marginVertical: 8,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    // backgroundColor ma dodane '20' na końcu hexu dla przezroczystości (opacity 12%)
  },
  centerLetter: {
    fontSize: 48,
    fontWeight: "900",
  },
  footer: {
    alignItems: "center",
    marginBottom: 4,
  },
  categoryText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
  pointsText: {
    color: "#888",
    fontSize: 10,
    marginTop: 2,
  },
});
