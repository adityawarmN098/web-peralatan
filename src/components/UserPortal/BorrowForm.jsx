import React, { useState } from 'react';
import { Mail, Calendar, User, BookOpen, Layers, AlertCircle, ShieldAlert, Sparkles, Send } from 'lucide-react';
import CameraCapture from '../CameraCapture';
import { KEJURUAN_LIST } from '../../data/mockData';

export default function BorrowForm({ equipmentList, onBorrowSubmit }) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Hitung tanggal pengembalian default (+3 hari)
  const defaultReturn = new Date();
  defaultReturn.setDate(defaultReturn.getDate() + 3);
  const defaultReturnStr = defaultReturn.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    borrowerName: '',
    email: '',
    kejuruan: '',
    equipmentId: '',
    equipmentName: '',
    qty: 1,
    borrowDate: todayStr,
    returnDate: defaultReturnStr,
    photoUrl: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kejuruanLainnya, setKejuruanLainnya] = useState(''); // Input custom jurusan

  // Filter daftar peralatan: langsung tampilkan semua barang yang stoknya tersedia (> 0)
  const filteredEquipment = equipmentList.filter((item) => {
    const stock = Number(item.availableQty ?? item.available ?? item.kuantitas_tersedia ?? 0);
    return stock > 0;
  });

  // Handle Nama Input (Wajib Huruf Kapital)
  const handleNameChange = (e) => {
    const uppercaseValue = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, borrowerName: uppercaseValue }));
    if (errors.borrowerName) {
      setErrors((prev) => ({ ...prev, borrowerName: null }));
    }
  };

  // Handle Pemilihan Barang dari Database Spreadsheet
  const handleEquipmentChange = (e) => {
    const selectedId = e.target.value;
    const item = equipmentList.find((eq) => eq.id === selectedId);
    setFormData((prev) => ({
      ...prev,
      equipmentId: selectedId,
      equipmentName: item ? item.name : '',
      qty: 1
    }));
    if (errors.equipmentId) {
      setErrors((prev) => ({ ...prev, equipmentId: null }));
    }
  };

  const selectedItem = equipmentList.find((eq) => eq.id === formData.equipmentId);
  const selectedItemStock = Number(selectedItem?.availableQty ?? selectedItem?.available ?? selectedItem?.kuantitas_tersedia ?? 0);

  // Validasi Form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.borrowerName.trim()) {
      newErrors.borrowerName = 'Nama lengkap wajib diisi.';
    } else if (formData.borrowerName !== formData.borrowerName.toUpperCase()) {
      newErrors.borrowerName = 'Nama lengkap harus menggunakan HURUF BESAR SEMUA (KAPITAL).';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email aktif wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid (contoh: peminjam@gmail.com).';
    }

    if (!formData.kejuruan) {
      newErrors.kejuruan = 'Pilih kejuruan / jurusan Anda.';
    } else if (formData.kejuruan === 'Lainnya' && !kejuruanLainnya.trim()) {
      newErrors.kejuruan = 'Silakan tulis nama kejuruan / jurusan Anda.';
    }

    if (!formData.equipmentId) {
      newErrors.equipmentId = 'Silakan pilih barang yang ingin dipinjam dari database.';
    } else if (formData.qty > selectedItemStock) {
      newErrors.equipmentId = `Jumlah pinjam melebihi stok yang tersedia (${selectedItemStock} unit).`;
    }

    if (!formData.borrowDate) {
      newErrors.borrowDate = 'Tanggal peminjaman wajib diisi.';
    }

    if (!formData.returnDate) {
      newErrors.returnDate = 'Tanggal pengembalian wajib diisi.';
    } else if (formData.returnDate < formData.borrowDate) {
      newErrors.returnDate = 'Tanggal pengembalian tidak boleh sebelum tanggal peminjaman.';
    }

    if (!formData.photoUrl) {
      newErrors.photoUrl = 'Wajib mengambil / mengunggah foto wajah untuk verifikasi.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const generatedId = `PJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    const timestampStr = new Date().toLocaleString('id-ID');

    const finalKejuruan = formData.kejuruan === 'Lainnya'
      ? `Lainnya: ${kejuruanLainnya.trim()}`
      : formData.kejuruan;

    const newLoanData = {
      ...formData,
      kejuruan: finalKejuruan,
      id: generatedId,
      timestamp: timestampStr,
      status: 'Dipinjam',
      driveFileId: `DRIVE-${Date.now()}`
    };

    try {
      if (onBorrowSubmit) {
        await onBorrowSubmit(newLoanData);
      }
    } catch (error) {
      console.error("Gagal mengirim data peminjaman:", error);
      alert("Terjadi kesalahan saat memproses peminjaman. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
      
      {/* Header Form */}
      <div className="border-b border-slate-100 pb-6 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Sinkronisasi Database Spreadsheet
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Formulir Peminjaman Peralatan
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Harap melengkapi identitas peminjam dengan benar. Notifikasi otomatis akan dikirim ke Gmail aktif Anda dan foto wajah disimpan ke Google Drive.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Identitas Peminjam */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500" /> 1. Identitas Peminjam
          </h3>

          {/* Nama Lengkap (UPPERCASE) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-slate-800">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                WAJIB HURUF BESAR SEMUA
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formData.borrowerName}
                onChange={handleNameChange}
                placeholder="CONTOH: ADITYA PRATAMA KUSUMA"
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl font-semibold text-slate-900 text-sm tracking-wide transition focus:outline-none focus:ring-2 ${
                  errors.borrowerName
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
            </div>
            {errors.borrowerName && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.borrowerName}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Sistem akan otomatis mengubah huruf kecil menjadi HURUF KAPITAL saat diketik.
            </p>
          </div>

          {/* Email Aktif */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-slate-800">
                Email Aktif <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Notifikasi Gmail Aktif
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="namaanda@gmail.com"
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 text-sm transition focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
              </p>
            )}
          </div>

          {/* Kejuruan */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              Kejuruan / Program Keahlian <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <select
                value={formData.kejuruan}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, kejuruan: val }));
                  if (val !== 'Lainnya') setKejuruanLainnya('');
                  if (errors.kejuruan) setErrors((prev) => ({ ...prev, kejuruan: null }));
                }}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 text-sm transition focus:outline-none focus:ring-2 ${
                  errors.kejuruan
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              >
                <option value="">-- Pilih Kejuruan / Jurusan --</option>
                {KEJURUAN_LIST.map((jurusan, idx) => (
                  <option key={idx} value={jurusan}>
                    {jurusan}
                  </option>
                ))}
              </select>
            </div>

            {/* Input custom jurusan — muncul ketika pilih "Lainnya" */}
            {formData.kejuruan === 'Lainnya' && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Tulis nama kejuruan / jurusan Anda <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={kejuruanLainnya}
                    onChange={(e) => {
                      setKejuruanLainnya(e.target.value);
                      if (errors.kejuruan) setErrors((prev) => ({ ...prev, kejuruan: null }));
                    }}
                    placeholder="Contoh: Teknik Mesin, Desain Grafis, Akuntansi, dll."
                    className={`w-full pl-10 pr-4 py-3 bg-blue-50/50 border rounded-xl text-slate-900 text-sm transition focus:outline-none focus:ring-2 ${
                      errors.kejuruan && formData.kejuruan === 'Lainnya'
                        ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                        : 'border-blue-200 focus:border-blue-500 focus:ring-blue-100'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ketik nama program keahlian / jurusan asal Anda yang tidak ada di daftar di atas.
                </p>
              </div>
            )}

            {errors.kejuruan && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.kejuruan}
              </p>
            )}
          </div>

        </div>

        {/* Section 2: Informasi Peralatan */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" /> 2. Pilih Peralatan Database
          </h3>

          {/* Pilih Barang dari Spreadsheet (Tanpa Filter Lantai) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-slate-800">
                Daftar Seluruh Peralatan Tersedia <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">
                {filteredEquipment.length} peralatan tersedia
              </span>
            </div>
            <select
              value={formData.equipmentId}
              onChange={handleEquipmentChange}
              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                errors.equipmentId
                  ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
            >
              <option value="">-- Pilih Barang dari Database --</option>
              {filteredEquipment.map((item) => {
                const stock = Number(item.availableQty ?? item.available ?? item.kuantitas_tersedia ?? 0);
                return (
                  <option key={item.id} value={item.id}>
                    [{item.id}] {item.name} — Stok: {stock} unit {item.location ? `(${item.location})` : ''}
                  </option>
                );
              })}
            </select>
            {errors.equipmentId && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.equipmentId}
              </p>
            )}
          </div>

          {/* Rincian Barang yang Terpilih */}
          {selectedItem && (
            <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-blue-900 text-sm">
                  {selectedItem.name}
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-600">
                  <span className="bg-white px-2 py-0.5 rounded font-mono font-bold text-blue-700 border border-blue-200">
                    ID: {selectedItem.id}
                  </span>
                  {selectedItem.location && <span>Lokasi: <b>{selectedItem.location}</b></span>}
                  <span>•</span>
                  <span>Stok: <b>{selectedItemStock} Unit</b></span>
                </div>
              </div>

              {/* Jumlah Pinjam */}
              <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-blue-200">
                <span className="font-semibold text-slate-700">Jumlah:</span>
                <input
                  type="number"
                  min={1}
                  max={selectedItemStock > 0 ? selectedItemStock : 1}
                  value={formData.qty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setFormData((prev) => ({ ...prev, qty: val > selectedItemStock ? selectedItemStock : val }));
                  }}
                  className="w-16 bg-slate-50 text-center font-bold text-blue-700 border border-slate-200 rounded-lg py-1 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tanggal Peminjaman & Tanggal Pengembalian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tanggal Pinjam */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Tanggal Peminjaman <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={formData.borrowDate}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, borrowDate: e.target.value }));
                    if (errors.borrowDate) setErrors((prev) => ({ ...prev, borrowDate: null }));
                  }}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                    errors.borrowDate
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.borrowDate && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.borrowDate}</p>
              )}
            </div>

            {/* Tanggal Pengembalian */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Tanggal Pengembalian <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  min={formData.borrowDate}
                  value={formData.returnDate}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, returnDate: e.target.value }));
                    if (errors.returnDate) setErrors((prev) => ({ ...prev, returnDate: null }));
                  }}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                    errors.returnDate
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.returnDate && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.returnDate}</p>
              )}
            </div>

          </div>

        </div>

        {/* Section 3: Foto Wajah (Webcam / Upload) */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <User className="w-3.5 h-3.5 text-blue-500" /> 3. Verifikasi Foto Wajah <span className="text-red-500">* Wajib</span>
          </h3>
          <CameraCapture
            currentPhoto={formData.photoUrl}
            onPhotoCaptured={(photoData) => {
              setFormData((prev) => ({ ...prev, photoUrl: photoData }));
              if (errors.photoUrl) setErrors((prev) => ({ ...prev, photoUrl: null }));
            }}
          />
          {errors.photoUrl && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.photoUrl}
            </p>
          )}
        </div>

        {/* Persetujuan & Terms */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">Ketentuan Peminjam:</p>
            <ul className="list-disc pl-4 space-y-0.5 mt-1 text-[11px] text-slate-500">
              <li>Peminjam wajib menjaga kondisi peralatan tetap utuh dan berfungsi normal.</li>
              <li>Pengembalian barang wajib tepat waktu sesuai tanggal rencana kembali.</li>
              <li>Data peminjaman & foto wajah otomatis tersimpan ke Spreadsheet & Google Drive sekolah.</li>
            </ul>
          </div>
        </div>

        {/* Tombol Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white shadow-lg transition duration-200 flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 hover:shadow-blue-600/40 transform active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses Data & Mengunggah ke Spreadsheet...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Permohonan Peminjaman</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}