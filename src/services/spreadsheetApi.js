/**
 * =============================================
 * API Service Layer — Koneksi ke Google Sheets
 * =============================================
 *
 * Modul ini menangani semua komunikasi antara frontend
 * dan backend Google Apps Script Web App.
 *
 * Semua fungsi POST menggunakan fetch dengan redirect: 'follow'
 * agar kompatibel dengan redirect 302 dari Apps Script.
 */

// URL endpoint Apps Script Web App
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9djqCIMDyG68WTzankoFmcWRn5pdnpMvUSQ8MP2-On1-WXRDzc_s127DJOMmYjju0TA/exec";

// ============================================
// HELPER: Kirim POST request ke Apps Script
// ============================================
async function postToAppsScript(payload) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Operasi gagal di server');
  }

  return result;
}

// ============================================
// MAPPER: Backend (snake_case ID) → Frontend (camelCase EN)
// ============================================

function mapEquipmentFromBackend(item) {
  return {
    id: item.nomor_barang || item.id || '',
    name: item.nama_barang || item.name || '',
    category: item.kategori || item.category || 'Umum',
    totalQty: Number(item.kuantitas_total ?? item.totalQty) || 0,
    availableQty: Number(item.kuantitas_tersedia ?? item.availableQty) || 0,
    status: item.status || 'Tersedia',
    location: item.lokasi || item.location || '',
    description: item.deskripsi || item.description || '',
  };
}

function mapLoanFromBackend(item) {
  return {
    id: item.id_peminjaman || item.id || item.id_tiket || '',
    timestamp: item.timestamp || '',
    borrowerName: item.nama_lengkap || item.borrowerName || '',
    email: item.email || item.email_aktif || '',
    kejuruan: item.kejuruan || '',
    equipmentId: item.nomor_barang || item.equipmentId || '',
    equipmentName: item.nama_barang || item.peralatan_dipinjam || item.equipmentName || '',
    qty: Number(item.jumlah ?? item.qty) || 1,
    borrowDate: item.tgl_pinjam || item.borrowDate || '',
    returnDate: item.tgl_kembali || item.returnDate || '',
    actualReturnDate: item.tgl_kembali_aktual || item.actualReturnDate || null,
    status: item.status || 'Dipinjam',
    photoUrl: item.link_foto_drive || item.photoUrl || '',
    driveFileId: item.file_id_drive || item.driveFileId || '',
  };
}

function mapMaintenanceFromBackend(item) {
  return {
    id: item.id_pemeliharaan || item.id || '',
    equipmentId: item.nomor_barang || item.equipmentId || '',
    equipmentName: item.nama_barang || item.equipmentName || '',
    qty: Number(item.jumlah_rusak ?? item.jumlah ?? item.qty) || 1,
    maintenanceDate: item.tgl_servis || item.maintenanceDate || '',
    type: item.jenis_perawatan || item.type || 'Perbaikan Kerusakan',
    notes: item.catatan_kerusakan || item.notes || item.issue || '',
    technician: item.teknisi || item.technician || '',
    status: item.status || 'Sedang Berjalan',
    cost: Number(item.biaya ?? item.cost) || 0,
  };
}

// ============================================
// MAPPER: Frontend → Backend
// ============================================

function mapEquipmentToBackend(item) {
  return {
    nomor_barang: item.id,
    nama_barang: item.name,
    kategori: item.category,
    kuantitas_total: item.totalQty,
    kuantitas_tersedia: item.availableQty,
    status: item.status,
    lokasi: item.location,
    deskripsi: item.description || '',
  };
}

function mapLoanToBackend(item) {
  return {
    id_peminjaman: item.id,
    timestamp: item.timestamp,
    nama_lengkap: item.borrowerName,
    email: item.email,
    kejuruan: item.kejuruan,
    nomor_barang: item.equipmentId,
    nama_barang: item.equipmentName,
    jumlah: item.qty || 1,
    tgl_pinjam: item.borrowDate,
    tgl_kembali: item.returnDate,
    status: item.status || 'Dipinjam',
    link_foto_drive: item.photoUrl || '',
    file_id_drive: item.driveFileId || '',
  };
}

function mapMaintenanceToBackend(item) {
  return {
    id_pemeliharaan: item.id,
    nomor_barang: item.equipmentId,
    nama_barang: item.equipmentName,
    jumlah_rusak: item.qty || 1,
    jumlah: item.qty || 1,
    qty: item.qty || 1,
    tgl_servis: item.maintenanceDate,
    jenis_perawatan: item.type,
    catatan_kerusakan: item.notes || '',
    teknisi: item.technician || '',
    biaya: item.cost || 0,
    status: item.status || 'Sedang Berjalan',
  };
}

// ============================================
// API FUNCTIONS — GET (Baca Data)
// ============================================

/**
 * Ambil semua data (peralatan, peminjaman, pemeliharaan) sekaligus.
 * Mengembalikan objek dengan 3 array dalam format frontend.
 */
export async function fetchAllData() {
  const response = await fetch(`${APPS_SCRIPT_URL}?action=getAll`);

  if (!response.ok) {
    throw new Error(`Gagal mengambil data: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Gagal mengambil data dari spreadsheet');
  }

  return {
    equipment: (result.equipment || []).map(mapEquipmentFromBackend),
    loans: (result.loans || []).map(mapLoanFromBackend),
    maintenance: (result.maintenance || []).map(mapMaintenanceFromBackend),
  };
}

// ============================================
// API FUNCTIONS — POST (Tulis Data)
// ============================================

/** Tambah peralatan baru ke spreadsheet */
export async function apiAddEquipment(data) {
  return postToAppsScript({
    action: 'addEquipment',
    ...mapEquipmentToBackend(data),
  });
}

/** Update data peralatan yang sudah ada */
export async function apiUpdateEquipment(data) {
  return postToAppsScript({
    action: 'updateEquipment',
    ...mapEquipmentToBackend(data),
  });
}

/** Tambah peminjaman baru */
export async function apiAddLoan(data) {
  return postToAppsScript({
    action: 'addLoan',
    ...mapLoanToBackend(data),
  });
}

/** Konfirmasi pengembalian barang */
export async function apiReturnLoan(loanId, equipmentId, qty) {
  return postToAppsScript({
    action: 'returnLoan',
    id_peminjaman: loanId,
    nomor_barang: equipmentId,
    jumlah: qty,
  });
}

/** Catat pemeliharaan peralatan */
export async function apiAddMaintenance(data) {
  return postToAppsScript({
    action: 'addMaintenance',
    ...mapMaintenanceToBackend(data),
  });
}

/** Selesaikan pemeliharaan */
export async function apiCompleteMaintenance(maintenanceId, equipmentId, qty) {
  return postToAppsScript({
    action: 'completeMaintenance',
    id_pemeliharaan: maintenanceId,
    id: maintenanceId,
    nomor_barang: equipmentId,
    equipmentId: equipmentId,
    jumlah_rusak: qty || 1,
    jumlah: qty || 1,
    qty: qty || 1,
  });
}

// ============================================
// UTILITAS: Test Koneksi
// ============================================

/**
 * Test apakah endpoint Apps Script merespons dengan benar.
 * Mengembalikan { success, message, dataCount }.
 */
export async function testConnection() {
  try {
    const data = await fetchAllData();
    return {
      success: true,
      message: 'Koneksi ke Google Sheets berhasil!',
      dataCount: {
        equipment: data.equipment.length,
        loans: data.loans.length,
        maintenance: data.maintenance.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: `Koneksi gagal: ${err.message}`,
      dataCount: null,
    };
  }
}
