import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { CompanyRepository } from '../companies/company.repository';
import { UserRepository } from '../users/user.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { LoginSchema, RegisterSchema, RefreshTokenSchema, LogoutSchema } from '@shared/core';
import { errorHandler, AppError } from '../../shared/utils/error-handler';

const authRoutes = new Hono();

// Instanciar services
const authRepo = new AuthRepository();
const companyRepo = new CompanyRepository();
const userRepo = new UserRepository();
const authService = new AuthService(authRepo, companyRepo, userRepo);

/**
 * POST /auth/register
 * Registrar empresa e primeiro usuário
 */
authRoutes.post(
  '/register',
  zValidator('json', RegisterSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const result = await authService.register(data);

      return c.json(
        {
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
              company_id: result.user.company_id,
            },
            company: result.company,
            tokens: result.tokens,
          },
        },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /auth/login
 * Login de usuário
 */
authRoutes.post(
  '/login',
  zValidator('json', LoginSchema),
  async (c) => {
    try {
      const { email, password } = c.req.valid('json');
      
      // Tentar identificar tenant do header (opcional no login)
      const companyId = c.req.header('X-Tenant-ID');
      
      const result = await authService.login(email, password, companyId);

      return c.json({
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            company_id: result.user.company_id,
          },
          tokens: result.tokens,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return c.json(
          {
            error: {
              message: 'Invalid email or password',
              code: 'INVALID_CREDENTIALS',
            },
          },
          401
        );
      }
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /auth/refresh
 * Renovar access token
 */
authRoutes.post(
  '/refresh',
  zValidator('json', RefreshTokenSchema),
  async (c) => {
    try {
      const { token } = c.req.valid('json');
      const result = await authService.refreshToken(token);

      return c.json({
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid refresh token')) {
        return c.json(
          {
            error: {
              message: 'Invalid or expired refresh token',
              code: 'INVALID_REFRESH_TOKEN',
            },
          },
          401
        );
      }
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /auth/logout
 * Logout - invalidar refresh token
 */
authRoutes.post(
  '/logout',
  authMiddleware,
  zValidator('json', LogoutSchema),
  async (c) => {
    try {
      const { token } = c.req.valid('json');
      await authService.logout(token);

      return c.json({
        data: {
          success: true,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /auth/me
 * Obter dados do usuário atual
 */
authRoutes.get(
  '/me',
  authMiddleware,
  async (c) => {
    try {
      const user = c.get('user');

      return c.json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            company_id: user.company_id,
          },
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { authRoutes };
