import React, { useEffect, useState } from 'react';
import type { Vehicle } from '../../types';
import { subscribeVehicles, saveVehicle } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';
const mainVehicles: Vehicle[] = [
  { id: 'mitsu-6738', vehicleName: 'MITSU บน 6738', registrationNumber: 'บน 6738', active: true },
  { id: 'vigo-9914', vehicleName: 'VIGO กข 9914', registrationNumber: 'กข 9914', active: true },
];
export function TripVehiclePicker({ value, name, onChange, disabled = false }: { value: string; name: string; onChange: (id: string, name: string) => void; disabled?: boolean }) {
  const { isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>(mainVehicles);
  const [adding, setAdding] = useState(false);
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => subscribeVehicles(list => setVehicles([...mainVehicles, ...list.filter(v => v.active && !['veh_01', 'veh_02', 'veh_03', 'veh_personal', 'mitsu-6738', 'vigo-9914'].includes(v.id))])), []);
  const add = async () => {
    if (!model.trim() || !plate.trim()) { setError('กรุณาระบุชื่อรถและทะเบียน'); return; }
    setSaving(true); setError('');
    const vehicle = { id: `vehicle-${crypto.randomUUID()}`, vehicleName: `${model.trim()} ${plate.trim()}`, registrationNumber: plate.trim(), active: true };
    try {
      const existing = vehicles.find(v => v.registrationNumber.replace(/\s/g, '') === plate.replace(/\s/g, ''));
      if (existing) { onChange(existing.id, existing.vehicleName); }
      else { await saveVehicle(vehicle); onChange(vehicle.id, vehicle.vehicleName); }
      setAdding(false); setModel(''); setPlate('');
    } catch { setError('เพิ่มรถไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-2">
    <select aria-label="ยานพาหนะ" value={value} disabled={disabled || saving} onChange={e => { const vehicle = vehicles.find(v => v.id === e.target.value); if(vehicle) onChange(vehicle.id, vehicle.vehicleName); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs">
      {value && !vehicles.some(v => v.id === value) && <option value={value}>{name}</option>}
      {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleName}</option>)}
    </select>
    {isAdmin && !adding && <button type="button" disabled={disabled} onClick={() => setAdding(true)} className="text-sm font-semibold text-sky-700">+ เพิ่มรถ</button>}
    {adding && <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <input aria-label="ชื่อรถใหม่" placeholder="ชื่อรถ เช่น TOYOTA" value={model} onChange={e => setModel(e.target.value)} disabled={saving} className="w-full border rounded-lg p-2 text-sm" />
      <input aria-label="ทะเบียนรถใหม่" placeholder="ทะเบียนรถ" value={plate} onChange={e => setPlate(e.target.value)} disabled={saving} className="w-full border rounded-lg p-2 text-sm" />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="button" disabled={saving} onClick={add} className="text-sm text-sky-700 font-semibold">{saving ? 'กำลังบันทึก...' : 'บันทึกรถ'}</button>
      <button type="button" disabled={saving} onClick={() => setAdding(false)} className="ml-4 text-sm text-slate-500">ยกเลิกเพิ่มรถ</button>
    </div>}
  </div>;
}
