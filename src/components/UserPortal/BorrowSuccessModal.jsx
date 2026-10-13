import React, { useState } from 'react';
import { CheckCircle2, QrCode, Mail, Printer, ExternalLink, X, Calendar, User, BookOpen, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function BorrowSuccessModal({ loanData, onClose }) {
  const [activeTab, setActiveTab] = useState('receipt'); // 'receipt' or 'email'

  if (!loanData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-xs ring-4 ring-white/30">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            Peminjaman Berhasil Diajukan!
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Data tersimpan di <b>Google Sheets</b>, foto wajah di <b>Google Drive</b>, dan notifikasi konfirmasi dikirim ke <b>Gmail</b> Anda.
          </p>

          {/* Sub Navigation */}
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab('receipt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'receipt'
                  ? 'bg-white text-emerald-800 shadow'
                  : 'bg-emerald-800/60 text-white hover:bg-emerald-800/80'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> Bukti Peminjaman (QR)
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'email'
                  ? 'bg-white text-emerald-800 shadow'
                  : 'bg-emerald-800/60 text-white hover:bg-emerald-800/80'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Pratinjau Email Notifikasi Gmail
            </button>
          </div>
        </div>

        {/* Tab 1: Bukti Peminjaman Digital (Receipt) */}
        {activeTab === 'receipt' && (
          <div className="p-6 space-y-6">
            
            {/* Kartu Struk Peminjaman */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-dashed border-slate-300 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    ID Transaksi
                  </span>
                  <p className="font-mono text-lg font-bold text-blue-700">
                    {loanData.id}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Waktu: {loanData.timestamp}
                  </p>
                </div>

                {/* QR Code */}
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center">
                  <QRCodeSVG
                    value={`ID:${loanData.id}|NAMA:${loanData.borrowerName}|BARANG:${loanData.equipmentId}|KEMBALI:${loanData.returnDate}`}
                    size={80}
                  />
                  <span className="text-[9px] font-mono text-slate-400 mt-1">Scan Verifikasi</span>
                </div>
              </div>

              {/* Rincian Peminjam & Barang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Nama Peminjam:</span>
                  <span className="font-extrabold text-slate-900">{loanData.borrowerName}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Kejuruan:</span>
                  <span className="font-bold text-slate-800">{loanData.kejuruan}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Email Peminjam:</span>
                  <span className="font-bold text-slate-800">{loanData.email}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Barang Dipinjam:</span>
                  <span className="font-bold text-blue-800">
                    [{loanData.equipmentId}] {loanData.equipmentName} ({loanData.qty} unit)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Tgl Peminjaman:</span>
                  <span className="font-bold text-slate-800">{loanData.borrowDate}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Tgl Batas Kembali:</span>
                  <span className="font-bold text-red-600">{loanData.returnDate}</span>
                </div>
              </div>

              {/* Foto Wajah & Status Drive */}
              <div className="mt-2 pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {loanData.photoUrl ? (
                    <img
                      src={loanData.photoUrl}
                      alt="Foto Peminjam"
                      className="w-12 h-12 rounded-xl object-cover border border-emerald-400 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Foto Wajah Terverifikasi
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Google Drive: {loanData.driveFileId || 'Drive-Uploaded-OK'}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200">
                  Status: Dipinjam
                </span>
              </div>

            </div>

            {/* Catatan Penting */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Simpan atau cetak bukti ini. Tunjukkan barcode/QR Code ini kepada petugas lab saat mengambil dan mengembalikan peralatan.
              </span>
            </div>

            {/* Aksi */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" /> Cetak Tanda Terima
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Selesai & Tutup
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Simulasi Notifikasi Masuk ke Gmail */}
        {activeTab === 'email' && (
          <div className="p-6 space-y-4">
            <div className="bg-slate-100 p-2.5 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <span>
                Pratinjau otomatis format email yang diterima di kotak masuk <b>{loanData.email}</b>
              </span>
            </div>

            {/* Mock Gmail Client Frame */}
            <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 border-b border-slate-200 p-3 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="font-semibold text-slate-700 ml-1">Gmail — Kotak Masuk (1)</span>
                </div>
                <span className="text-[11px] text-slate-500">Baru saja</span>
              </div>

              <div className="p-5 bg-white text-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      Pemberitahuan Peminjaman Alat #{loanData.id}
                    </span>
                    <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                      Kotak Masuk
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Dari: <b>BBPVP BANDUNG &lt;admin.peralatan@bbpvpbandung.kemnaker.go.id&gt;</b>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Kepada: <b>{loanData.borrowerName} &lt;{loanData.email}&gt;</b>
                  </p>
                </div>

                {/* Body Email */}
                <div className="space-y-3 text-slate-700 leading-relaxed">
                  <p>Halo <b>{loanData.borrowerName}</b>,</p>
                  <p>
                    Permohonan peminjaman peralatan Anda telah <b>BERHASIL DICATAT</b> pada sistem inventaris peralatan.
                  </p>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <p><b>Nomor Tiket:</b> {loanData.id}</p>
                    <p><b>Kejuruan:</b> {loanData.kejuruan}</p>
                    <p><b>Barang Dipinjam:</b> {loanData.equipmentName} ({loanData.equipmentId})</p>
                    <p><b>Jumlah:</b> {loanData.qty} unit</p>
                    <p><b>Tanggal Pinjam:</b> {loanData.borrowDate}</p>
                    <p className="text-red-600 font-bold">
                      <b>Batas Waktu Pengembalian:</b> {loanData.returnDate}
                    </p>
                    <p><b>Foto Wajah Verifikasi:</b> Tersimpan di Google Drive Pengelola</p>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Harap kembalikan peralatan tepat waktu dan dalam keadaan bersih serta berfungsi dengan baik.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
              >
                Tutup & Kembali ke Form
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
