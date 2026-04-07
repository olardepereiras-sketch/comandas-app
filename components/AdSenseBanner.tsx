import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform, Text } from "react-native";

interface AdSenseBannerProps {
  adSlot?: string;
  adFormat?: "auto" | "rectangle" | "horizontal" | "vertical";
  style?: object;
  fullWidth?: boolean;
}

const PUBLISHER_ID = "pub-2231363242374724";

export default function AdSenseBanner({
  adSlot = "auto",
  adFormat = "auto",
  style,
  fullWidth = true,
}: AdSenseBannerProps) {
  const adRef = useRef<any>(null);
  const adPushed = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (adPushed.current) return;

    try {
      const adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
      adPushed.current = true;
      console.log("[AdSense] Ad pushed for slot:", adSlot);
    } catch (err) {
      console.log("[AdSense] Error pushing ad:", err);
    }
  }, [adSlot]);

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackEmoji}>📺</Text>
        <Text style={styles.fallbackText}>Publicidad</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <div
        ref={adRef}
        style={{
          display: "block",
          width: "100%",
          minHeight: 100,
          textAlign: "center" as const,
          overflow: "hidden",
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight: 100,
          }}
          data-ad-client={`ca-${PUBLISHER_ID}`}
          data-ad-slot={adSlot}
          data-ad-format={adFormat}
          data-full-width-responsive={fullWidth ? "true" : "false"}
        />
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 100,
    overflow: "hidden",
    borderRadius: 12,
  },
  fallback: {
    width: "100%",
    minHeight: 100,
    backgroundColor: "#2a1a00",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3d2500",
  },
  fallbackEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 12,
    color: "#7a6030",
    fontWeight: "600" as const,
  },
});
