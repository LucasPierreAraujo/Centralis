// lib/auth.js
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Valida que JWT_SECRET existe e tem tamanho adequado
if (!process.env.JWT_SECRET) {
  throw new Error(
    '❌ ERRO CRÍTICO: JWT_SECRET não definido! ' +
    'Configure a variável de ambiente JWT_SECRET no arquivo .env'
  );
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error(
    '❌ ERRO CRÍTICO: JWT_SECRET muito curto! ' +
    'Use no mínimo 32 caracteres para garantir segurança.'
  );
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

// Hash da senha
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Verificar senha
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Criar JWT Token
export async function createToken(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token expira em 7 dias
    .sign(SECRET_KEY);
  
  return token;
}

// Verificar JWT Token
export async function verifyToken(token) {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload;
  } catch (error) {
    return null;
  }
}