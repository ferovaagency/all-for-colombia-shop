import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';

const CANONICAL_HOST = 'https://allforall.com.co';

interface CanonicalProps {
  /** Si se omite, usa el path actual */
  path?: string;
}

/**
 * Inyecta <link rel="canonical"> en el head.
 * - Fuerza dominio canónico (sin www, con https)
 * - Elimina trailing slash excepto en raíz
 * - También sincroniza og:url
 */
export function Canonical({ path }: CanonicalProps) {
  const routerState = useRouterState();
  const currentPath = path ?? routerState.location.pathname;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cleanPath = currentPath;
    if (cleanPath !== '/' && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }
    const canonicalUrl = `${CANONICAL_HOST}${cleanPath}`;

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);

    let ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', canonicalUrl);
  }, [currentPath]);

  return null;
}
