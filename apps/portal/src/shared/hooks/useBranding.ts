import { useState, useEffect } from 'react';
import apiRequest from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export interface Branding {
  report_logo_url: string | null;
  report_brand_name: string | null;
}

let cachedBranding: Branding | null = null;
let cacheKey: string | null = null;

export function useBranding(): Branding | null {
  const { tenantId } = useAuth();
  const [branding, setBranding] = useState<Branding | null>(
    cacheKey === tenantId ? cachedBranding : null
  );

  useEffect(() => {
    if (!tenantId) return;
    if (cacheKey === tenantId && cachedBranding) {
      setBranding(cachedBranding);
      return;
    }

    let cancelled = false;
    apiRequest<{ data: { branding: Branding } }>(`/api/v1/companies/${tenantId}/branding`)
      .then((res) => {
        if (cancelled) return;
        cachedBranding = res.data.branding;
        cacheKey = tenantId;
        setBranding(res.data.branding);
      })
      .catch(() => {
        /* fallback: use defaults */
      });
    return () => { cancelled = true; };
  }, [tenantId]);

  return branding;
}

export function invalidateBrandingCache() {
  cachedBranding = null;
  cacheKey = null;
}
