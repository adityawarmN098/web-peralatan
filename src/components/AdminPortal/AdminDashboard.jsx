import React, { useState } from 'react';
import { Package, UserCheck, Wrench, Database, Layers, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import EquipmentList from './EquipmentList';
import LoanList from './LoanList';
import MaintenanceManager from './MaintenanceManager';
import SpreadsheetSyncInfo from './SpreadsheetSyncInfo';

export default function AdminDashboard({
  equipmentList = [],
  loans = [],
  maintenanceList = [],
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
  onReturnEquipment,
  onAddMaintenance,
  onCompleteMaintenance,
  isOnline,
  isLoading,
  isSaving,
  syncError,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState('inventory'); // inventory, loans, maintenance, sync

  const safeEquipment = Array.isArray(equipmentList) ? equipmentList : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeMaintenance = Array.isArray(maintenanceList) ? maintenanceList : [];

  // Metrics Calculations
  const totalUnits = safeEquipment.reduce((acc, curr) => acc + (Number(curr?.totalQty ?? curr?.kuantitas_total ?? curr?.availableQty ?? curr?.qty ?? 0)), 0);
  const availableUnits = safeEquipment.reduce((acc, curr) => acc + (Number(curr?.availableQty ?? curr?.kuantitas_tersedia ?? curr?.qty ?? 0)), 0);
  const activeLoans = safeLoans.filter((l) => l && (l.status === 'Dipinjam' || l.status === 'Terlambat')).length;
  const activeMaintenanceList = safeMaintenance.filter((m) => m && m.status === 'Sedang Berjalan');
  const activeMaintenanceUnits = activeMaintenanceList.reduce((acc, curr) => acc + (Number(curr?.qty ?? curr?.jumlah ?? curr?.jumlah_rusak ?? 1)), 0);

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Total Aset */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Peralatan
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {safeEquipment.length}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Item ({totalUnits} Unit Fisik)
            </span>
          </div>
        </div>

        {/* Metric 2: Tersedia */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Unit Tersedia
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {availableUnits}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Siap Dipinjam
            </span>
          </div>
        </div>

        {/* Metric 3: Sedang Dipinjam */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sedang Dipinjam
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">
              {activeLoans}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Transaksi Aktif
            </span>
          </div>
        </div>

        {/* Metric 4: Pemeliharaan */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pemeliharaan (Servis)
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">
              {activeMaintenanceUnits}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Unit ({activeMaintenanceList.length} Catatan Servis)
            </span>
          </div>
        </div>

      </div>

      {/* Admin Tab Switcher */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-1">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventaris & Labeling</span>
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
            {safeEquipment.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'loans'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Data Peminjaman & Pengembalian</span>
          {activeLoans > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {activeLoans}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'maintenance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Pemeliharaan Peralatan</span>
          {activeMaintenanceUnits > 0 && (
            <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {activeMaintenanceUnits} Unit
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
            activeTab === 'sync'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Integrasi Spreadsheet & Drive</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'inventory' && (
          <EquipmentList
            equipmentList={safeEquipment}
            onAddEquipment={onAddEquipment}
            onUpdateEquipment={onUpdateEquipment}
            onDeleteEquipment={onDeleteEquipment}
          />
        )}

        {activeTab === 'loans' && (
          <LoanList
            loans={safeLoans}
            onReturnEquipment={onReturnEquipment}
          />
        )}

        {activeTab === 'maintenance' && (
          <MaintenanceManager
            maintenanceList={safeMaintenance}
            equipmentList={safeEquipment}
            onAddMaintenance={onAddMaintenance}
            onCompleteMaintenance={onCompleteMaintenance}
          />
        )}

        {activeTab === 'sync' && (
          <SpreadsheetSyncInfo />
        )}
      </div>

    </div>
  );
}