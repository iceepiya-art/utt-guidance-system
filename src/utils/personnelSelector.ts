import { UserProfile, UserRole, TeamId } from '../types';

export interface SelectablePersonnel {
  id: string;
  displayName: string;
  role: UserRole;
  teamId?: TeamId;
  phone?: string;
  email?: string;
  label: string;
  secondaryText?: string;
}

/**
 * System-only account detection:
 * Targets generic system administrator accounts (e.g. "ผู้ดูแลระบบ", "admin@utt.ac.th")
 * while preserving actual human administrators who have real personal names.
 */
export const isSystemOnlyAccount = (user: UserProfile): boolean => {
  const cleanName = (user.displayName || '').trim().toLowerCase();
  const cleanEmail = (user.email || '').trim().toLowerCase();
  return (
    cleanName === 'ผู้ดูแลระบบ' ||
    cleanName === 'system admin' ||
    cleanName === 'admin' ||
    cleanName.includes('ธุรการ') ||
    cleanEmail === 'admin@utt.ac.th'
  );
};

/**
 * Eligibility filter for guidance counseling / field tasks:
 * - Must be active
 * - Must not be a VIEWER (clerical/view-only role)
 * - Must not be a system-only account
 */
export const isEligiblePersonnel = (user: UserProfile): boolean => {
  if (!user.active) return false;
  if (user.role === 'VIEWER') return false;
  if (isSystemOnlyAccount(user)) return false;
  return true;
};

/**
 * Formats role and team description for secondary label
 */
export const formatPersonnelRoleTeam = (role: UserRole, teamId?: TeamId): string => {
  const roleTitle =
    role === 'ADMIN'
      ? 'ผู้ดูแลระบบ'
      : role === 'MANAGER'
      ? 'หัวหน้างานแนะแนว'
      : 'แนะแนว';
  const teamTitle =
    teamId === 'team1'
      ? 'สาย 1 (อุตรดิตถ์)'
      : teamId === 'team2'
      ? 'สาย 2 (สุโขทัย)'
      : '';
  if (roleTitle && teamTitle) {
    return `${roleTitle} • ${teamTitle}`;
  }
  return roleTitle || teamTitle || '';
};

/**
 * Cleans teacher name for fuzzy/duplicate checking
 * - Collapses multiple spaces into single space
 * - Strips Thai honorific titles (อ., อาจารย์, นาย, นาง, นางสาว)
 * - Strips any parentheses and their contents (e.g. "(หัวหน้างานแนะแนว)")
 */
export const cleanTeacherName = (s: string): string => {
  return (s || '')
    .replace(/\s+/g, ' ')
    .replace(/^(อ\.|อาจารย์|นาย|นาง|นางสาว)\s*/, '')
    .replace(/\s*\(.*?\)/g, '')
    .trim()
    .toLowerCase();
};

/**
 * Strips role suffixes from a display name so that roles are not conflated with human identity.
 * e.g. "อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)" -> "อ.ประชา กัลปนารถ"
 */
export const stripRoleSuffix = (name: string): string => {
  return (name || '')
    .replace(/\s*\((หัวหน้างานแนะแนว|แนะแนวสาย\s*[12]|สาย\s*[12]|แนะแนว|เดิม|บันทึกเดิม)\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Central function to extract selectable personnel from Firestore users.
 * - Single Source of Truth: uses `users` list from Firestore.
 * - Filters by eligibility (active, non-viewer, non-system-account).
 * - Deduplicates by stable unique `user.id` and canonical name (ONE PERSON = ONE OPTION).
 * - Formats standard display name (without mutating name with appended roles).
 * - Fallback default list provided ONLY if users collection is empty (e.g. unit test or offline mode).
 */
export const getSelectablePersonnel = (
  users: UserProfile[] = [],
  fallbackDefault = true
): SelectablePersonnel[] => {
  const eligible = users.filter(isEligiblePersonnel);
  const seenIds = new Set<string>();
  const seenCanonicalKeys = new Set<string>();
  const list: SelectablePersonnel[] = [];

  for (const u of eligible) {
    if (!u.id || seenIds.has(u.id)) continue;

    // Standardize whitespace and strip any attached role suffixes in display name
    let cleanName = stripRoleSuffix(u.displayName || '');
    const norm = cleanTeacherName(cleanName);

    // Canonical identity resolution for primary guidance personnel
    let canonicalTargetId: string | null = null;
    if (u.id === 'usr_admin' || norm.includes('ประชา')) {
      canonicalTargetId = 'usr_admin';
      cleanName = TARGET_PERSONNEL_CANONICAL_NAMES['usr_admin'];
    } else if (u.id === 'usr_staff1' || norm.includes('ณิชชัยกุญช์')) {
      canonicalTargetId = 'usr_staff1';
      cleanName = TARGET_PERSONNEL_CANONICAL_NAMES['usr_staff1'];
    } else if (u.id === 'usr_staff2' || norm.includes('ปิยะ')) {
      canonicalTargetId = 'usr_staff2';
      cleanName = TARGET_PERSONNEL_CANONICAL_NAMES['usr_staff2'];
    }

    if (canonicalTargetId) {
      if (seenCanonicalKeys.has(canonicalTargetId)) continue;
      seenCanonicalKeys.add(canonicalTargetId);
    }

    seenIds.add(u.id);

    const meta = formatPersonnelRoleTeam(u.role, u.teamId);

    list.push({
      id: u.id,
      displayName: cleanName,
      role: u.role,
      teamId: u.teamId,
      phone: u.phone,
      email: u.email,
      label: meta ? `${cleanName} — ${meta}` : cleanName,
      secondaryText: meta,
    });
  }

  // Fallback ONLY if no eligible users found in Firestore and fallback is requested
  if (list.length === 0 && fallbackDefault) {
    return [
      {
        id: 'usr_admin',
        displayName: 'อ.ประชา กัลปนารถ',
        role: 'MANAGER',
        teamId: 'team1',
        label: 'อ.ประชา กัลปนารถ — หัวหน้างานแนะแนว • สาย 1 (อุตรดิตถ์)',
        secondaryText: 'หัวหน้างานแนะแนว • สาย 1 (อุตรดิตถ์)',
      },
      {
        id: 'usr_staff1',
        displayName: 'อ.ณิชชัยกุญช์ โลราช',
        role: 'STAFF',
        teamId: 'team1',
        label: 'อ.ณิชชัยกุญช์ โลราช — แนะแนว • สาย 1 (อุตรดิตถ์)',
        secondaryText: 'แนะแนว • สาย 1 (อุตรดิตถ์)',
      },
      {
        id: 'usr_staff2',
        displayName: 'อ.ปิยะ สีตาชัย',
        role: 'STAFF',
        teamId: 'team2',
        label: 'อ.ปิยะ สีตาชัย — แนะแนว • สาย 2 (สุโขทัย)',
        secondaryText: 'แนะแนว • สาย 2 (สุโขทัย)',
      },
    ];
  }

  return list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'th'));
};

/**
 * Known and verified legacy aliases for guidance personnel.
 * Map only when individual identity is confirmed beyond doubt.
 */
export const KNOWN_PERSONNEL_ALIASES: Record<string, string> = {
  // Pracha Kalpanart (usr_admin)
  'ประชา': 'usr_admin',
  'อ.ประชา': 'usr_admin',
  'อาจารย์ประชา': 'usr_admin',
  'อ.ประชา กัลปนารถ': 'usr_admin',
  'อ.ประชา  กัลปนารถ': 'usr_admin',
  'อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)': 'usr_admin',
  'อ.ประชา  กัลปนารถ (หัวหน้างานแนะแนว)': 'usr_admin',
  'อ.ประชา (เดิม)': 'usr_admin',
  'อ.ประชา (บันทึกเดิม)': 'usr_admin',
  'อ.ประชา กัลปนารถ (เดิม)': 'usr_admin',
  'อ.ประชา กัลปนารถ (บันทึกเดิม)': 'usr_admin',

  // Nitchaikun Lorach (usr_staff1)
  'ณิชชัยกุญช์': 'usr_staff1',
  'อ.ณิชชัยกุญช์': 'usr_staff1',
  'อาจารย์ณิชชัยกุญช์': 'usr_staff1',
  'อ.ณิชชัยกุญช์ โลราช': 'usr_staff1',
  'อ.ณิชชัยกุญช์  โลราช': 'usr_staff1',
  'อ.ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)': 'usr_staff1',
  'อ.ณิชชัยกุญช์  โลราช (แนะแนวสาย 1)': 'usr_staff1',
  'อ.ณิชชัยกุญช์ (เดิม)': 'usr_staff1',
  'อ.ณิชชัยกุญช์ (บันทึกเดิม)': 'usr_staff1',
  'อ.ณิชชัยกุญช์ โลราช (เดิม)': 'usr_staff1',
  'อ.ณิชชัยกุญช์ โลราช (บันทึกเดิม)': 'usr_staff1',

  // Piya Sitachai (usr_staff2)
  'ปิยะ': 'usr_staff2',
  'อ.ปิยะ': 'usr_staff2',
  'อาจารย์ปิยะ': 'usr_staff2',
  'อ.ปิยะ สีตาชัย': 'usr_staff2',
  'อ.ปิยะ  สีตาชัย': 'usr_staff2',
  'อ.ปิยะ สีดาชัย': 'usr_staff2',
  'อ.ปิยะ  สีดาชัย': 'usr_staff2',
  'อ.ปิยะ สีตาชัย (แนะแนวสาย 2)': 'usr_staff2',
  'อ.ปิยะ  สีตาชัย (แนะแนวสาย 2)': 'usr_staff2',
  'อ.ปิยะ สีดาชัย (แนะแนวสาย 2)': 'usr_staff2',
  'อ.ปิยะ  สีดาชัย (แนะแนวสาย 2)': 'usr_staff2',
  'อ.ปิยะ (เดิม)': 'usr_staff2',
  'อ.ปิยะ (บันทึกเดิม)': 'usr_staff2',
  'อ.ปิยะ สีตาชัย (เดิม)': 'usr_staff2',
  'อ.ปิยะ สีตาชัย (บันทึกเดิม)': 'usr_staff2',
};

/**
 * Canonical names for verified system personnel to resolve across differing IDs
 */
export const TARGET_PERSONNEL_CANONICAL_NAMES: Record<string, string> = {
  usr_admin: 'อ.ประชา กัลปนารถ',
  usr_staff1: 'อ.ณิชชัยกุญช์ โลราช',
  usr_staff2: 'อ.ปิยะ สีตาชัย',
};

/**
 * Resolves a raw legacy submitter name to clean standard personnel display name if verified.
 * Returns standard displayName if matched, or the trimmed rawName if unknown.
 */
export const resolvePersonnelDisplayName = (
  rawName: string,
  personnelList: SelectablePersonnel[]
): { displayName: string; matched: boolean } => {
  if (!rawName || !rawName.trim()) return { displayName: '', matched: false };
  const trimmed = rawName.trim().replace(/\s+/g, ' ');

  // 1. Direct match with selectable personnel displayName
  const directMatch = personnelList.find(p => p.displayName === trimmed);
  if (directMatch) return { displayName: directMatch.displayName, matched: true };

  // 2. Exact lookup in verified known aliases
  const targetId = KNOWN_PERSONNEL_ALIASES[rawName.trim()] || KNOWN_PERSONNEL_ALIASES[trimmed];
  if (targetId) {
    const p = personnelList.find(item => item.id === targetId) ||
      (TARGET_PERSONNEL_CANONICAL_NAMES[targetId]
        ? personnelList.find(item => cleanTeacherName(item.displayName) === cleanTeacherName(TARGET_PERSONNEL_CANONICAL_NAMES[targetId]))
        : undefined);
    if (p) return { displayName: p.displayName, matched: true };
  }

  // 3. Normalized alias check (collapsing spaces and removing parens)
  const norm = cleanTeacherName(rawName);
  for (const [alias, id] of Object.entries(KNOWN_PERSONNEL_ALIASES)) {
    if (cleanTeacherName(alias) === norm) {
      const p = personnelList.find(item => item.id === id) ||
        (TARGET_PERSONNEL_CANONICAL_NAMES[id]
          ? personnelList.find(item => cleanTeacherName(item.displayName) === cleanTeacherName(TARGET_PERSONNEL_CANONICAL_NAMES[id]))
          : undefined);
      if (p) return { displayName: p.displayName, matched: true };
    }
  }

  return { displayName: trimmed, matched: false };
};

/**
 * Finds a matching personnel by ID or name using verified identities only (no fuzzy match).
 */
export const findMatchingPersonnel = (
  query: string,
  personnelList: SelectablePersonnel[]
): SelectablePersonnel | undefined => {
  if (!query || !query.trim()) return undefined;
  const q = query.trim();

  // 1. Direct match on ID
  const byId = personnelList.find(p => p.id === q);
  if (byId) return byId;

  // 2. Exact match on clean display name
  const cleanQ = q.replace(/\s+/g, ' ');
  const byExactName = personnelList.find(p => p.displayName === cleanQ);
  if (byExactName) return byExactName;

  // 3. Exact lookup in verified known aliases
  const aliasId = KNOWN_PERSONNEL_ALIASES[q] || KNOWN_PERSONNEL_ALIASES[cleanQ];
  if (aliasId) {
    const matched = personnelList.find(p => p.id === aliasId) ||
      (TARGET_PERSONNEL_CANONICAL_NAMES[aliasId]
        ? personnelList.find(p => cleanTeacherName(p.displayName) === cleanTeacherName(TARGET_PERSONNEL_CANONICAL_NAMES[aliasId]))
        : undefined);
    if (matched) return matched;
  }

  // 4. Normalized alias check (exact match on cleanTeacherName against known aliases, stripping parens/honorifics)
  const norm = cleanTeacherName(q);
  if (norm) {
    for (const [alias, id] of Object.entries(KNOWN_PERSONNEL_ALIASES)) {
      if (cleanTeacherName(alias) === norm) {
        const matched = personnelList.find(p => p.id === id) ||
          (TARGET_PERSONNEL_CANONICAL_NAMES[id]
            ? personnelList.find(p => cleanTeacherName(p.displayName) === cleanTeacherName(TARGET_PERSONNEL_CANONICAL_NAMES[id]))
            : undefined);
        if (matched) return matched;
      }
    }

    // 5. Normalized exact clean name match with selectable personnel
    const matchedByCleanName = personnelList.find(p => cleanTeacherName(p.displayName) === norm);
    if (matchedByCleanName) return matchedByCleanName;
  }

  return undefined;
};

/**
 * Resolves an appointment or field trip counselor identity to a verified SelectablePersonnel.
 * If verified: returns { id, name, isLegacyFallback: false, matchedPersonnel }
 * If unverified legacy: returns { id, name, isLegacyFallback: true }
 */
export const resolveResponsibleCounselor = (
  counselorId: string | undefined,
  counselorName: string | undefined,
  personnelList: SelectablePersonnel[]
): {
  id: string;
  name: string;
  isLegacyFallback: boolean;
  matchedPersonnel?: SelectablePersonnel;
} => {
  // 1. If counselorId matches an existing selectable personnel directly
  if (counselorId) {
    const byId = personnelList.find(p => p.id === counselorId);
    if (byId) {
      return { id: byId.id, name: byId.displayName, isLegacyFallback: false, matchedPersonnel: byId };
    }
  }

  // 2. Resolve by counselorName using verified aliases & exact clean name
  if (counselorName && counselorName.trim()) {
    const matched = findMatchingPersonnel(counselorName, personnelList);
    if (matched) {
      return { id: matched.id, name: matched.displayName, isLegacyFallback: false, matchedPersonnel: matched };
    }
  }

  // 3. If counselorId was an alias string (e.g. 'อ.ประชา')
  if (counselorId && counselorId.trim()) {
    const matched = findMatchingPersonnel(counselorId, personnelList);
    if (matched) {
      return { id: matched.id, name: matched.displayName, isLegacyFallback: false, matchedPersonnel: matched };
    }
  }

  // 4. Unknown legacy fallback
  const fallbackName = (counselorName || '').trim();
  const fallbackId = counselorId || (fallbackName ? `legacy_${fallbackName}` : 'legacy_unknown');
  return {
    id: fallbackId,
    name: fallbackName,
    isLegacyFallback: true,
  };
};

/**
 * Returns default submitter names for a team based on selectable personnel:
 * - สาย 1 (อุตรดิตถ์): 2 required submitters (อ.ประชา กัลปนารถ, อ.ณิชชัยกุญช์ โลราช)
 * - สาย 2 (สุโขทัย): 1 required submitter (อ.ปิยะ สีตาชัย)
 */
export const getDefaultSubmitterNames = (
  team: TeamId,
  personnelList: SelectablePersonnel[]
): string[] => {
  if (team === 'team2') {
    const p2 = personnelList.find(p => p.id === 'usr_staff2') ||
               personnelList.find(p => cleanTeacherName(p.displayName).includes('ปิยะ'));
    return [p2?.displayName || 'อ.ปิยะ สีตาชัย'];
  }

  // Team 1: Both Pracha and Nitchaikun
  const pracha = personnelList.find(p => p.id === 'usr_admin') ||
                 personnelList.find(p => cleanTeacherName(p.displayName).includes('ประชา'));
  const nitchaikun = personnelList.find(p => p.id === 'usr_staff1') ||
                     personnelList.find(p => cleanTeacherName(p.displayName).includes('ณิชชัยกุญช์'));

  const names: string[] = [];
  if (pracha) names.push(pracha.displayName);
  else names.push('อ.ประชา กัลปนารถ');

  if (nitchaikun) names.push(nitchaikun.displayName);
  else names.push('อ.ณิชชัยกุญช์ โลราช');

  return names;
};
