import { useState, useEffect, useCallback } from 'react';
import { clientService, type ClientWithCreatedAt } from '../../modules/clients/services/client.service';

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedClients: ClientWithCreatedAt[] | null = null;
let cacheTimestamp = 0;
let inflight: Promise<ClientWithCreatedAt[]> | null = null;
let subscribers: Array<() => void> = [];

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

function isCacheValid(): boolean {
  return cachedClients !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

async function fetchClients(): Promise<ClientWithCreatedAt[]> {
  if (inflight) return inflight;
  inflight = clientService.list().then((list) => {
    cachedClients = Array.isArray(list) ? list : [];
    cacheTimestamp = Date.now();
    inflight = null;
    notifySubscribers();
    return cachedClients;
  }).catch((err) => {
    inflight = null;
    throw err;
  });
  return inflight;
}

export async function getCachedClients(): Promise<ClientWithCreatedAt[]> {
  if (isCacheValid()) return cachedClients!;
  return fetchClients();
}

export function invalidateClientsCache() {
  cachedClients = null;
  cacheTimestamp = 0;
}

export function useClients() {
  const [clients, setClients] = useState<ClientWithCreatedAt[]>(cachedClients ?? []);
  const [loading, setLoading] = useState(!isCacheValid());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isCacheValid()) {
      setClients(cachedClients!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClients();
      setClients(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => {
      if (cachedClients) setClients(cachedClients);
    };
    subscribers.push(onUpdate);
    return () => {
      subscribers = subscribers.filter((fn) => fn !== onUpdate);
    };
  }, [load]);

  const refetch = useCallback(async () => {
    invalidateClientsCache();
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClients();
      setClients(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  return { clients, loading, error, refetch };
}
