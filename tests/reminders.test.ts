import { expect, it, vi } from 'vitest';
vi.mock('../src/firebase/firebase', () => ({ db: {} }));
import { processPendingReminders, sendManualNotificationTest } from '../src/services/reminderService';
import { Appointment } from '../src/types';
it('does not claim delivery without a configured mail service', async () => {
  await expect(processPendingReminders([])).rejects.toThrow('ยังไม่ได้เชื่อมต่อ');
  await expect(sendManualNotificationTest({} as Appointment)).rejects.toThrow('ยังไม่ได้เชื่อมต่อ');
});
