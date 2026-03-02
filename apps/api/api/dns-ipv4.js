"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Garante uso de IPv4 antes de qualquer conexão (evita ENETUNREACH com Supabase/Postgres).
 * Deve ser o primeiro import em index.ts.
 */
const node_dns_1 = __importDefault(require("node:dns"));
node_dns_1.default.setDefaultResultOrder('ipv4first');
