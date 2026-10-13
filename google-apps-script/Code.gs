/**
 * =========================================================================
 * BBPVP BANDUNG - SISTEM PEMINJAMAN PERALATAN & MANAJEMEN INVENTARIS
 * Google Apps Script Backend (Code.gs)
 * =========================================================================
 * 
 * PETUNJUK INSTALASI / PEMBARUAN:
 * 1. Buka Google Sheets database Anda.
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'.
 * 3. Hapus semua kode yang ada di 'Code.gs', lalu tempelkan (paste) seluruh isi file ini.
 * 4. Klik ikon 'Simpan' (Save / Ctrl+S).
 * 5. Klik tombol biru 'Terapkan' (Deploy) di kanan atas -> 'Kelola Penerapan' (Manage deployments).
 * 6. Klik ikon pensil (Edit) pada penerapan Web App aktif.
 * 7. Pilih Versi: 'Baru' (New version), lalu klik 'Terapkan' (Deploy).
 *    (Atau buat 'Penerapan baru' -> Jenis: 'Aplikasi Web' -> Akses: 'Siapa saja / Anyone').
 * 8. Berikan Izin Akses (Authorize Access) jika Google memintanya.
 * =========================================================================
 */

// Konfigurasi Nama Sheet / Tab Database
const SHEET_NAMES = {
  EQUIPMENT: 'PERALATAN',
  LOANS: 'PEMINJAMAN',
  MAINTENANCE: 'PEMELIHARAAN',
};

// Nama Folder di Google Drive untuk menyimpan Foto Wajah Peminjam
const DRIVE_FOLDER_NAME = 'Foto_Peminjam_Alat';

// Helper: Cari sheet tanpa sensitif huruf besar/kecil (misal pemeliharaan vs PEMELIHARAAN)
function getSheetSafe(ss, sheetName) {
  if (!ss) return null;
  const sheets = ss.getSheets();
  const target = String(sheetName || '').trim().toLowerCase();

  // 1. Coba pencarian persis case-insensitive
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().trim().toLowerCase() === target) {
      return sheets[i];
    }
  }

  // 2. Coba pencarian sebagian (substring match)
  for (let i = 0; i < sheets.length; i++) {
    const sName = sheets[i].getName().trim().toLowerCase();
    if (sName.includes(target) || target.includes(sName)) {
      return sheets[i];
    }
  }

  return ss.getSheetByName(sheetName);
}

// =========================================================================
// 1. GET REQUEST HANDLER (BACA DATA)
// =========================================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getAll';

  try {
    if (action === 'getAll') {
      const data = getAllData();
      return createJsonResponse({ success: true, ...data });
    }

    if (action === 'ping' || action === 'test') {
      return createJsonResponse({ success: true, message: 'Google Apps Script Backend Aktif & Terhubung!' });
    }

    return createJsonResponse({ success: false, message: 'Action GET tidak dikenali: ' + action });
  } catch (err) {
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

// =========================================================================
// 2. POST REQUEST HANDLER (TULIS DATA & KIRIM EMAIL)
// =========================================================================
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e.parameter) {
      payload = e.parameter;
    }

    const action = (e.parameter && e.parameter.action) || payload.action || '';

    // A. Tambah Peminjaman & Kirim Notifikasi Email Otomatis ke Gmail
    if (action === 'addLoan' || action === 'tambah_peminjaman') {
      const result = handleAddLoan(payload);
      return createJsonResponse(result);
    }

    // B. Konfirmasi Pengembalian Barang
    if (action === 'returnLoan' || action === 'kembalikan_peminjaman') {
      const result = handleReturnLoan(payload);
      return createJsonResponse(result);
    }

    // C. Tambah Peralatan Baru
    if (action === 'addEquipment') {
      const result = handleAddEquipment(payload);
      return createJsonResponse(result);
    }

    // D. Perbarui Data Peralatan
    if (action === 'updateEquipment') {
      const result = handleUpdateEquipment(payload);
      return createJsonResponse(result);
    }

    // E. Hapus Peralatan
    if (action === 'deleteEquipment') {
      const result = handleDeleteEquipment(payload);
      return createJsonResponse(result);
    }

    // F. Tambah Pemeliharaan Peralatan (Dengan Jumlah Rusak & Pengurangan Stok)
    if (action === 'addMaintenance') {
      const result = handleAddMaintenance(payload);
      return createJsonResponse(result);
    }

    // G. Selesaikan Pemeliharaan (Kembalikan Stok)
    if (action === 'completeMaintenance') {
      const result = handleCompleteMaintenance(payload);
      return createJsonResponse(result);
    }

    // H. Lupa Kata Sandi (Kirim Sandi Baru ke Email Admin)
    if (action === 'forgotPassword') {
      const result = handleForgotPassword(payload);
      return createJsonResponse(result);
    }

    return createJsonResponse({ success: false, message: 'Action POST tidak dikenali: ' + action });
  } catch (err) {
    Logger.log('Error doPost: ' + err.toString());
    return createJsonResponse({ success: false, message: err.toString() });
  }
}

// =========================================================================
// 3. LOGIKA PEMINJAMAN & NOTIFIKASI EMAIL GMAIL
// =========================================================================

function handleAddLoan(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheetsIfNotExist(ss);
  
  const loanSheet = getSheetSafe(ss, SHEET_NAMES.LOANS);
  const equipSheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);

  // Normalisasi data input
  const idLoan = payload.id_peminjaman || payload.id_tiket || payload.id || ('PJ-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMM-') + Math.floor(100 + Math.random() * 900));
  const timestamp = payload.timestamp || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
  const borrowerName = (payload.nama_lengkap || payload.borrowerName || '').toUpperCase();
  const email = (payload.email_aktif || payload.email || '').trim();
  const kejuruan = payload.kejuruan || '';
  const equipmentId = payload.nomor_barang || payload.equipmentId || '';
  const equipmentName = payload.nama_barang || payload.equipmentName || '';
  const qty = parseInt(payload.jumlah || payload.qty || 1);
  const borrowDate = payload.tanggal_peminjaman || payload.tgl_pinjam || payload.borrowDate || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const returnDate = payload.tanggal_pengembalian || payload.tgl_kembali || payload.returnDate || '';
  const photoData = payload.foto_wajah || payload.photoUrl || payload.link_foto_drive || '';
  const status = 'Dipinjam';

  // Format Peralatan Dipinjam
  const peralatanDipinjam = equipmentName + ' (' + qty + ' Unit)';

  // 1. Simpan Foto Wajah ke Google Drive jika berupa data Base64
  let drivePhotoUrl = '';
  let driveFileId = '';

  if (photoData && photoData.indexOf('data:image') === 0) {
    try {
      const folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
      const contentType = photoData.substring(5, photoData.indexOf(';'));
      const base64Data = photoData.substring(photoData.indexOf(',') + 1);
      const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, idLoan + '_' + borrowerName.replace(/\s+/g, '_') + '.jpg');
      const file = folder.createFile(decodedBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      driveFileId = file.getId();
      drivePhotoUrl = 'https://drive.google.com/uc?export=view&id=' + driveFileId;
    } catch (driveErr) {
      Logger.log('Gagal menyimpan foto ke Drive: ' + driveErr.toString());
      drivePhotoUrl = 'Error Simpan Drive: ' + driveErr.message;
    }
  } else if (photoData && photoData.indexOf('http') === 0) {
    drivePhotoUrl = photoData;
  }

  // 2. Simpan Baris ke Tab Sheet PEMINJAMAN
  // Sesuai urutan header di spreadsheet Anda:
  // Kolom A: Timestamp
  // Kolom B: ID Tiket
  // Kolom C: Nama Lengkap
  // Kolom D: Email
  // Kolom E: Kejuruan
  // Kolom F: Peralatan Dipinjam (misal: Komputer (10 Unit))
  // Kolom G: Tgl Pinjam
  // Kolom H: Tgl Kembali
  // Kolom I: Status
  // Kolom J: Link Foto Drive
  // Kolom K: File ID Drive
  loanSheet.appendRow([
    timestamp,
    idLoan,
    borrowerName,
    email,
    kejuruan,
    peralatanDipinjam,
    borrowDate,
    returnDate,
    status,
    drivePhotoUrl,
    driveFileId
  ]);

  // 3. Kurangi Stok Kuantitas Tersedia di Tab PERALATAN
  if (equipSheet && (equipmentId || equipmentName)) {
    updateEquipmentStock(equipSheet, equipmentId || equipmentName, -qty);
  }

  // 4. KIRIM EMAIL NOTIFIKASI OTOMATIS KE GMAIL PEMINJAM
  let emailSent = false;
  let emailError = null;

  if (email && email.indexOf('@') !== -1) {
    try {
      emailSent = sendLoanEmailNotification({
        id: idLoan,
        borrowerName: borrowerName,
        email: email,
        kejuruan: kejuruan,
        equipmentId: equipmentId,
        equipmentName: equipmentName,
        qty: qty,
        borrowDate: borrowDate,
        returnDate: returnDate,
        photoUrl: drivePhotoUrl
      });
    } catch (mailErr) {
      Logger.log('Gagal kirim email: ' + mailErr.toString());
      emailError = mailErr.toString();
    }
  }

  return {
    success: true,
    message: 'Data peminjaman berhasil dicatat ke spreadsheet.',
    id_peminjaman: idLoan,
    drivePhotoUrl: drivePhotoUrl,
    driveFileId: driveFileId,
    emailSent: emailSent,
    emailError: emailError
  };
}

/**
 * Mengirim email konfirmasi peminjaman dengan template HTML profesional
 */
function sendLoanEmailNotification(data) {
  const subject = '📋 [BUKTI PEMINJAMAN] ' + data.equipmentName + ' (' + data.id + ') - BBPVP Bandung';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
      
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 0.5px;">BBPVP BANDUNG</h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">Sistem Manajemen Peminjaman Peralatan & Inventaris</p>
      </div>

      <!-- Badge Konfirmasi -->
      <div style="padding: 24px 24px 0 24px;">
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 14px 18px; text-align: center;">
          <h2 style="margin: 0; color: #065f46; font-size: 16px; font-weight: 800;">✅ Pengajuan Peminjaman Telah Diterima</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857;">Email ini adalah bukti resmi verifikasi peminjaman barang Anda.</p>
        </div>
      </div>

      <!-- Body Konten -->
      <div style="padding: 20px 24px 24px 24px;">
        <p style="font-size: 14px; color: #334155; margin-top: 0;">Halo <b>${data.borrowerName}</b>,</p>
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 20px;">
          Terima kasih telah mengisi formulir peminjaman peralatan. Data Anda telah diverifikasi dan tersimpan secara otomatis di basis data inventaris kami.
        </p>

        <!-- Tabel Detail Peminjaman -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 20px;">
          <div style="background-color: #f1f5f9; padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Rincian Transaksi Peminjaman</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 16px; color: #64748b; width: 42%;">ID Peminjaman / Tiket</td>
              <td style="padding: 10px 16px; font-weight: 800; color: #1e40af; font-family: monospace; font-size: 14px;">${data.id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 16px; color: #64748b;">Nama Peminjam</td>
              <td style="padding: 10px 16px; font-weight: 700; color: #0f172a;">${data.borrowerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 16px; color: #64748b;">Kejuruan / Jurusan</td>
              <td style="padding: 10px 16px; font-weight: 600; color: #334155;">${data.kejuruan}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 16px; color: #64748b;">Peralatan Dipinjam</td>
              <td style="padding: 10px 16px; font-weight: 800; color: #0f172a;">
                ${data.equipmentName} <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700; margin-left: 4px;">${data.qty} Unit</span>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 16px; color: #64748b;">Tanggal Peminjaman</td>
              <td style="padding: 10px 16px; font-weight: 600; color: #334155;">${data.borrowDate}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fef2f2;">
              <td style="padding: 10px 16px; color: #991b1b; font-weight: 700;">Batas Waktu Pengembalian</td>
              <td style="padding: 10px 16px; font-weight: 900; color: #dc2626; font-size: 14px;">${data.returnDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #64748b;">Status Saat Ini</td>
              <td style="padding: 10px 16px;">
                <span style="background-color: #fef3c7; color: #92400e; font-weight: 800; padding: 4px 10px; border-radius: 6px; font-size: 11px; border: 1px solid #fde68a;">Dipinjam</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Ketentuan & Peringatan -->
        <div style="background-color: #fffbeb; border: 1px solid #fef08a; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            ⚠️ Ketentuan & Kewajiban Peminjam:
          </h4>
          <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #78350f; line-height: 1.5;">
            <li>Wajib mengembalikan peralatan sebelum atau paling lambat pada tanggal <b>${data.returnDate}</b>.</li>
            <li>Peralatan harus dikembalikan dalam keadaan bersih, lengkap, dan berfungsi normal.</li>
            <li>Segala bentuk kerusakan atau kehilangan menjadi tanggung jawab peminjam.</li>
            <li>Tunjukkan email ini atau ID Tiket <b>(${data.id})</b> saat proses pengembalian kepada petugas bengkel/lab.</li>
          </ul>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
          Terima kasih atas kerja samanya dalam merawat peralatan dan fasilitas pelatihan BBPVP Bandung.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; color: #94a3b8; font-size: 11px;">
        <p style="margin: 0; font-weight: 700; color: #475569;">Balai Besar Pelatihan Vokasi dan Produktivitas (BBPVP) Bandung</p>
        <p style="margin: 4px 0 0 0; color: #64748b;">Kementerian Ketenagakerjaan Republik Indonesia</p>
        <p style="margin: 4px 0 0 0; color: #94a3b8;">Jl. Gatot Subroto No.170, Bandung, Jawa Barat</p>
        <p style="margin: 8px 0 0 0; font-size: 10px; color: #cbd5e1;">(Pesan dibuat secara otomatis oleh sistem, mohon tidak membalas email ini)</p>
      </div>

    </div>
  `;

  try {
    MailApp.sendEmail({
      to: data.email,
      subject: subject,
      htmlBody: htmlBody
    });
    return true;
  } catch (err1) {
    Logger.log('MailApp gagal, fallback ke GmailApp: ' + err1.toString());
    try {
      GmailApp.sendEmail(data.email, subject, '', {
        htmlBody: htmlBody,
        name: 'Inventaris BBPVP Bandung'
      });
      return true;
    } catch (err2) {
      Logger.log('GmailApp juga gagal: ' + err2.toString());
      throw err2;
    }
  }
}

// =========================================================================
// 4. LOGIKA PENGEMBALIAN & MANAJEMEN INVENTARIS
// =========================================================================

function handleReturnLoan(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const loanSheet = getSheetSafe(ss, SHEET_NAMES.LOANS);
  const equipSheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);

  const rawId = String(payload.id_peminjaman || payload.id_tiket || payload.loanId || payload.id || '').trim();
  const targetId = rawId.toLowerCase().replace(/\s+/g, '');
  const borrowerName = String(payload.borrowerName || payload.nama_lengkap || '').trim().toLowerCase();
  const equipmentId = payload.nomor_barang || payload.equipmentId || '';
  const qty = parseInt(payload.jumlah || payload.qty || 1);

  if (!loanSheet) throw new Error('Sheet PEMINJAMAN tidak ditemukan');

  const rows = loanSheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: false, message: 'Data peminjaman kosong' };

  // 1. Cari indeks kolom Status
  let statusColIndex = 9; // Default Kolom I
  const headers = rows[0];
  for (let c = 0; c < headers.length; c++) {
    const h = String(headers[c] || '').trim().toLowerCase();
    if (h === 'status' || h.includes('status')) {
      statusColIndex = c + 1;
      break;
    }
  }

  // 2. Cari baris peminjaman berdasarkan ID Tiket (Kolom B atau Kolom A) atau Nama
  let updated = false;
  for (let i = 1; i < rows.length; i++) {
    const colA = String(rows[i][0] || '').trim().toLowerCase().replace(/\s+/g, '');
    const colB = String(rows[i][1] || '').trim().toLowerCase().replace(/\s+/g, '');
    const colC = String(rows[i][2] || '').trim().toLowerCase();

    // Cocokkan ID Tiket di kolom B, atau kolom A, atau nama
    const matchId = targetId && (
      colB === targetId || 
      colA === targetId || 
      colB.includes(targetId) || 
      targetId.includes(colB) ||
      colA.includes(targetId) ||
      targetId.includes(colA)
    );
    const matchName = borrowerName && (colC === borrowerName || colC.includes(borrowerName));

    if (matchId || matchName) {
      loanSheet.getRange(i + 1, statusColIndex).setValue('Dikembalikan');
      updated = true;
      break;
    }
  }

  // 3. Kembalikan stok peralatan jika ditemukan
  if (equipSheet && (equipmentId || payload.nama_barang || payload.equipmentName)) {
    updateEquipmentStock(equipSheet, equipmentId || payload.nama_barang || payload.equipmentName, qty);
  }

  return { 
    success: true, 
    message: updated ? 'Status peminjaman berhasil diubah menjadi Dikembalikan di Spreadsheet.' : 'Data ditemukan namun baris tidak cocok.', 
    loanId: rawId, 
    updated: updated 
  };
}

function handleAddEquipment(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheetsIfNotExist(ss);
  const sheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);

  const newId = payload.nomor_barang || payload.id || ('EQ-' + String(sheet.getLastRow()).padStart(3, '0'));
  sheet.appendRow([
    newId,
    payload.nama_barang || payload.name || '',
    payload.kategori || payload.category || 'Umum',
    Number(payload.kuantitas_total || payload.totalQty || 1),
    Number(payload.kuantitas_tersedia || payload.availableQty || 1),
    payload.status || 'Tersedia',
    payload.lokasi || payload.location || '',
    payload.deskripsi || payload.description || payload.note || ''
  ]);

  return { success: true, message: 'Peralatan berhasil ditambahkan.', id: newId };
}

function handleUpdateEquipment(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);
  if (!sheet) throw new Error('Sheet PERALATAN tidak ditemukan');

  const targetId = String(payload.nomor_barang || payload.id);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === targetId) {
      sheet.getRange(i + 1, 2).setValue(payload.nama_barang || payload.name || rows[i][1]);
      sheet.getRange(i + 1, 3).setValue(payload.kategori || payload.category || rows[i][2]);
      sheet.getRange(i + 1, 4).setValue(Number(payload.kuantitas_total || payload.totalQty || rows[i][3]));
      sheet.getRange(i + 1, 5).setValue(Number(payload.kuantitas_tersedia || payload.availableQty || rows[i][4]));
      sheet.getRange(i + 1, 6).setValue(payload.status || rows[i][5]);
      sheet.getRange(i + 1, 7).setValue(payload.lokasi || payload.location || rows[i][6]);
      sheet.getRange(i + 1, 8).setValue(payload.deskripsi || payload.description || payload.note || rows[i][7]);
      return { success: true, message: 'Peralatan berhasil diperbarui.' };
    }
  }

  return { success: false, message: 'Peralatan dengan ID ' + targetId + ' tidak ditemukan.' };
}

function handleDeleteEquipment(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);
  if (!sheet) throw new Error('Sheet PERALATAN tidak ditemukan');

  const targetId = String(payload.nomor_barang || payload.id);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === targetId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Peralatan berhasil dihapus.' };
    }
  }

  return { success: false, message: 'Peralatan dengan ID ' + targetId + ' tidak ditemukan.' };
}

// =========================================================================
// 4.1 LOGIKA PEMELIHARAAN (DENGAN JUMLAH RUSAK & AUTO PENGURANGAN STOK)
// =========================================================================

function handleAddMaintenance(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheetsIfNotExist(ss);
  const sheet = getSheetSafe(ss, SHEET_NAMES.MAINTENANCE);
  const equipSheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);

  if (!sheet) throw new Error('Sheet PEMELIHARAAN tidak ditemukan');

  const id = payload.id_pemeliharaan || payload.id || ('MT-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMM-') + Math.floor(10 + Math.random() * 90));
  const eqId = payload.nomor_barang || payload.equipmentId || '';
  const eqName = payload.nama_barang || payload.equipmentName || '';
  const qty = parseInt(payload.jumlah_rusak || payload.jumlah || payload.qty || 1);
  const maintDate = payload.tgl_servis || payload.maintenanceDate || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const type = payload.jenis_perawatan || payload.type || 'Perbaikan Kerusakan';
  const notes = payload.catatan_kerusakan || payload.notes || payload.issue || '';
  const technician = payload.teknisi || payload.technician || 'Petugas Lab';
  const cost = Number(payload.biaya || payload.cost || 0);
  const status = payload.status || 'Sedang Berjalan';

  // Periksa apakah sheet kosong / belum ada header
  const rows = sheet.getDataRange().getValues();
  if (rows.length === 0) {
    sheet.appendRow(['id_pemeliharaan', 'nomor_barang', 'nama_barang', 'jumlah_rusak', 'tgl_servis', 'jenis_perawatan', 'catatan_kerusakan', 'teknisi', 'biaya', 'status']);
  }

  // Tulis baris baru ke sheet PEMELIHARAAN
  sheet.appendRow([
    id,
    eqId,
    eqName,
    qty,
    maintDate,
    type,
    notes,
    technician,
    cost,
    status
  ]);

  // Kurangi stok kuantitas tersedia di tab PERALATAN sebesar unit yang rusak
  if (equipSheet && (eqId || eqName)) {
    updateEquipmentStock(equipSheet, eqId || eqName, -qty);
  }

  return { 
    success: true, 
    message: 'Data pemeliharaan (' + qty + ' unit) berhasil dicatat ke spreadsheet.',
    id: id,
    qty: qty
  };
}

function handleCompleteMaintenance(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheetSafe(ss, SHEET_NAMES.MAINTENANCE);
  const equipSheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);

  const mtId = String(payload.id_pemeliharaan || payload.id || payload.maintenanceId || '').trim().toLowerCase();
  const eqId = payload.nomor_barang || payload.equipmentId || '';
  let qty = parseInt(payload.jumlah_rusak || payload.jumlah || payload.qty || 0);

  let updated = false;

  if (sheet) {
    const rows = sheet.getDataRange().getValues();
    if (rows.length > 1) {
      const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
      
      let colId = 0;
      let colStatus = rows[0].length - 1;
      let colQty = -1;

      for (let c = 0; c < headers.length; c++) {
        const h = headers[c];
        if (h === 'id' || h === 'id_pemeliharaan' || h.includes('id_pemeliharaan')) colId = c;
        else if (h.includes('status')) colStatus = c;
        else if (h.includes('jumlah') || h.includes('qty') || h.includes('rusak')) colQty = c;
      }

      for (let i = 1; i < rows.length; i++) {
        const rowId = String(rows[i][colId] || '').trim().toLowerCase();
        if (rowId === mtId || (rowId && (rowId.includes(mtId) || mtId.includes(rowId)))) {
          sheet.getRange(i + 1, colStatus + 1).setValue('Selesai');
          if (!qty && colQty !== -1) {
            qty = Number(rows[i][colQty]) || 1;
          }
          updated = true;
          break;
        }
      }
    }
  }

  if (!qty) qty = 1;

  // Kembalikan stok kuantitas tersedia di tab PERALATAN
  if (equipSheet && (eqId || payload.nama_barang || payload.equipmentName)) {
    updateEquipmentStock(equipSheet, eqId || payload.nama_barang || payload.equipmentName, qty);
  }

  return { 
    success: true, 
    message: 'Pemeliharaan selesai, ' + qty + ' unit telah dikembalikan ke stok tersedia.', 
    updated: updated, 
    qty: qty 
  };
}

function handleForgotPassword(payload) {
  const email = (payload.email || '').trim();
  if (!email || email.indexOf('@') === -1) {
    return { result: 'error', message: 'Email tidak valid.' };
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tempPassword = 'BBPVP-';
  for (let i = 0; i < 6; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const subject = '🔐 Pemulihan Kata Sandi Admin - BBPVP Bandung';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #1e40af; margin-top: 0;">Pemulihan Kata Sandi Admin</h2>
      <p>Halo Admin,</p>
      <p>Berikut adalah kata sandi sementara Anda untuk masuk ke Portal Admin Inventaris BBPVP Bandung:</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <span style="font-size: 22px; font-weight: bold; font-family: monospace; color: #1e293b; letter-spacing: 2px;">${tempPassword}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">Silakan gunakan kata sandi ini untuk login ke portal.</p>
    </div>
  `;

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    return { result: 'success', tempPassword: tempPassword };
  } catch (err) {
    return { result: 'error', message: 'Gagal kirim email: ' + err.toString() };
  }
}

// =========================================================================
// 5. HELPER UTILITY & PARSER FUNCTIONS
// =========================================================================

function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initSheetsIfNotExist(ss);

  const equipSheet = getSheetSafe(ss, SHEET_NAMES.EQUIPMENT);
  const loanSheet = getSheetSafe(ss, SHEET_NAMES.LOANS);
  const maintSheet = getSheetSafe(ss, SHEET_NAMES.MAINTENANCE);

  return {
    equipment: parseEquipmentSheet(equipSheet),
    loans: parseLoansSheet(loanSheet),
    maintenance: parseMaintenanceSheet(maintSheet)
  };
}

function parseEquipmentSheet(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  let colId = -1, colName = -1, colCat = -1, colTotal = -1, colAvail = -1, colStatus = -1, colLoc = -1, colDesc = -1;

  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h === 'nomor_barang' || h === 'id' || h === 'id_barang' || h.includes('nomor')) colId = c;
    else if (h.includes('nama')) colName = c;
    else if (h.includes('kategori') || h.includes('lantai') || h.includes('category')) colCat = c;
    else if (h.includes('total')) colTotal = c;
    else if (h.includes('tersedia') || h.includes('available') || h.includes('stok') || h.includes('qty')) colAvail = c;
    else if (h.includes('status')) colStatus = c;
    else if (h.includes('lokasi') || h.includes('location')) colLoc = c;
    else if (h.includes('deskripsi') || h.includes('keterangan') || h.includes('description') || h.includes('note')) colDesc = c;
  }

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;

    const id = colId !== -1 ? String(r[colId]) : String(r[0]);
    const name = colName !== -1 ? String(r[colName]) : String(r[1]);
    const category = colCat !== -1 ? String(r[colCat]) : (r[2] || 'Umum');
    const totalQty = colTotal !== -1 ? (Number(r[colTotal]) || 0) : (Number(r[3]) || 0);
    const availableQty = colAvail !== -1 ? (Number(r[colAvail]) || 0) : (Number(r[4]) || 0);
    const status = colStatus !== -1 ? String(r[colStatus]) : (r[5] || 'Tersedia');
    const location = colLoc !== -1 ? String(r[colLoc]) : (r[6] || '');
    const description = colDesc !== -1 ? String(r[colDesc]) : (r[7] || '');

    list.push({
      id: id,
      name: name,
      category: category,
      totalQty: totalQty || availableQty || 1,
      availableQty: availableQty,
      qty: availableQty,
      status: status,
      location: location,
      description: description,
      note: description
    });
  }
  return list;
}

function parseLoansSheet(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  let colId = -1, colTime = -1, colName = -1, colEmail = -1, colKejuruan = -1, colEqId = -1, colEqName = -1, colQty = -1, colBorrowDate = -1, colReturnDate = -1, colStatus = -1, colPhoto = -1, colDriveId = -1;

  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h === 'timestamp' || h.includes('time') || h.includes('waktu')) colTime = c;
    else if (h === 'id_peminjaman' || h === 'id_tiket' || h === 'id' || h.includes('tiket')) colId = c;
    else if (h.includes('nama_lengkap') || h.includes('peminjam') || (h.includes('nama') && !h.includes('barang') && !h.includes('peralatan'))) colName = c;
    else if (h.includes('email')) colEmail = c;
    else if (h.includes('kejuruan') || h.includes('jurusan')) colKejuruan = c;
    else if (h.includes('nomor_barang') || h === 'equipmentid') colEqId = c;
    else if (h.includes('peralatan') || h.includes('nama_barang') || h.includes('alat') || h.includes('barang')) colEqName = c;
    else if (h === 'jumlah' || h === 'qty' || h === 'jumlah_pinjam') colQty = c;
    else if (h.includes('tgl_pinjam') || h.includes('tanggal_peminjaman') || (h.includes('pinjam') && !h.includes('peralatan'))) colBorrowDate = c;
    else if (h.includes('tgl_kembali') || h.includes('tanggal_pengembalian') || h.includes('kembali')) colReturnDate = c;
    else if (h.includes('status')) colStatus = c;
    else if (h.includes('foto') || h.includes('link_foto') || h.includes('photo')) colPhoto = c;
    else if (h.includes('file_id') || h.includes('drive')) colDriveId = c;
  }

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1] && !r[2]) continue;

    const formatDate = function(val) {
      if (!val) return '';
      if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
      return String(val);
    };

    const rawEqName = colEqName !== -1 ? String(r[colEqName] || '') : String(r[5] || r[6] || '');
    let itemQty = 1;
    if (colQty !== -1 && !isNaN(Number(r[colQty])) && Number(r[colQty]) > 0 && Number(r[colQty]) < 10000) {
      itemQty = Number(r[colQty]);
    } else {
      const match = rawEqName.match(/\((\d+)\s*Unit\)/i);
      if (match) itemQty = parseInt(match[1]);
    }

    list.push({
      id: colId !== -1 ? String(r[colId]) : String(r[0] || ('PJ-' + i)),
      timestamp: colTime !== -1 ? String(r[colTime]) : String(r[1] || ''),
      borrowerName: colName !== -1 ? String(r[colName]) : String(r[2] || ''),
      email: colEmail !== -1 ? String(r[colEmail]) : String(r[3] || ''),
      kejuruan: colKejuruan !== -1 ? String(r[colKejuruan]) : String(r[4] || ''),
      equipmentId: colEqId !== -1 ? String(r[colEqId]) : String(r[5] || ''),
      equipmentName: rawEqName,
      qty: itemQty,
      borrowDate: colBorrowDate !== -1 ? formatDate(r[colBorrowDate]) : formatDate(r[6] || r[8]),
      returnDate: colReturnDate !== -1 ? formatDate(r[colReturnDate]) : formatDate(r[7] || r[9]),
      status: colStatus !== -1 ? String(r[colStatus]) : String(r[8] || r[10] || 'Dipinjam'),
      photoUrl: colPhoto !== -1 ? String(r[colPhoto]) : String(r[9] || r[11] || ''),
      driveFileId: colDriveId !== -1 ? String(r[colDriveId]) : String(r[10] || r[12] || '')
    });
  }
  return list;
}

function parseMaintenanceSheet(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  let colId = -1, colEqId = -1, colEqName = -1, colQty = -1, colDate = -1, colType = -1, colNotes = -1, colTech = -1, colCost = -1, colStatus = -1;

  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h === 'id' || h === 'id_pemeliharaan' || h.includes('id_pemeliharaan')) colId = c;
    else if (h.includes('nomor') || h.includes('equipmentid') || h === 'id_barang') colEqId = c;
    else if (h.includes('nama') || h.includes('equipmentname') || h === 'barang') colEqName = c;
    else if (h.includes('jumlah') || h.includes('qty') || h.includes('unit') || h.includes('rusak')) colQty = c;
    else if (h.includes('tgl') || h.includes('tanggal') || h.includes('date') || h.includes('servis')) colDate = c;
    else if (h.includes('jenis') || h.includes('type') || h.includes('perawatan')) colType = c;
    else if (h.includes('catatan') || h.includes('keterangan') || h.includes('diagnosa') || h.includes('notes') || h.includes('issue')) colNotes = c;
    else if (h.includes('teknisi') || h.includes('technician') || h.includes('petugas')) colTech = c;
    else if (h.includes('biaya') || h.includes('cost')) colCost = c;
    else if (h.includes('status')) colStatus = c;
  }

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1] && !r[2]) continue;

    const id = colId !== -1 ? String(r[colId]) : String(r[0]);
    const equipmentId = colEqId !== -1 ? String(r[colEqId]) : String(r[1]);
    const equipmentName = colEqName !== -1 ? String(r[colEqName]) : String(r[2]);
    const qty = colQty !== -1 ? (Number(r[colQty]) || 1) : 1;
    const maintenanceDate = colDate !== -1 ? (r[colDate] instanceof Date ? Utilities.formatDate(r[colDate], 'Asia/Jakarta', 'yyyy-MM-dd') : String(r[colDate])) : (r[3] || '');
    const type = colType !== -1 ? String(r[colType]) : (r[4] || 'Perbaikan Kerusakan');
    const notes = colNotes !== -1 ? String(r[colNotes]) : (r[5] || '');
    const technician = colTech !== -1 ? String(r[colTech]) : (r[6] || '');
    const cost = colCost !== -1 ? Number(r[colCost]) || 0 : (Number(r[7]) || 0);
    const status = colStatus !== -1 ? String(r[colStatus]) : (String(r[8]) || 'Sedang Berjalan');

    list.push({
      id: id || ('MT-' + i),
      equipmentId: equipmentId,
      equipmentName: equipmentName,
      qty: qty,
      jumlah: qty,
      jumlah_rusak: qty,
      maintenanceDate: maintenanceDate,
      type: type,
      notes: notes,
      technician: technician,
      cost: cost,
      status: status || 'Sedang Berjalan'
    });
  }
  return list;
}

function updateEquipmentStock(equipSheet, equipmentIdentifier, deltaQty) {
  if (!equipSheet || !equipmentIdentifier) return;
  const rows = equipSheet.getDataRange().getValues();
  if (rows.length <= 1) return;

  const headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  let idCol = 0;
  let nameCol = 1;
  let totalCol = 3;
  let availCol = 4;
  let statusCol = 5;

  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h.includes('nomor') || h.includes('id') || h.includes('kode')) idCol = c;
    else if (h.includes('nama') || h.includes('barang') || h.includes('equipment')) nameCol = c;
    else if (h.includes('total')) totalCol = c;
    else if (h.includes('tersedia') || h.includes('available') || h.includes('stok') || h.includes('qty')) availCol = c;
    else if (h.includes('status')) statusCol = c;
  }

  const searchKey = String(equipmentIdentifier).trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const rowId = String(rows[i][idCol] || '').trim().toLowerCase();
    const rowName = String(rows[i][nameCol] || '').trim().toLowerCase();

    if (
      rowId === searchKey || 
      rowName === searchKey || 
      (rowId && searchKey.indexOf(rowId) !== -1) || 
      (rowName && searchKey.indexOf(rowName) !== -1) ||
      (searchKey && rowName.indexOf(searchKey) !== -1)
    ) {
      const currentAvailable = Number(rows[i][availCol]) || 0;
      const totalStock = Number(rows[i][totalCol]) || currentAvailable;
      const newAvailable = Math.max(0, Math.min(totalStock, currentAvailable + deltaQty));
      
      equipSheet.getRange(i + 1, availCol + 1).setValue(newAvailable);
      
      if (newAvailable === 0) {
        equipSheet.getRange(i + 1, statusCol + 1).setValue('Dalam Pemeliharaan');
      } else if (newAvailable > 0) {
        equipSheet.getRange(i + 1, statusCol + 1).setValue('Tersedia');
      }
      break;
    }
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function initSheetsIfNotExist(ss) {
  if (!getSheetSafe(ss, SHEET_NAMES.EQUIPMENT)) {
    const s = ss.insertSheet(SHEET_NAMES.EQUIPMENT);
    s.appendRow(['nomor_barang', 'nama_barang', 'kategori', 'kuantitas_total', 'kuantitas_tersedia', 'status', 'lokasi', 'deskripsi']);
  }
  if (!getSheetSafe(ss, SHEET_NAMES.LOANS)) {
    const s = ss.insertSheet(SHEET_NAMES.LOANS);
    s.appendRow(['id_peminjaman', 'timestamp', 'nama_lengkap', 'email', 'kejuruan', 'nomor_barang', 'nama_barang', 'jumlah', 'tgl_pinjam', 'tgl_kembali', 'status', 'link_foto_drive', 'file_id_drive']);
  }
  if (!getSheetSafe(ss, SHEET_NAMES.MAINTENANCE)) {
    const s = ss.insertSheet(SHEET_NAMES.MAINTENANCE);
    s.appendRow(['id_pemeliharaan', 'nomor_barang', 'nama_barang', 'jumlah_rusak', 'tgl_servis', 'jenis_perawatan', 'catatan_kerusakan', 'teknisi', 'biaya', 'status']);
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
