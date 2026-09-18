import React, { useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  CalendarCheck,
  Calendar,
  Compass,
  Image as ImageIcon,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { CollegeLogo } from '../common/CollegeLogo';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab =
  | 'dashboard'
  | 'schools'
  | 'submissions'
  | 'appointments'
  | 'calendar'
  | 'fieldTrips'
  | 'gallery'
  | 'reports'
  | 'settings';

interface AppLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'ภาพรวมระบบ (Dashboard)', icon: LayoutDashboard },
    { id: 'schools', label: 'ข้อมูลโรงเรียน', icon: GraduationCap },
    { id: 'submissions', label: 'ยื่นหนังสือ', icon: FileText },
    { id: 'appointments', label: 'นัดหมาย', icon: CalendarCheck },
    { id: 'calendar', label: 'ปฏิทินแนะแนว', icon: Calendar },
    { id: 'fieldTrips', label: 'ออกแนะแนว', icon: Compass },
    { id: 'gallery', label: 'รูปกิจกรรม', icon: ImageIcon },
    { id: 'reports', label: 'รายงานประจำเดือน', icon: FileSpreadsheet },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const getRoleBadge = () => {
    if (!currentUser) return null;
    const colors: Record<string, string> = {
      ADMIN: 'bg-red-50 text-red-700 border-red-200',
      MANAGER: 'bg-purple-50 text-purple-700 border-purple-200',
      STAFF: 'bg-blue-50 text-blue-700 border-blue-200',
      VIEWER: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
          colors[currentUser.role] || colors.STAFF
        }`}
      >
        {{ ADMIN: 'ผู้ดูแลระบบ', MANAGER: 'หัวหน้างานแนะแนว', STAFF: 'เจ้าหน้าที่แนะแนว', VIEWER: 'ผู้ดูข้อมูล (สิทธิ์เดิม)' }[currentUser.role]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen z-30 shadow-xs">
        {/* Logo & Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-[#EAF6FD]/50 to-transparent">
          <CollegeLogo size="sm" showText={true} />
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#087CC1]/10 text-[#087CC1] flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.displayName?.[0] || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {currentUser?.displayName || 'เจ้าหน้าที่'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getRoleBadge()}
                {currentUser?.teamId && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                      currentUser.teamId === 'team1'
                        ? 'bg-[#E3F2FD] text-[#1976D2]'
                        : 'bg-[#FFF7E0] text-[#F59E0B]'
                    }`}
                  >
                    {currentUser.teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelectTab(item.id as ActiveTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-[#087CC1] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer with Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={logout}
            id="btn-logout"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <CollegeLogo size="sm" showText={true} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            id="btn-mobile-menu-toggle"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <CollegeLogo size="sm" showText={true} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile User Details */}
            <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-100">
              <div className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.displayName || 'ผู้ใช้งาน'}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {getRoleBadge()}
                {currentUser?.teamId && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${
                      currentUser.teamId === 'team1'
                        ? 'bg-[#E3F2FD] text-[#1976D2]'
                        : 'bg-[#FFF7E0] text-[#F59E0B]'
                    }`}
                  >
                    {currentUser.teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย'}
                  </span>
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id as ActiveTab)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#087CC1] text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};
