import React, { useState } from 'react';
import { Package, Search, Plus, Tag, CheckCircle, AlertTriangle, X, Trash2 } from 'lucide-react';
import EquipmentLabelModal from './EquipmentLabelModal';

export default function EquipmentList({ equipmentList = [], onAddEquipment, onUpdateEquipment, onDeleteEquipment }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [labelEquipment, setLabelEquipment] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Equipment Form State
  const [newEquipment, setNewEquipment] = useState({
    id: `L1-${String((equipmentList?.length || 0) + 1).padStart(2, '0')}`,
    name: '',
    category: 'Lantai 1',
    qty: 1,
    totalQty: 1,
    status: 'Tersedia',
    note: ''
  });

  const categories = [
    'Semua', 
    ...Array.from(new Set((equipmentList || []).map((e) => e?.category).filter(Boolean)))
  ];

  const filteredEquipment = (equipmentList || []).filter((item) => {
    if (!item) return false;
    const nameStr = String(item.name || '').toLowerCase();
    const idStr = String(item.id || '').toLowerCase();
    const noteStr = String(item.note || item.description || '').toLowerCase();
    const search = String(searchTerm || '').toLowerCase();

    const matchesSearch =
      nameStr.includes(search) ||
      idStr.includes(search) ||
      noteStr.includes(search);

    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newEquipment.name.trim() || !newEquipment.id.trim()) return;

    if (onAddEquipment) {
      onAddEquipment({
        ...newEquipment,
        qty: Number(newEquipment.totalQty),
        totalQty: Number(newEquipment.totalQty),
        availableQty: Number(newEquipment.totalQty)
      });
    }

    setIsAddModalOpen(false);
    setNewEquipment({
      id: `L1-${String((equipmentList?.length || 0) + 2).padStart(2, '0')}`,
      name: '',
      category: 'Lantai 1',
      qty: 1,
      totalQty: 1,
      status: 'Tersedia',
      note: ''
    });
  };

  const handleDelete = (item) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus peralatan "${item.name}" (${item.id})?`)) {
      if (onDeleteEquipment) {
        onDeleteEquipment(item.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls: Search, Filter, and Add Button */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nomor barang, nama peralatan, atau keterangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Filter Category & Add Button */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 py-2.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-xs font-medium"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Peralatan
          </button>
        </div>

      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sm:text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">No.</th>
                <th className="py-3.5 px-4">Nama Barang</th>
                <th className="py-3.5 px-4">Lantai</th>
                <th className="py-3.5 px-4 text-center">Jumlah Tersedia</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Aksi & Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Tidak ada peralatan yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item, idx) => {
                  const avail = Number(item.availableQty ?? item.kuantitas_tersedia ?? item.qty ?? 0);
                  const total = Number(item.totalQty ?? item.kuantitas_total ?? avail);
                  const itemId = item.id || `EQ-${idx + 1}`;

                  return (
                    <tr key={itemId} className="hover:bg-slate-50/80 transition">
                      
                      {/* Nomor Barang (ID) */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {itemId}
                      </td>

                      {/* Nama Peralatan */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>{item.name || 'Tanpa Nama'}</div>
                      </td>

                      {/* Kategori / Lantai */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                          {item.category || 'Umum'}
                        </span>
                      </td>

                      {/* Jumlah */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`font-black text-xs sm:text-sm ${avail === 0 ? 'text-red-500' : 'text-slate-900'}`}>
                          {avail} / {total} unit
                        </span>
                      </td>

                      {/* Keterangan / Note */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs max-w-xs truncate">
                        {item.note || item.description || '-'}
                      </td>

                      {/* Aksi: Labeling & Hapus */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setLabelEquipment(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition"
                            title="Cetak Stiker Label QR Code"
                          >
                            <Tag className="w-3.5 h-3.5" /> Labeling
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200 transition"
                            title="Hapus Peralatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cetak Labeling Peralatan */}
      {labelEquipment && (
        <EquipmentLabelModal
          equipment={labelEquipment}
          onClose={() => setLabelEquipment(null)}
        />
      )}

      {/* Modal Tambah Peralatan Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tambah Inventaris Baru</h3>
                  <p className="text-xs text-slate-500">Masukkan data peralatan dan lokasi lantai</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ID / Nomor Barang</label>
                  <input
                    type="text"
                    required
                    value={newEquipment.id}
                    onChange={(e) => setNewEquipment({ ...newEquipment, id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-xl font-mono uppercase bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lantai / Kategori</label>
                  <select
                    value={newEquipment.category}
                    onChange={(e) => setNewEquipment({ ...newEquipment, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="Lantai 1">Lantai 1</option>
                    <option value="Lantai 2">Lantai 2</option>
                    <option value="Lantai 3">Lantai 3</option>
                    <option value="INVENTARIS LANTAI 1">INVENTARIS LANTAI 1</option>
                    <option value="INVENTARIS LANTAI 2">INVENTARIS LANTAI 2</option>
                    <option value="INVENTARIS LANTAI 3">INVENTARIS LANTAI 3</option>
                    <option value="DAFTAR PERALATAN DI LANTAI 2">DAFTAR PERALATAN DI LANTAI 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Komputer / Mouse / Keyboard"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newEquipment.totalQty}
                    onChange={(e) => setNewEquipment({ ...newEquipment, totalQty: Number(e.target.value), qty: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={newEquipment.status}
                    onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Belum Tercatat">Belum Tercatat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder="e.g. Tercatat pada catatan Lantai 1"
                  value={newEquipment.note}
                  onChange={(e) => setNewEquipment({ ...newEquipment, note: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20"
                >
                  Simpan Peralatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}