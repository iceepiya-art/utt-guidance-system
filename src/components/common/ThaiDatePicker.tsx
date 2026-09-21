import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  THAI_MONTHS_FULL,
  THAI_DAYS_SHORT,
  getDaysInMonthGrid,
  getTodayISO,
  formatThaiFullDate,
} from '../../utils/dateUtils';

export interface ThaiDatePickerProps {
  value: string; // ISO format: 'YYYY-MM-DD'
  onChange: (isoDate: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
}

/**
 * Safely parses YYYY-MM-DD without any timezone shifts
 */
function parseISODateParts(isoStr: string): { year: number; month: number; day: number } | null {
  if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m - 1, day: d };
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  placeholder = 'เลือกวันที่ (พ.ศ.)',
  min,
  max,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive initial view month and year from current value or today
  const todayParts = parseISODateParts(getTodayISO())!;
  const parsedValue = parseISODateParts(value);

  const [viewYear, setViewYear] = useState<number>(parsedValue?.year ?? todayParts.year);
  const [viewMonth, setViewMonth] = useState<number>(parsedValue?.month ?? todayParts.month);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.year);
      setViewMonth(parsedValue.month);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleTodayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = getTodayISO();
    onChange(today);
    setIsOpen(false);
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const monthGrid = getDaysInMonthGrid(viewYear, viewMonth);
  const buddhistYear = viewYear + 543;

  // Range of Buddhist Era years for the year picker (current +- 5 years)
  const currentBYear = todayParts.year + 543;
  const yearOptions: number[] = [];
  for (let y = currentBYear - 6; y <= currentBYear + 6; y++) {
    yearOptions.push(y);
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input Trigger Button */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label || 'เลือกวันที่'}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer select-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100'
            : 'hover:border-slate-400 focus:ring-2 focus:ring-[#087CC1] focus:bg-white'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <CalendarIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className={`truncate font-medium ${value ? 'text-slate-800' : 'text-slate-400'}`}>
            {value ? formatThaiFullDate(value) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && !disabled && !required && (
            <button
              type="button"
              aria-label="ล้างวันที่"
              onClick={e => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="ปฏิทินเลือกวันที่"
          className="absolute left-0 mt-1 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              aria-label="เดือนก่อนหน้า"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <select
                aria-label="เลือกเดือน"
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="bg-transparent hover:bg-slate-100 px-1.5 py-1 rounded cursor-pointer font-bold focus:outline-none focus:ring-1 focus:ring-[#087CC1]"
              >
                {THAI_MONTHS_FULL.map((mName, idx) => (
                  <option key={idx} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                aria-label="เลือกปี พ.ศ."
                value={buddhistYear}
                onChange={e => setViewYear(Number(e.target.value) - 543)}
                className="bg-transparent hover:bg-slate-100 px-1.5 py-1 rounded cursor-pointer font-bold focus:outline-none focus:ring-1 focus:ring-[#087CC1]"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              aria-label="เดือนถัดไป"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (Thai: อา จ อ พ พฤ ศ ส) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {THAI_DAYS_SHORT.map((dayName, idx) => (
              <div
                key={idx}
                className={`text-[11px] font-semibold py-1 ${
                  idx === 0 ? 'text-red-500' : 'text-slate-500'
                }`}
              >
                {dayName.replace('.', '')}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {monthGrid.map((item, idx) => {
              const isSelected = item.dateString === value;
              const isDisabled =
                (min && item.dateString < min) || (max && item.dateString > max);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDate(item.dateString)}
                  className={`h-7 w-7 text-xs rounded-lg flex items-center justify-center mx-auto transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#087CC1] text-white font-bold shadow-xs'
                      : item.isToday
                      ? 'border border-[#087CC1] text-[#087CC1] font-bold hover:bg-sky-50'
                      : item.isCurrentMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer Controls: วันนี้ / ล้าง */}
          <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2 text-xs">
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-[#087CC1] hover:text-[#065b8e] font-semibold hover:underline cursor-pointer px-1"
            >
              วันนี้
            </button>

            {!required && (
              <button
                type="button"
                onClick={handleClearClick}
                className="text-slate-500 hover:text-slate-700 hover:underline cursor-pointer px-1"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
