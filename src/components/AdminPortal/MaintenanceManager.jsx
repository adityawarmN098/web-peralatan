import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle, Calendar, User, FileText, DollarSign, X, Layers } from 'lucide-react';

export default function MaintenanceManager({ maintenanceList = [], equipmentList = [], onAddMaintenance, onCompleteMaintenance }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Semua');

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    equipmentId: '',
    qty: 1,
    maintenanceDate: todayStr,
    type: 'Perbaikan Kerusakan',
    notes: '',
    technician: '',
    cost: '',
    status: 'Sedang Berjalan'
  });

  const selectedEq = (equipmentList || []).find((eq) => eq && String(eq.id) === String(formData.equipmentId));
  const selectedEqStock = Number(selectedEq?.availableQty ?? selectedEq?.kuantitas_tersedia ?? selectedEq?.totalQty ?? 1);

  const handleEquipmentSelect = (e) => {
    const eqId = e.target.value;
    const eq = (equipmentList || []).find((item) => item && String(item.id) === String(eqId));
    const maxStock = Number(eq?.availableQty ?? eq?.kuantitas_tersedia ?? eq?.totalQty ?? 1);
    
    setFormData({ 
      ...formData, 
      equipmentId: eqId,
      qty: Math.min(formData.qty || 1, Math.max(1, maxStock))
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.equipmentId) return;

    const selected = equipmentList.find((eq) => eq.id === formData.equipmentId);
    const qty = Number(formData.qty) || 1;

    onAddMaintenance({
      id: `MT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(10 + Math.random() * 90)}`,
      equipmentId: formData.equipmentId,
      equipmentName: selected ? selected.name : '',
      qty: qty,
      jumlah: qty,
      jumlah_rusak: qty,
      maintenanceDate: formData.maintenanceDate,
      type: formData.type,
      notes: formData.notes,
      technician: formData.technician,
      status: 'Sedang Berjalan',
      cost: formData.cost ? Number(formData.cost) : 0
    });

    setIsAddModalOpen(false);
    setFormData({
      equipmentId: '',
      qty: 1,
      maintenanceDate: todayStr,
      type: 'Perbaikan Kerusakan',
      notes: '',
      technician: '',
      cost: '',
      status: 'Sedang Berjalan'
    });
  };

  const filteredList = maintenanceList.filter((m) => {
    if (filterStatus === 'Semua') return true;
    return m.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
            Jadwal & Catatan Pemeliharaan Peralatan
          </h3>
          <p className="text-xs text-slate-500">
            Pantau perbaikan, servis berkala, dan kesiapan operasional alat inventaris.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['Semua', 'Sedang Berjalan', 'Selesai'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Catat Pemeliharaan
          </button>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sm:text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">ID Servis</th>
                <th className="py-3.5 px-4">Peralatan & Unit</th>
                <th className="py-3.5 px-4">Tanggal & Jenis</th>
                <th className="py-3.5 px-4">Keterangan / Diagnosa</th>
                <th className="py-3.5 px-4">Teknisi & Biaya</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Belum ada data pemeliharaan peralatan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const unitCount = item.qty || item.jumlah || item.jumlah_rusak || 1;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* Peralatan & Jumlah Unit */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 block">
                            {item.equipmentName}
                          </span>
                          <span className="inline-block bg-rose-100 text-rose-800 font-extrabold text-[11px] px-2 py-0.5 rounded-md border border-rose-200">
                            {unitCount} Unit
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          {item.equipmentId}
                        </span>
                      </td>

                      {/* Tanggal & Jenis */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {item.type}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {item.maintenanceDate}
                        </div>
                      </td>

                      {/* Keterangan */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {item.notes || '-'}
                        </p>
                      </td>

                      {/* Teknisi & Biaya */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {item.technician || 'Petugas Lab'}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          Rp {Number(item.cost || 0).toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === 'Selesai' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Sedang Berjalan
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {item.status !== 'Selesai' ? (
                          <button
                            onClick={() => onCompleteMaintenance(item.id, item.equipmentId, unitCount)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Selesai Servis ({unitCount} Unit)
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Terawat</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Pemeliharaan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Catat Servis / Pemeliharaan</h3>
                  <p className="text-xs text-slate-500">Pilih peralatan dan jumlah unit yang rusak</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              
              {/* Pilih Peralatan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Peralatan yang Diservis <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.equipmentId}
                  onChange={handleEquipmentSelect}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 font-medium text-slate-900"
                >
                  <option value="">-- Pilih Peralatan --</option>
                  {equipmentList.map((eq) => {
                    const avail = Number(eq.availableQty ?? eq.kuantitas_tersedia ?? eq.qty ?? 0);
                    const total = Number(eq.totalQty ?? eq.kuantitas_total ?? avail);
                    return (
                      <option key={eq.id} value={eq.id}>
                        [{eq.id}] {eq.name} (Tersedia: {avail}/{total} Unit)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Jumlah Unit yang Rusak / Diservis */}
              {formData.equipmentId && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block font-bold text-amber-950 mb-0.5">
                        Berapa Jumlah Unit yang Rusak? <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-amber-800">
                        Stok siap dipinjam saat ini: <b>{selectedEqStock} Unit</b>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max={Math.max(1, selectedEqStock)}
                        required
                        value={formData.qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setFormData({ 
                            ...formData, 
                            qty: Math.max(1, Math.min(selectedEqStock > 0 ? selectedEqStock : 999, val)) 
                          });
                        }}
                        className="w-20 px-3 py-2 border border-amber-300 rounded-xl font-black text-center text-amber-900 bg-white shadow-xs text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <span className="font-bold text-amber-900 text-xs">Unit</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700/90 mt-2 italic">
                    ℹ️ Stok di Portal Peminjaman otomatis berkurang sebanyak <b>{formData.qty || 1} unit</b> selama proses servis berjalan.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai Servis</label>
                  <input
                    type="date"
                    required
                    value={formData.maintenanceDate}
                    onChange={(e) => setFormData({ ...formData, maintenanceDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Perawatan</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="Perbaikan Kerusakan">Perbaikan Kerusakan</option>
                    <option value="Perawatan Rutin & Bersih">Perawatan Rutin & Bersih</option>
                    <option value="Penggantian Sparepart">Penggantian Sparepart</option>
                    <option value="Kalibrasi & Pengujian">Kalibrasi & Pengujian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diagnosa / Catatan Kerusakan</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jelaskan kondisi kerusakan atau bagian yang diperbaiki (cth: Layar mati, keyboard macet)..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Petugas / Teknisi</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hendra (Teknisi Lab)"
                    value={formData.technician}
                    onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20"
                >
                  Simpan Catatan Servis ({formData.qty || 1} Unit)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
