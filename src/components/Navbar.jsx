import React from 'react';
import { Package, UserCheck, Shield, Sparkles, Database, LogOut, User } from 'lucide-react';

export default function Navbar({
  activePortal,
  setActivePortal,
  loanCount,
  equipmentCount,
  isAdminLoggedIn,
  adminUser,
  onAdminLogout
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-bbpvp.png"
              alt="Logo BBPVP Bandung"
              className="h-11 sm:h-12 w-auto object-contain rounded-xl border border-slate-200/80 p-0.5 bg-white shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900">
                  BBPVP BANDUNG
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                  <Database className="w-3 h-3" /> Sheets & Drive Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Sistem Peminjaman Peralatan & Manajemen Inventaris
              </p>
            </div>
          </div>

          {/* Right Section: Portal Switcher & Admin Auth Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Portal Switcher Buttons */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setActivePortal('user')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activePortal === 'user'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200 border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Portal Peminjam</span>
              </button>

              <button
                onClick={() => setActivePortal('admin')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activePortal === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Portal Admin</span>
                {loanCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activePortal === 'admin' ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {loanCount}
                  </span>
                )}
              </button>
            </div>

            {/* Admin Profile & Logout Button when logged in */}
            {isAdminLoggedIn && adminUser && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <span className="block text-xs font-bold text-slate-800 leading-tight">
                    {adminUser.fullName}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                    {adminUser.email}
                  </span>
                </div>
                <button
                  onClick={onAdminLogout}
                  title="Keluar dari sesi Admin"
                  className="p-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/70 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
