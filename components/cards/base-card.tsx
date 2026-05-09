import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { SvgProps } from "react-native-svg";

interface BaseCardProps {
  type: string;
  topValue?: string;
  centerIcon: React.ComponentType<SvgProps>;
  category?: string;
  mainColor: string;
  categoryColor?: string;
  width?: number;
  selected?: boolean;
  style?: ViewStyle;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  type,
  topValue,
  centerIcon: CenterIcon,
  category,
  mainColor,
  categoryColor = mainColor,
  width = 140,
  selected = false,
  style,
}) => {
  const height = Math.round(width * 1.43);
  return (
    <View
      style={[
        styles.cardContainer,
        { width, height, borderColor: mainColor, borderWidth: selected ? 2 : 1 },
        selected && {
          shadowColor: mainColor,
          shadowOpacity: 0.65,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: mainColor,
            justifyContent: topValue ? "space-between" : "center",
          },
        ]}
      >
        <Text style={[styles.headerText, { fontSize: Math.max(7, Math.round(width * 0.085)) }]}>{type}</Text>
        {topValue && <Text style={[styles.headerText, { fontSize: Math.max(7, Math.round(width * 0.085)) }]}>{topValue}</Text>}
      </View>

      <View
        style={[
          styles.centerBox,
          { borderColor: category ? categoryColor : "transparent", borderWidth: category ? 1 : 0 },
        ]}
      >
        <View style={{ width: Math.round(width * 0.55), height: Math.round(width * 0.55) }}>
          <CenterIcon width="100%" height="100%" />
        </View>
      </View>

      <View style={styles.footer}>
        {category && (
          <Text
            style={[styles.categoryText, { fontSize: Math.max(6, Math.round(width * 0.07)) }]}
            numberOfLines={1}
          >
            {category.toUpperCase()}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 6,
    backgroundColor: "#12121A",
    padding: 6,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  headerText: {
    color: "#000",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  centerBox: {
    flex: 1,
    marginVertical: 6,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    minHeight: 14,
  },
  categoryText: {
    color: "#FFF",
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
