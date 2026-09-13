import { UserProfile } from '../types';

export function validProfile(data: UserProfile | undefined): boolean {
  return data?.active === true && ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'].includes(data.role);
}
