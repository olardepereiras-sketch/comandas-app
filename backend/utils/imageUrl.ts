const BASE_URL = 'https://quieromesa.com';

export function getAbsoluteImageUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const urlString = String(url).trim();
  
  if (!urlString || urlString === 'null' || urlString === 'undefined') {
    return undefined;
  }

  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    if (urlString.startsWith('http://quieromesa.com')) {
      return urlString.replace('http://quieromesa.com', 'https://quieromesa.com');
    }
    return urlString;
  }

  if (urlString.startsWith('/')) {
    return `${BASE_URL}${urlString}`;
  }

  return `${BASE_URL}/${urlString}`;
}

export function getRestaurantImageUrl(url: string | null | undefined): string {
  const absoluteUrl = getAbsoluteImageUrl(url);
  if (absoluteUrl) {
    return absoluteUrl;
  }
  return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800';
}

export function getLocationImageUrl(url: string | null | undefined): string {
  const absoluteUrl = getAbsoluteImageUrl(url);
  if (absoluteUrl) {
    return absoluteUrl;
  }
  return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800';
}
