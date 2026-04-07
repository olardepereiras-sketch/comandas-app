import React, { useCallback, useEffect, useRef } from "react";

interface AdBannerProps {
  adSlot: string;
}

export default function AdBanner({ adSlot }: AdBannerProps) {
  const pushed = useRef(false);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      if (!document.querySelector("script[data-adsense-loaded]")) {
        const script = document.createElement("script");
        script.async = true;
        script.src =
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8693677605569388";
        script.crossOrigin = "anonymous";
        script.setAttribute("data-adsense-loaded", "true");
        document.head.appendChild(script);
        console.log("[AdBanner] AdSense script injected");
      }

      if (!node.querySelector("ins")) {
        const ins = document.createElement("ins");
        ins.className = "adsbygoogle";
        ins.setAttribute("data-ad-client", "ca-pub-8693677605569388");
        ins.setAttribute("data-ad-slot", adSlot);
        ins.style.display = "inline-block";
        ins.style.width = "100%";
        ins.style.height = "90px";
        ins.style.maxHeight = "90px";
        node.appendChild(ins);
        console.log("[AdBanner] ins element appended, slot:", adSlot);
      }

      if (!pushed.current) {
        pushed.current = true;
        setTimeout(() => {
          try {
            ((window as any).adsbygoogle =
              (window as any).adsbygoogle || []).push({});
            console.log("[AdBanner] Ad pushed successfully");
          } catch (e) {
            console.log("[AdBanner] Ad push error:", e);
          }
        }, 200);
      }
    },
    [adSlot]
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 90,
        maxHeight: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "#f9f9f9",
      }}
    />
  );
}
