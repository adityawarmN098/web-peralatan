import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import BorrowForm from './components/UserPortal/BorrowForm';
import BorrowSuccessModal from './components/UserPortal/BorrowSuccessModal';
import AdminDashboard from './components/AdminPortal/AdminDashboard';
import AdminLogin from './components/AdminPortal/AdminLogin';
import { INITIAL_EQUIPMENT, INITIAL_LOANS, INITIAL_MAINTENANCE } from './data/mockData';
import { Package, Shield, UserCheck, Sparkles, CheckCircle, Info, LogOut, BellRing, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';

// === URL APPS SCRIPT TERBARU ANDA ===
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbx9djqCIMDyG68WTzankoFmcWRn5pdnpMvUSQ8MP2-On1-WXRDzc_s127DJOMmYjju0TA/exec";

// Fungsi API pengganti yang langsung menggunakan SPREADSHEET_URL di atas
async function fetchAllDataFromApi() {
  const response = await fetch(`${SPREADSHEET_URL}?action=getAll`);
  const data = await response.json();
  return data;
}

async function apiCallHelper(action, payload) {
  const response = await fetch(SPREADSHEET_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action, ...payload }),
  });
  return await response.json();
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-3xl border border-red-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto font-black text-xl">
            ⚠️
          </div>
          <h3 className="font-black text-slate-900 text-lg">Halaman Dimuat Ulang</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Terjadi pembaruan data sistem. Silakan klik tombol di bawah untuk menyegarkan tampilan.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20"
          >
            Segarkan Halaman (Refresh)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activePortal, setActivePortal] = useState('user'); // 'user' or 'admin'
  const [equipmentList, setEquipmentList] = useState(INITIAL_EQUIPMENT);
  const [loans, setLoans] = useState(INITIAL_LOANS);
  const [maintenanceList, setMaintenanceList] = useState(INITIAL_MAINTENANCE);
  const [successModalData, setSuccessModalData] = useState(null);

  // === Status Koneksi Spreadsheet ===
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Admin Auth State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('silentara_admin_logged') === 'true';
  });
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('silentara_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [notificationToast, setNotificationToast] = useState(null);

  // === Toast Helper ===
  const showToast = (title, message, type = 'info') => {
    setNotificationToast({ title, message, type });
    setTimeout(() => setNotificationToast(null), 5000);
  };

  // === LOAD DATA DARI SPREADSHEET ===
  const loadDataFromSpreadsheet = useCallback(async () => {
    setIsLoading(true);
    setSyncError(null);
    try {
      const data = await fetchAllDataFromApi();
      const rawEqList = data.equipment && data.equipment.length > 0 ? data.equipment : INITIAL_EQUIPMENT;
      
      const currentEqList = rawEqList.map((eq) => {
        const total = Number(eq.totalQty ?? eq.kuantitas_total ?? eq.qty ?? 1);
        const avail = Number(eq.availableQty ?? eq.kuantitas_tersedia ?? eq.qty ?? total);
        return {
          ...eq,
          id: eq.id || eq.nomor_barang || '',
          name: eq.name || eq.nama_barang || '',
          category: eq.category || eq.kategori || 'Umum',
          totalQty: total,
          availableQty: avail,
          qty: avail,
          status: eq.status || (avail === 0 ? 'Habis' : 'Tersedia'),
        };
      });

      const cachedPhotos = JSON.parse(localStorage.getItem('silentara_loan_photos') || '{}');
      
      const enrichedLoans = (data.loans && data.loans.length > 0 ? data.loans : INITIAL_LOANS).map((loan) => {
        const id = loan.id || loan.id_tiket || '';
        const photo = loan.photoUrl || loan.link_foto_drive || cachedPhotos[id] || '';
        const rawEquip = String(loan.equipmentName || loan.nama_barang || loan.peralatan_dipinjam || '');

        let parsedQty = Number(loan.qty || loan.jumlah || 0);
        let cleanEquipName = rawEquip;

        const matchQty = rawEquip.match(/\((\d+)\s*Unit\)/i);
        if (matchQty) {
          if (!parsedQty) parsedQty = parseInt(matchQty[1]);
          cleanEquipName = rawEquip.replace(/\(\d+\s*Unit\)/i, '').trim();
        }
        if (!parsedQty) parsedQty = 1;

        let eqId = loan.equipmentId || loan.nomor_barang || '';
        if (!eqId && cleanEquipName) {
          const found = currentEqList.find(
            (e) => e.name?.trim().toLowerCase() === cleanEquipName.trim().toLowerCase()
          );
          if (found) eqId = found.id;
        }

        return {
          ...loan,
          id: id,
          equipmentId: eqId,
          equipmentName: rawEquip,
          cleanEquipmentName: cleanEquipName,
          qty: parsedQty,
          photoUrl: photo,
        };
      });

      const enrichedMaintenance = (data.maintenance && data.maintenance.length > 0 ? data.maintenance : INITIAL_MAINTENANCE).map((m) => {
        return {
          ...m,
          id: m.id || m.id_pemeliharaan || '',
          equipmentId: m.equipmentId || m.nomor_barang || '',
          equipmentName: m.equipmentName || m.nama_barang || '',
          qty: Number(m.qty || m.jumlah || m.jumlah_rusak || 1),
          maintenanceDate: m.maintenanceDate || m.tgl_servis || '',
          type: m.type || m.jenis_perawatan || 'Perbaikan Kerusakan',
          notes: m.notes || m.catatan_kerusakan || m.issue || '',
          technician: m.technician || m.teknisi || '',
          cost: Number(m.cost || m.biaya || 0),
          status: m.status || 'Sedang Berjalan'
        };
      });

      setEquipmentList(currentEqList);
      setLoans(enrichedLoans);
      setMaintenanceList(enrichedMaintenance);
      setIsOnline(true);
      setSyncError(null);
    } catch (err) {
      console.warn('⚠️ Gagal mengambil data dari Spreadsheet, menggunakan data fallback:', err.message);
      setIsOnline(false);
      setSyncError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data saat pertama kali mount + Auto Refresh berkala & saat tab aktif
  useEffect(() => {
    loadDataFromSpreadsheet();

    // Auto-refresh data dari spreadsheet setiap 20 detik agar data dari HP otomatis muncul di laptop/admin
    const intervalId = setInterval(() => {
      loadDataFromSpreadsheet();
    }, 20000);

    // Refresh otomatis saat pengguna membuka kembali tab browser
    const handleFocus = () => {
      loadDataFromSpreadsheet();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadDataFromSpreadsheet]);

  // Handle Admin Login
  const handleAdminLogin = (profile) => {
    setIsAdminLoggedIn(true);
    setAdminUser(profile);
    localStorage.setItem('silentara_admin_logged', 'true');
    localStorage.setItem('silentara_admin_user', JSON.stringify(profile));

    showToast(
      'Notifikasi Keamanan Terkirim ke Gmail HP',
      `Pemberitahuan aktivitas masuk dikirim ke ${profile.email} (${new Date().toLocaleTimeString('id-ID')})`,
      'info'
    );
  };

  // Handle Admin Logout
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminUser(null);
    localStorage.removeItem('silentara_admin_logged');
    localStorage.removeItem('silentara_admin_user');
    setActivePortal('user');
  };

  // 1. Submit Peminjaman dari User Form (Diperbarui dengan deteksi key multi-variasi agar stok langsung berkurang)
  const handleBorrowSubmit = async (newLoan) => {
    // Simpan foto ke cache lokal agar tidak pernah hilang saat refresh
    if (newLoan.photoUrl && newLoan.id) {
      try {
        const currentPhotos = JSON.parse(localStorage.getItem('silentara_loan_photos') || '{}');
        currentPhotos[newLoan.id] = newLoan.photoUrl;
        localStorage.setItem('silentara_loan_photos', JSON.stringify(currentPhotos));
      } catch (err) {
        console.warn('Gagal menyimpan foto ke localStorage:', err);
      }
    }

    // Tambahkan ke daftar loans
    setLoans((prev) => [newLoan, ...prev]);
    
    // Perbarui stok peralatan secara lokal
    setEquipmentList((prev) =>
      prev.map((eq) => {
        // Cocokkan berbagai variasi properti ID yang mungkin dipakai item
        if (eq.id === newLoan.equipmentId || eq.equipmentId === newLoan.equipmentId) {
          const borrowQty = parseInt(newLoan.qty) || 1;
          
          // Deteksi semua kemungkinan nama properti stok yang ada di data Anda
          const currentStock = Number(
            eq.availableQty ?? 
            eq.available ?? 
            eq.kuantitas_tersedia ?? 
            eq.stock ?? 
            eq.stok ?? 
            eq.jumlah ?? 
            eq.qty ?? 
            0
          );
          
          const newAvailable = Math.max(0, currentStock - borrowQty);

          return {
            ...eq,
            availableQty: newAvailable,
            available: newAvailable,
            kuantitas_tersedia: newAvailable,
            stock: newAvailable,
            stok: newAvailable,
            status: newAvailable === 0 ? 'Habis' : eq.status,
          };
        }
        return eq;
      })
    );

    // Tampilkan modal sukses
    setSuccessModalData(newLoan);

    // Kirim sinkronisasi ke Google Apps Script di latar belakang (Spreadsheet, Drive & Notifikasi Gmail)
    try {
      const payload = {
        action: 'addLoan',
        id_peminjaman: newLoan.id,
        id_tiket: newLoan.id,
        id: newLoan.id,
        timestamp: newLoan.timestamp,
        nama_lengkap: newLoan.borrowerName,
        borrowerName: newLoan.borrowerName,
        email: newLoan.email,
        email_aktif: newLoan.email,
        kejuruan: newLoan.kejuruan,
        nomor_barang: newLoan.equipmentId,
        equipmentId: newLoan.equipmentId,
        nama_barang: newLoan.equipmentName,
        equipmentName: newLoan.equipmentName,
        peralatan_dipinjam: `${newLoan.equipmentName} (${newLoan.qty} Unit)`,
        jumlah: newLoan.qty,
        qty: newLoan.qty,
        tgl_pinjam: newLoan.borrowDate,
        tanggal_peminjaman: newLoan.borrowDate,
        borrowDate: newLoan.borrowDate,
        tgl_kembali: newLoan.returnDate,
        tanggal_pengembalian: newLoan.returnDate,
        returnDate: newLoan.returnDate,
        foto_wajah: newLoan.photoUrl || '',
        photoUrl: newLoan.photoUrl || '',
        status: 'Dipinjam',
      };

      const result = await apiCallHelper('addLoan', payload);
      if (result && result.emailSent) {
        showToast('Notifikasi Gmail Terkirim ✉️', `Bukti peminjaman telah dikirim ke ${newLoan.email}`, 'success');
      } else if (result && result.success) {
        showToast('Tersimpan di Sheets ✅', 'Data peminjaman berhasil disimpan', 'success');
      }
    } catch (err) {
      console.warn('Gagal sync ke Google Apps Script:', err);
    }
  };

  // 2. Tambah Peralatan Baru oleh Admin
  const handleAddEquipment = async (newEquipment) => {
    setIsSaving(true);
    try {
      setEquipmentList((prev) => [newEquipment, ...prev]);

      if (isOnline) {
        await apiCallHelper('addEquipment', newEquipment);
        showToast('Berhasil ✅', `Peralatan "${newEquipment.name}" berhasil disimpan ke Google Sheets`, 'success');
      }
    } catch (err) {
      console.error('Gagal menambah peralatan:', err);
      showToast('Peringatan', 'Tersimpan lokal, gagal sync: ' + err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Update Peralatan oleh Admin
  const handleUpdateEquipment = async (updatedEquipment) => {
    setIsSaving(true);
    try {
      setEquipmentList((prev) =>
        prev.map((eq) => (eq.id === updatedEquipment.id ? updatedEquipment : eq))
      );

      if (isOnline) {
        await apiCallHelper('updateEquipment', updatedEquipment);
        showToast('Berhasil ✅', 'Data peralatan berhasil diperbarui di Spreadsheet', 'success');
      }
    } catch (err) {
      console.error('Gagal update peralatan:', err);
      showToast('Peringatan', 'Tersimpan lokal, gagal sync: ' + err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // 3.5. Hapus Peralatan oleh Admin
  const handleDeleteEquipment = async (equipmentId) => {
    setIsSaving(true);
    try {
      setEquipmentList((prev) => prev.filter((eq) => eq.id !== equipmentId));

      if (isOnline) {
        await apiCallHelper('deleteEquipment', { id: equipmentId, nomor_barang: equipmentId });
        showToast('Berhasil ✅', 'Peralatan berhasil dihapus dari Spreadsheet', 'success');
      }
    } catch (err) {
      console.error('Gagal menghapus peralatan:', err);
      showToast('Peringatan', 'Terhapus lokal, gagal sync ke Spreadsheet: ' + err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Konfirmasi Pengembalian Barang oleh Admin
  const handleReturnEquipment = async (loanId, equipmentId, qty) => {
    setIsSaving(true);
    try {
      setLoans((prev) =>
        prev.map((l) =>
          l.id === loanId
            ? {
                ...l,
                status: 'Dikembalikan',
                actualReturnDate: new Date().toISOString().split('T')[0],
              }
            : l
        )
      );

      setEquipmentList((prev) =>
        prev.map((eq) => {
          if (eq.id === equipmentId) {
            const returnQty = parseInt(qty) || 1;
            const currentStock = Number(eq.availableQty ?? eq.available ?? eq.kuantitas_tersedia ?? eq.stock ?? eq.stok ?? 0);
            const totalLimit = Number(eq.totalQty ?? eq.total ?? currentStock + returnQty);
            const newAvailable = Math.min(totalLimit, currentStock + returnQty);

            return {
              ...eq,
              availableQty: newAvailable,
              available: newAvailable,
              kuantitas_tersedia: newAvailable,
              stock: newAvailable,
              stok: newAvailable,
              status: eq.status === 'Dalam Pemeliharaan' ? eq.status : 'Tersedia',
            };
          }
          return eq;
        })
      );

      const targetLoan = loans.find((l) => l.id === loanId);

      if (isOnline) {
        await apiCallHelper('returnLoan', {
          id: loanId,
          id_peminjaman: loanId,
          id_tiket: loanId,
          loanId: loanId,
          borrowerName: targetLoan?.borrowerName || '',
          equipmentId: equipmentId,
          nomor_barang: equipmentId,
          qty: qty,
          jumlah: qty,
        });
        showToast('Berhasil ✅', 'Pengembalian dikonfirmasi dan tersimpan di Spreadsheet', 'success');
      }
    } catch (err) {
      console.error('Gagal konfirmasi pengembalian:', err);
      showToast('Peringatan', 'Tersimpan lokal, gagal sync: ' + err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Catat Pemeliharaan oleh Admin
  const handleAddMaintenance = async (newMaintenance) => {
    setIsSaving(true);
    const qty = Number(newMaintenance.qty || newMaintenance.jumlah || newMaintenance.jumlah_rusak || 1);

    try {
      setMaintenanceList((prev) => [newMaintenance, ...prev]);
      
      // Kurangi stok kuantitas tersedia di inventaris lokal
      setEquipmentList((prev) =>
        prev.map((eq) => {
          if (eq.id === newMaintenance.equipmentId || eq.equipmentId === newMaintenance.equipmentId) {
            const currentStock = Number(
              eq.availableQty ?? 
              eq.available ?? 
              eq.kuantitas_tersedia ?? 
              eq.stock ?? 
              eq.stok ?? 
              eq.qty ?? 
              0
            );
            const newAvailable = Math.max(0, currentStock - qty);
            return {
              ...eq,
              availableQty: newAvailable,
              available: newAvailable,
              kuantitas_tersedia: newAvailable,
              qty: newAvailable,
              stock: newAvailable,
              stok: newAvailable,
              status: newAvailable === 0 ? 'Dalam Pemeliharaan' : eq.status,
            };
          }
          return eq;
        })
      );

      if (isOnline) {
        const payload = {
          action: 'addMaintenance',
          id: newMaintenance.id,
          id_pemeliharaan: newMaintenance.id,
          equipmentId: newMaintenance.equipmentId,
          nomor_barang: newMaintenance.equipmentId,
          equipmentName: newMaintenance.equipmentName,
          nama_barang: newMaintenance.equipmentName,
          qty: qty,
          jumlah: qty,
          jumlah_rusak: qty,
          maintenanceDate: newMaintenance.maintenanceDate,
          tgl_servis: newMaintenance.maintenanceDate,
          type: newMaintenance.type,
          jenis_perawatan: newMaintenance.type,
          notes: newMaintenance.notes,
          catatan_kerusakan: newMaintenance.notes,
          technician: newMaintenance.technician,
          teknisi: newMaintenance.technician,
          cost: newMaintenance.cost,
          biaya: newMaintenance.cost,
          status: 'Sedang Berjalan'
        };
        await apiCallHelper('addMaintenance', payload);
        showToast('Berhasil ✅', `Catatan pemeliharaan (${qty} unit) tersimpan di Spreadsheet`, 'success');
      }
    } catch (err) {
      console.error('Gagal catat pemeliharaan:', err);
      showToast('Peringatan', 'Tersimpan lokal, gagal sync: ' + err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Selesaikan Pemeliharaan oleh Admin
  const handleCompleteMaintenance = async (maintenanceId, equipmentId, unitQty) => {
    setIsSaving(true);
    const targetMt = maintenanceList.find((m) => m.id === maintenanceId);
    const qty = Number(unitQty || targetMt?.qty || targetMt?.jumlah || targetMt?.jumlah_rusak || 1);

    try {
      setMaintenanceList((prev) =>
        prev.map((m) =>
          m.id === maintenanceId ? { ...m, status: 'Selesai' } : m
        )
      );

      // Kembalikan stok kuantitas tersedia di inventaris lokal
      setEquipmentList((prev) =>
        prev.map((eq) => {
          if (eq.id === equipmentId || eq.equipmentId === equipmentId) {
            const currentStock = Number(
              eq.availableQty ?? 
              eq.available ?? 
              eq.kuantitas_tersedia ?? 
              eq.stock ?? 
              eq.stok ?? 
              eq.qty ?? 
              0
            );
            const totalStock = Number(eq.totalQty ?? eq.kuantitas_total ?? currentStock + qty);
            const newAvailable = Math.min(totalStock, currentStock + qty);

            return {
              ...eq,
              availableQty: newAvailable,
              available: newAvailable,
              kuantitas_tersedia: newAvailable,
              qty: newAvailable,
              stock: newAvailable,
              stok: newAvailable,
              status: 'Tersedia',
            };
          }
          return eq;
        })
      );

      if (isOnline) {
        await apiCallHelper('completeMaintenance', {
          id: maintenanceId,
          id_pemeliharaan: maintenanceId,
          maintenanceId: maintenanceId,
          equipmentId: equipmentId,
          nomor_barang: equipmentId,
          qty: qty,
          jumlah: qty,
          jumlah_rusak: qty,
        });
        showToast('Berhasil ✅', `Pemeliharaan selesai, ${qty} unit telah kembali siap digunakan`, 'success');
      }
    } catch (err) {
      console.error('Gagal selesaikan pemeliharaan:', err);
      showToast('Peringatan', 'Tersimpan lokal, gagal sync: ' + err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {notificationToast && (
        <div className={`fixed top-20 right-4 z-50 max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-slide-in ${
          notificationToast.type === 'success' 
            ? 'bg-emerald-900 text-white border-emerald-700' 
            : notificationToast.type === 'warning'
            ? 'bg-amber-900 text-white border-amber-700'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            notificationToast.type === 'success' 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : notificationToast.type === 'warning'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-white flex items-center justify-between">
              <span>{notificationToast.title}</span>
            </p>
            <p className="text-slate-300 text-[11px] mt-0.5">
              {notificationToast.message}
            </p>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-blue-200">
          <div className="h-full bg-blue-600 animate-pulse" style={{ width: '100%' }} />
        </div>
      )}

      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        loanCount={(loans || []).filter((l) => l && (l.status === 'Dipinjam' || l.status === 'Terlambat')).length}
        equipmentCount={(equipmentList || []).length}
        isAdminLoggedIn={isAdminLoggedIn}
        adminUser={adminUser}
        onAdminLogout={handleAdminLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full animate-pulse ${activePortal === 'user' ? 'bg-blue-500' : 'bg-indigo-600'}`} />
            <div>
              <p className="text-xs font-bold text-slate-800">
                Mode Aktif: {activePortal === 'user' ? 'Portal Peminjaman' : 'Portal Admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${
              isLoading ? 'bg-slate-50 text-slate-500 border-slate-250' : isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
            }`}>
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isLoading ? 'Memuat...' : isOnline ? 'Spreadsheet Online' : 'Mode Offline'}</span>
            </div>

            <button
              onClick={loadDataFromSpreadsheet}
              disabled={isLoading}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setActivePortal(activePortal === 'user' ? 'admin' : 'user')}
              className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition"
            >
              Beralih ke {activePortal === 'user' ? 'Portal Admin' : 'Portal Peminjam'} →
            </button>
          </div>
        </div>

        {syncError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span><b>Catatan Error:</b> Pastikan deployment Google Apps Script Anda menggunakan opsi akses <i>"Anyone" (Siapa saja)</i> agar tidak terblokir CORS.</span>
          </div>
        )}

        <ErrorBoundary>
          {activePortal === 'user' ? (
            <div className="max-w-3xl mx-auto">
              <BorrowForm equipmentList={equipmentList || []} onBorrowSubmit={handleBorrowSubmit} />
            </div>
          ) : !isAdminLoggedIn ? (
            <AdminLogin onLoginSuccess={handleAdminLogin} onBackToUserPortal={() => setActivePortal('user')} />
          ) : (
            <AdminDashboard
              equipmentList={equipmentList || []}
              loans={loans || []}
              maintenanceList={maintenanceList || []}
              onAddEquipment={handleAddEquipment}
              onUpdateEquipment={handleUpdateEquipment}
              onDeleteEquipment={handleDeleteEquipment}
              onReturnEquipment={handleReturnEquipment}
              onAddMaintenance={handleAddMaintenance}
              onCompleteMaintenance={handleCompleteMaintenance}
              isOnline={isOnline}
              isLoading={isLoading}
              isSaving={isSaving}
              syncError={syncError}
              onRefresh={loadDataFromSpreadsheet}
            />
          )}
        </ErrorBoundary>
      </main>

      {successModalData && (
        <BorrowSuccessModal loanData={successModalData} onClose={() => setSuccessModalData(null)} />
      )}
    </div>
  );
}