-- Migration: 013_fix_password_hash_length
-- Aumentar tamanho do campo password_hash (BCrypt pode gerar hashes maiores que 255 caracteres)

ALTER TABLE users 
  ALTER COLUMN password_hash TYPE VARCHAR(500);
