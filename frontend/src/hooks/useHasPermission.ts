import { useAuth } from './useAuth';

export function useHasPermission(module: string, action: string): boolean {
  const { user } = useAuth();
  if (!user?.allowed_modules) return false;
  const actions = user.allowed_modules[module];
  return actions ? actions.includes(action) : false;
}
