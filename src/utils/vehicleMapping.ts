import { cleanTeacherName, SelectablePersonnel, TARGET_PERSONNEL_CANONICAL_NAMES, KNOWN_PERSONNEL_ALIASES } from './personnelSelector';

/**
 * Stable IDs for Primary Counselors
 */
export const PRACHA_PERSONNEL_ID = 'usr_admin';
export const PIYA_PERSONNEL_ID = 'usr_staff2';
export const NITCHAIKUL_PERSONNEL_ID = 'usr_staff1';

/**
 * Stable IDs and metadata for Primary Vehicles
 */
export const VIGO_VEHICLE = {
  id: 'vigo-9914',
  name: 'VIGO กข 9914',
  registrationNumber: 'กข 9914',
};

export const MITSU_VEHICLE = {
  id: 'mitsu-6738',
  name: 'MITSU บน 6738',
  registrationNumber: 'บน 6738',
};

/**
 * Personnel-to-Vehicle default mapping according to business rules:
 * - อ.ประชา กัลปนารถ (usr_admin) -> VIGO กข 9914
 * - อ.ปิยะ สีตาชัย (usr_staff2) -> MITSU บน 6738
 * - Other personnel (e.g. อ.ณิชชัยกุญช์ โลราช) -> No default vehicle (unassigned / "")
 * Note: Never bind vehicles to route/team!
 */
export const PERSONNEL_DEFAULT_VEHICLE: Record<string, { id: string; name: string }> = {
  [PRACHA_PERSONNEL_ID]: VIGO_VEHICLE,
  [PIYA_PERSONNEL_ID]: MITSU_VEHICLE,
};

/**
 * Resolves the default vehicle for a responsible counselor/personnel.
 * Returns { id, name } if a business rule mapping exists, or null if unassigned.
 */
export const getDefaultVehicleForPersonnel = (
  personnelId?: string | null,
  personnelName?: string | null
): { id: string; name: string } | null => {
  // 1. Direct match on Personnel ID
  if (personnelId && PERSONNEL_DEFAULT_VEHICLE[personnelId]) {
    return PERSONNEL_DEFAULT_VEHICLE[personnelId];
  }

  // 2. Lookup by verified alias ID
  if (personnelId) {
    const aliasTarget = KNOWN_PERSONNEL_ALIASES[personnelId];
    if (aliasTarget && PERSONNEL_DEFAULT_VEHICLE[aliasTarget]) {
      return PERSONNEL_DEFAULT_VEHICLE[aliasTarget];
    }
  }

  // 3. Fallback resolution by counselor name
  if (personnelName && personnelName.trim()) {
    const clean = cleanTeacherName(personnelName);
    if (clean.includes('ประชา')) {
      return VIGO_VEHICLE;
    }
    if (clean.includes('ปิยะ')) {
      return MITSU_VEHICLE;
    }
  }

  return null;
};

/**
 * Resolves vehicle for Appointment Create / Edit following Priority:
 * EDIT EXISTING RECORD:
 * 1. Stored vehicle ของ record
 * 2. ถ้าไม่มี stored vehicle -> default จาก responsiblePersonnelId
 * 3. ถ้าไม่มี mapping -> ไม่ระบุ
 *
 * CREATE NEW:
 * 1. Stored / currently selected vehicle (if user selected one)
 * 2. default จาก responsiblePersonnelId
 * 3. ถ้าไม่มี mapping -> ไม่ระบุ
 */
export const resolveVehicleForAppointment = ({
  isEdit = false,
  storedVehicleId,
  storedVehicleName,
  counselorId,
  counselorName,
}: {
  isEdit?: boolean;
  storedVehicleId?: string | null;
  storedVehicleName?: string | null;
  counselorId?: string | null;
  counselorName?: string | null;
}): { vehicleId: string; vehicleName: string } => {
  if (storedVehicleId && storedVehicleId.trim()) {
    return {
      vehicleId: storedVehicleId,
      vehicleName: storedVehicleName || '',
    };
  }
  const defaultVeh = getDefaultVehicleForPersonnel(counselorId, counselorName);
  if (defaultVeh) {
    return {
      vehicleId: defaultVeh.id,
      vehicleName: defaultVeh.name,
    };
  }
  return { vehicleId: '', vehicleName: '' };
};

/**
 * Resolves vehicle for FieldTrip Guidance from Appointment following Priority:
 * 1. appointment.vehicleId
 * 2. personnel default
 * 3. ไม่ระบุ
 */
export const resolveVehicleForGuidance = ({
  appointmentVehicleId,
  appointmentVehicleName,
  counselorId,
  counselorName,
}: {
  appointmentVehicleId?: string | null;
  appointmentVehicleName?: string | null;
  counselorId?: string | null;
  counselorName?: string | null;
}): { vehicleId: string; vehicleName: string } => {
  if (appointmentVehicleId && appointmentVehicleId.trim()) {
    return {
      vehicleId: appointmentVehicleId,
      vehicleName: appointmentVehicleName || '',
    };
  }
  const defaultVeh = getDefaultVehicleForPersonnel(counselorId, counselorName);
  if (defaultVeh) {
    return {
      vehicleId: defaultVeh.id,
      vehicleName: defaultVeh.name,
    };
  }
  return { vehicleId: '', vehicleName: '' };
};
