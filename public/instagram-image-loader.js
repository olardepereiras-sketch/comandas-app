(function() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const isInstagram = /instagram/i.test(userAgent) || /FBAN|FBAV/i.test(userAgent);
  
  if (isInstagram) {
    console.log('Instagram/Facebook browser detected - applying advanced image fixes');
    
    const style = document.createElement('style');
    style.textContent = `
      img {
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
    `;
    document.head.appendChild(style);
    
    const forceReloadImages = function() {
      const images = document.querySelectorAll('img');
      console.log('Instagram: Processing', images.length, 'images');
      
      images.forEach(img => {
        const originalSrc = img.src;
        if (originalSrc && !originalSrc.includes('blob:')) {
          const preloader = new Image();
          preloader.crossOrigin = 'anonymous';
          
          preloader.onload = function() {
            img.src = '';
            setTimeout(() => {
              const baseUrl = originalSrc.split('?')[0];
              img.src = baseUrl + '?t=' + Date.now() + '&r=' + Math.random().toString(36).substring(7) + '&ig=1';
            }, 50);
          };
          
          preloader.onerror = function() {
            console.warn('Instagram: Failed to preload image', originalSrc);
          };
          
          const baseUrl = originalSrc.split('?')[0];
          preloader.src = baseUrl + '?preload=' + Date.now();
        }
      });
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', forceReloadImages);
    } else {
      forceReloadImages();
    }
    
    setTimeout(forceReloadImages, 500);
    setTimeout(forceReloadImages, 1500);
    setTimeout(forceReloadImages, 3000);
    
    const observer = new MutationObserver(function(mutations) {
      let hasNewImages = false;
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeName === 'IMG' || (node.querySelectorAll && node.querySelectorAll('img').length > 0)) {
            hasNewImages = true;
          }
        });
      });
      
      if (hasNewImages) {
        setTimeout(forceReloadImages, 100);
      }
    });
    
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
})();
