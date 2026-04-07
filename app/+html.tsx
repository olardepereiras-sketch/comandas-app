import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        
        <meta name="theme-color" content="#FF1493" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Quieromesa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="application-name" content="Quieromesa" />
        <meta name="msapplication-TileColor" content="#FF1493" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <meta name="description" content="Reserva tu mesa en los mejores restaurantes. Sistema de reservas online rápido y fácil." />
        <meta name="keywords" content="restaurantes, reservas, mesa, online, gastronomía" />
        
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Quieromesa - Reserva tu mesa" />
        <meta property="og:description" content="Reserva tu mesa en los mejores restaurantes. Sistema de reservas online rápido y fácil." />
        <meta property="og:image" content="https://quieromesa.com/icon-512.png.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/svg+xml" />
        <meta property="og:image:secure_url" content="https://quieromesa.com/icon-512.png.svg" />
        <meta property="og:url" content="https://quieromesa.com/" />
        <meta property="og:site_name" content="Quieromesa" />
        <meta property="og:locale" content="es_ES" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Quieromesa - Reserva tu mesa" />
        <meta name="twitter:description" content="Reserva tu mesa en los mejores restaurantes" />
        <meta name="twitter:image" content="https://quieromesa.com/icon-512.png.svg" />
        
        <meta name="instagram:card" content="summary_large_image" />
        <meta name="instagram:title" content="Quieromesa" />
        
        <meta name="format-detection" content="telephone=no" />
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon-192.png.svg" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png.svg" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png.svg" />
        
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8693677605569388" crossOrigin="anonymous"></script>

        <ScrollViewStyleReset />


        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              box-sizing: border-box;
            }
            html, body, #root {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              overflow: auto;
            }
            body {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #0A1628;
            }
            #root {
              display: flex;
              flex-direction: column;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
            }
            @media (max-width: 768px) {
              html, body {
                overflow-x: hidden;
              }
            }
          `
        }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
