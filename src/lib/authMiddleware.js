// lib/authMiddleware.js
import { NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { prisma } from './prisma';

/**
 * Middleware de autenticação para rotas da API
 * Verifica se o usuário está autenticado através do token JWT
 *
 * @param {Request} request - Objeto de requisição do Next.js
 * @returns {Object|null} - Retorna objeto com user se autenticado, ou null se não autenticado
 */
export async function authenticateRequest(request) {
  try {
    // Extrair token do cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    // Verificar token
    const payload = await verifyToken(token);

    if (!payload) {
      return null;
    }

    let lojaId = payload.lojaId || null;

    // Token antigo sem lojaId: busca no banco para retrocompatibilidade
    if (!lojaId && payload.userId) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { lojaId: true },
        });
        lojaId = dbUser?.lojaId || null;
      } catch {
        // Segue sem lojaId se falhar
      }
    }

    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role || 'ADMIN',
      permissions: payload.permissions || [],
      lojaId,
    };
  } catch (error) {
    console.error('Erro ao autenticar requisição:', error);
    return null;
  }
}

/**
 * Verifica se um usuário tem permissão para acessar um recurso
 * Usa as permissões individuais do usuário (do banco) ou fallback para role
 *
 * @param {Object} user - Objeto do usuário com role e permissions
 * @param {string} resource - Recurso a verificar (ex: 'membros', 'financeiro')
 * @returns {boolean} - true se tem permissão, false caso contrário
 */
export function hasPermission(user, resource) {
  // ADMIN e VENERAVEL tem acesso a tudo
  if (user.role === 'ADMIN' || user.role === 'VENERAVEL') {
    return true;
  }

  // Verificar permissões individuais do usuário
  const permissions = user.permissions || [];

  // Se tem permissões individuais definidas, usar elas
  if (permissions.length > 0) {
    return permissions.includes(resource) || permissions.includes(`${resource}:read`);
  }

  // Fallback para permissões por role (compatibilidade com usuários antigos)
  const ROLE_PERMISSIONS = {
    TESOUREIRO: ['recibo', 'financeiro', 'mensalidades', 'membros:read', 'presencas', 'alertas'],
    SECRETARIO: ['membros', 'atas', 'presencas', 'alertas']
  };

  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(resource) || rolePermissions.includes(`${resource}:read`);
}

/**
 * Helper para retornar resposta de não autorizado
 *
 * @param {string} message - Mensagem de erro opcional
 * @returns {NextResponse} - Resposta HTTP 401
 */
export function unauthorizedResponse(message = 'Não autorizado. Faça login para continuar.') {
  return NextResponse.json(
    { error: message, authenticated: false },
    { status: 401 }
  );
}

/**
 * Helper para retornar resposta de sem permissão
 *
 * @param {string} message - Mensagem de erro opcional
 * @returns {NextResponse} - Resposta HTTP 403
 */
export function forbiddenResponse(message = 'Você não tem permissão para acessar este recurso.') {
  return NextResponse.json(
    { error: message, authenticated: true, forbidden: true },
    { status: 403 }
  );
}

/**
 * Wrapper para proteger rotas da API (apenas autenticação)
 * Uso: export const GET = withAuth(async (request, { user }) => { ... })
 *
 * @param {Function} handler - Handler da rota que será protegido
 * @returns {Function} - Handler protegido com autenticação
 */
export function withAuth(handler) {
  return async (request, context) => {
    // Autenticar a requisição
    const user = await authenticateRequest(request);

    // Se não autenticado, retornar 401
    if (!user) {
      return unauthorizedResponse();
    }

    // Adicionar user ao context para uso no handler
    const enhancedContext = {
      ...context,
      user
    };

    // Executar o handler original com o usuário autenticado
    return handler(request, enhancedContext);
  };
}

/**
 * Wrapper para proteger rotas da API com verificação de permissão
 * Uso: export const GET = withPermission('membros')(async (request, { user }) => { ... })
 *
 * @param {string} resource - Recurso que requer permissão (ex: 'membros', 'financeiro')
 * @returns {Function} - Função que retorna handler protegido
 */
export function withPermission(resource) {
  return function (handler) {
    return async (request, context) => {
      // Autenticar a requisição
      const user = await authenticateRequest(request);

      // Se não autenticado, retornar 401
      if (!user) {
        return unauthorizedResponse();
      }

      // Verificar permissão (agora passa o objeto user completo)
      if (!hasPermission(user, resource)) {
        return forbiddenResponse(`Você não tem permissão para acessar ${resource}.`);
      }

      // Adicionar user ao context para uso no handler
      const enhancedContext = {
        ...context,
        user
      };

      // Executar o handler original com o usuário autenticado e autorizado
      return handler(request, enhancedContext);
    };
  };
}
