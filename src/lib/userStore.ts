import { users as mockUsers } from '../data/mock';
import type { User } from '../types';

export const APP_USERS_STORAGE_KEY = 'linwe_users';

export function readStoredUsers() {
  if (typeof window === 'undefined') return mockUsers;

  const raw = window.localStorage.getItem(APP_USERS_STORAGE_KEY);
  if (!raw) return mockUsers;

  try {
    const parsed = JSON.parse(raw) as User[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockUsers;
  } catch {
    return mockUsers;
  }
}

export function writeStoredUsers(users: User[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(APP_USERS_STORAGE_KEY, JSON.stringify(users));
}

export function formatUserName(user: Pick<User, 'firstName' | 'lastName' | 'name'>) {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.name;
}
