'use client';

import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to?: string; href?: string };
export function Link({ to, href, ...props }: LinkProps) {
  return <NextLink href={to ?? href ?? '/'} {...props} />;
}

export function useNavigate() {
  const router = useRouter();
  return (href: string, options?: { state?: unknown }) => {
    if (options?.state && typeof window !== 'undefined') {
      sessionStorage.setItem(`cars21:navigation:${href.split('?')[0]}`, JSON.stringify(options.state));
    }
    router.push(href);
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  return {
    carId: segments[0] === 'car' ? segments[1] : undefined,
    city: segments[0] === 'buy-cars' && segments.length > 1 ? segments[1] : undefined,
  } as unknown as T;
}

export function useSearchParams() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useNextSearchParams();
  const setSearchParams = useCallback((next: URLSearchParams | Record<string, string>) => {
    const value = next instanceof URLSearchParams ? next.toString() : new URLSearchParams(next).toString();
    router.replace(value ? `${pathname}?${value}` : pathname);
  }, [pathname, router]);
  return [searchParams, setSearchParams] as const;
}

export function useLocation() {
  const pathname = usePathname();
  const [state, setState] = useState<unknown>(null);
  useEffect(() => {
    const key = `cars21:navigation:${pathname}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (stored) {
      try { setState(JSON.parse(stored)); } catch { setState(null); }
    } else {
      setState(null);
    }
  }, [pathname]);
  return { pathname, state };
}


