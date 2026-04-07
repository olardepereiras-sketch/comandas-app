import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface AdBannerProps {
  adSlot: string;
}

export default function AdBanner({ adSlot: _ }: AdBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>📺 Anuncio</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 120,
    backgroundColor: "#1e1200",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3d2500",
  },
  text: {
    color: "#7a6030",
    fontSize: 16,
  },
});
