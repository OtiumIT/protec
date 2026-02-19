/**
 * Garante uso de IPv4 antes de qualquer conexão (evita ENETUNREACH com Supabase/Postgres).
 * Deve ser o primeiro import em index.ts.
 */
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
