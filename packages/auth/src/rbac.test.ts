import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, getSessionAndRole } from './rbac';
import { createClient } from './server';

// Mock dependencies
vi.mock('./server', () => ({
  createClient: vi.fn(),
}));

vi.mock('server-only', () => ({}));

describe('RBAC Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSessionAndRole', () => {
    it('should extract role strictly from app_metadata and ignore user_metadata', async () => {
      // Simulate a privilege escalation attempt where the user tries to set their
      // role to admin via user_metadata, but the secure app_metadata remains 'member'.
      const mockUser = {
        id: '123',
        app_metadata: { role: 'member' },
        user_metadata: { role: 'admin' }, // Malicious injection
      };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as any);

      const result = await getSessionAndRole();
      expect(result.role).toBe('member');
      expect(result.role).not.toBe('admin');
    });

    it('should return member role as default if app_metadata is missing role', async () => {
       const mockUser = {
        id: '123',
        app_metadata: { },
      };

      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as any);

      const result = await getSessionAndRole();
      expect(result.role).toBe('member');
    });
  });

  describe('requireRole', () => {
    it('should throw UNAUTHORIZED if no user session exists', async () => {
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') }),
        },
      } as any);

      await expect(requireRole(['admin'])).rejects.toThrow('UNAUTHORIZED: Valid session required.');
    });

    it('should throw FORBIDDEN if user role is not in allowedRoles', async () => {
      const mockUser = { id: '1', app_metadata: { role: 'member' } };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as any);

      await expect(requireRole(['admin', 'editor'])).rejects.toThrow('FORBIDDEN: Requires one of [admin, editor].');
    });

    it('should return user and role if user has an allowed role', async () => {
      const mockUser = { id: '1', app_metadata: { role: 'admin' } };
      vi.mocked(createClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      } as any);

      const result = await requireRole(['admin', 'editor']);
      expect(result).toEqual({ user: mockUser, role: 'admin' });
    });
  });
});
