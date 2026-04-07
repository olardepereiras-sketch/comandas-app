import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface InstagramImageProps {
  uri: string;
  isInstagram: boolean;
  style?: any;
  alt?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function InstagramImage({ uri, isInstagram, style, alt, onLoad, onError }: InstagramImageProps) {
  const imgRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && isInstagram && imgRef.current) {
      const img = imgRef.current;
      img.onerror = () => {
        console.error('❌ Error cargando imagen:', uri);
        if (onError) onError();
      };
      img.onload = () => {
        console.log('✅ Imagen cargada exitosamente:', alt || uri);
        if (onLoad) onLoad();
      };
    }
  }, [uri, isInstagram, alt, onLoad, onError]);

  if (Platform.OS === 'web' && isInstagram) {
    const cacheBustedUri = `${uri}${uri.includes('?') ? '&' : '?'}v=${Date.now()}`;
    
    return React.createElement('img', {
      ref: imgRef,
      src: cacheBustedUri,
      alt: alt || 'Imagen',
      style: {
        ...StyleSheet.flatten(style),
        display: 'block',
        maxWidth: '100%',
      },
      loading: 'eager',
      decoding: 'sync',
    });
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      priority="high"
      onLoad={onLoad}
      onError={onError}
    />
  );
}
