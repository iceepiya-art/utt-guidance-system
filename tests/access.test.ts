import { describe, it, expect } from 'vitest';
import { validProfile } from '../src/utils/access';
import { UserProfile } from '../src/types';
describe('organization membership', () => {
  it.each(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'])('accepts active %s', (role) => {
    expect(validProfile({ active: true, role } as UserProfile)).toBe(true);
  });
  it.each([undefined, {}, { role: 'ADMIN' }, { role: 'ADMIN', active: false }, { role: 'OWNER', active: true }, { role: 'ADMIN', active: 'true' }])('rejects missing, disabled, or invalid profiles: %j', (profile) => {
    expect(validProfile(profile as UserProfile)).toBe(false);
  });
});
