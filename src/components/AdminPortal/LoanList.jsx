import React, { useState } from 'react';
import { UserCheck, Search, CheckCircle, Clock, AlertTriangle, ExternalLink, Mail, User, Calendar, X, Eye } from 'lucide-react';

// Helper untuk format URL foto agar selalu bisa ditampilkan baik berupa base64 maupun link Google Drive
function formatPhotoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('Error')) return null;
  if (trimmed.startsWith('data:image')) return trimmed;
  
  // Jika link Google Drive uc export view atau preview
  const match = trimmed.match(/id=([a-zA-Z0-9_-]+)/) || trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
  }
  
  return trimmed;
}

export default function LoanList({ loans = [], onReturnEquipment }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Filter dan mapping data agar aman membaca berbagai variasi nama kolom dari Spreadsheet
  const filteredLoans = (loans || []).filter((loan) => {
    if (!loan) return false;

    // Menyesuaikan berbagai kemungkinan nama key dari Google Sheets
    const borrower = (loan.nama_lengkap || loan.borrowerName || '').toLowerCase();
    const loanId = (loan.id_tiket || loan.id || '').toLowerCase();
    const equipment = (loan.peralatan_dipinjam || loan.equipmentName || '').toLowerCase();
    const kejuruan = (loan.kejuruan || loan.major || '').toLowerCase();
    const email = (loan.email_aktif || loan.email || '').toLowerCase();
    const search = (searchTerm || '').toLowerCase();

    const matchesSearch =
      borrower.includes(search) ||
      loanId.includes(search) ||
      equipment.includes(search) ||
      kejuruan.includes(search) ||
      email.includes(search);

    const statusVal = loan.status || 'Dipinjam';
    const matchesStatus = filterStatus === 'Semua' || statusVal === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Dikembalikan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Dikembalikan
          </span>
        );
      case 'Terlambat':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3 h-3" /> Terlambat
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Dipinjam
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama peminjam, ID tiket, email, atau peralatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {['Semua', 'Dipinjam', 'Terlambat', 'Dikembalikan'].map((st) => (
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
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] sm:text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Foto Wajah</th>
                <th className="py-3.5 px-4">ID & Peminjam</th>
                <th className="py-3.5 px-4">Kejuruan & Email</th>
                <th className="py-3.5 px-4">Peralatan Dipinjam</th>
                <th className="py-3.5 px-4">Tgl Pinjam & Kembali</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Belum ada data peminjaman yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan, idx) => {
                  const loanId = loan.id_tiket || loan.id || `TICKET-${idx}`;
                  const borrowerName = loan.nama_lengkap || loan.borrowerName || 'Tanpa Nama';
                  const kejuruan = loan.kejuruan || loan.major || '-';
                  const email = loan.email_aktif || loan.email || '-';
                  const equipmentName = loan.peralatan_dipinjam || loan.equipmentName || '-';
                  const borrowDate = loan.tanggal_peminjaman || loan.borrowDate || '-';
                  const returnDate = loan.tanggal_pengembalian || loan.returnDate || '-';
                  const status = loan.status || 'Dipinjam';
                  const rawPhoto = loan.photoUrl || loan.link_foto_drive || loan.foto || null;
                  const photoUrl = formatPhotoUrl(rawPhoto);

                  return (
                    <tr key={loanId + idx} className="hover:bg-slate-50/80 transition">
                      
                      {/* Foto Wajah Peminjam */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {photoUrl ? (
                          <div
                            onClick={() => setSelectedPhoto({ ...loan, borrowerName, loanId, photoUrl, kejuruan, equipmentName })}
                            className="relative group cursor-pointer w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:ring-2 hover:ring-blue-500 transition"
                            title="Klik untuk melihat foto"
                          >
                            <img
                              src={photoUrl}
                              alt={borrowerName}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* ID & Nama Peminjam */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-bold text-blue-700 block">
                          {loanId}
                        </span>
                        <span className="font-black text-slate-900 text-xs sm:text-sm tracking-wide">
                          {borrowerName}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {loan.timestamp || '-'}
                        </span>
                      </td>

                      {/* Kejuruan & Email */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-slate-100 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-md mb-1">
                          {kejuruan}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Mail className="w-3 h-3 text-red-400" />
                          <span>{email}</span>
                        </div>
                      </td>

                      {/* Peralatan Dipinjam */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {equipmentName}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded font-semibold">
                            {loan.equipmentId || 'EQ'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {loan.qty || 1} Unit
                          </span>
                        </div>
                      </td>

                      {/* Tanggal Pinjam & Kembali */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="text-slate-400">Pinjam: </span>
                          <span className="font-semibold text-slate-800">{borrowDate}</span>
                        </div>
                        <div className="text-xs mt-0.5">
                          <span className="text-slate-400">Kembali: </span>
                          <span className={`font-bold ${status === 'Terlambat' ? 'text-red-600' : 'text-slate-800'}`}>
                            {returnDate}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(status)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {status !== 'Dikembalikan' ? (
                          <button
                            onClick={() => onReturnEquipment(loanId, loan.equipmentId, loan.qty || 1)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition transform active:scale-95"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Konfirmasi Kembali
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400 italic">
                            Telah Selesai
                          </span>
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

      {/* Modal Zoom Foto Wajah */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 relative">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Verifikasi Foto Wajah Peminjam
              </span>
              <h4 className="font-black text-slate-900 text-base mt-1">
                {selectedPhoto.borrowerName}
              </h4>
              <p className="text-xs text-blue-700 font-mono mb-4">
                Tiket: {selectedPhoto.loanId}
              </p>

              <div className="w-56 h-56 mx-auto rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md mb-4 bg-slate-100">
                <img
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.borrowerName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1 text-slate-600">
                <p><b>Kejuruan:</b> {selectedPhoto.kejuruan}</p>
                <p><b>Peralatan:</b> {selectedPhoto.equipmentName}</p>
                <p><b>Status:</b> <span className="text-emerald-700 font-mono font-bold">Terhubung</span></p>
              </div>

              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}