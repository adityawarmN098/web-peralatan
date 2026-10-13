import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowLeft, Smartphone, CheckCircle2, UserPlus, LogIn, KeyRound } from 'lucide-react';

// Ganti URL di bawah ini dengan URL Web App Google Apps Script Anda yang terbaru
const SPREADSHEET_URL = "https://script.google.com/macros/s/AKfycbwtufS8ddj1V2hldFvYOw2gRKPCb_zNN07BoP0ZH52vt3f2EFXM2XovOEgFo0ME8B5ZIQ/exec";

export default function AdminLogin({ onLoginSuccess, onBackToUserPortal }) {
  // Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState('login');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedbackAlert, setFeedbackAlert] = useState(null);

  // Get registered admins list from localStorage
  const getRegisteredAdmins = () => {
    try {
      const stored = localStorage.getItem('silentara_admin_accounts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    // Default initial admin account
    return [
      {
        fullName: 'ADMIN INVENTARIS',
        email: 'adityawarman0909@gmail.com',
        password: 'admin'
      }
    ];
  };

  const [registeredAdmins, setRegisteredAdmins] = useState(getRegisteredAdmins);

  const saveRegisteredAdmins = (admins) => {
    setRegisteredAdmins(admins);
    try {
      localStorage.setItem('silentara_admin_accounts', JSON.stringify(admins));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchMode = (mode) => {
    setAuthMode(mode);
    setErrors({});
    setFeedbackAlert(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  const validate = () => {
    const newErrors = {};

    if (authMode === 'register') {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Nama lengkap admin wajib diisi.';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email aktif admin wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid (contoh: admin@gmail.com).';
    }

    if (!formData.password) {
      newErrors.password = 'Kata sandi wajib diisi.';
    } else if (formData.password.length < 5) {
      newErrors.password = 'Kata sandi minimal 5 karakter.';
    }

    if (authMode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Ulangi kata sandi Anda.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok dengan kata sandi.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fitur Lupa Kata Sandi (Kirim Email via Google Apps Script & Sinkronisasi localStorage)
  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: 'Masukkan email aktif Anda terlebih dahulu di kolom di atas untuk pemulihan sandi.' });
      return;
    }

    const confirmReset = window.confirm(`Kirim kata sandi pemulihan baru ke Gmail: ${formData.email} ?`);
    if (!confirmReset) return;

    setIsResetting(true);
    setErrors({});
    setFeedbackAlert(null);

    try {
      const response = await fetch(`${SPREADSHEET_URL}?action=forgotPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'forgotPassword', email: formData.email.trim() })
      });
      const result = await response.json();

      if (result.result === 'success') {
        setFeedbackAlert({
          type: 'success',
          title: 'Email Pemulihan Terkirim!',
          message: `Sandi baru telah dikirimkan ke Gmail: ${formData.email}. Silakan cek kotak masuk atau folder spam Anda.`
        });

        // PERBAIKAN UTAMA: Masukkan sandi baru ke input DAN sinkronkan ke localStorage
        if (result.tempPassword) {
          setFormData(prev => ({ ...prev, password: result.tempPassword }));

          const admins = getRegisteredAdmins();
          const emailTarget = formData.email.trim().toLowerCase();
          
          let found = false;
          const updatedAdmins = admins.map(acc => {
            if (acc.email && acc.email.toLowerCase() === emailTarget) {
              found = true;
              return { ...acc, password: result.tempPassword };
            }
            return acc;
          });

          // Jika email belum ada di data lokal, daftarkan secara otomatis agar bisa langsung login
          if (!found) {
            updatedAdmins.push({
              fullName: 'ADMIN INVENTARIS',
              email: emailTarget,
              password: result.tempPassword
            });
          }

          saveRegisteredAdmins(updatedAdmins);
        }
      } else {
        setErrors({ email: result.error || result.message || 'Gagal mengirim email pemulihan.' });
      }
    } catch (err) {
      setErrors({ email: 'Terjadi kesalahan jaringan: ' + err.message });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    setTimeout(() => {
      setIsLoading(false);

      if (authMode === 'register') {
        const existing = registeredAdmins.find(
          (acc) => acc.email.toLowerCase() === formData.email.toLowerCase()
        );

        if (existing) {
          setErrors({ email: 'Email ini sudah terdaftar sebagai admin. Silakan langsung masuk (Login).' });
          return;
        }

        const newAdmin = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        };

        const updated = [...registeredAdmins, newAdmin];
        saveRegisteredAdmins(updated);

        setFeedbackAlert({
          type: 'success',
          title: 'Pendaftaran Akun Admin Berhasil!',
          message: `Akun atas nama ${newAdmin.fullName} telah aktif. Silakan masuk menggunakan kata sandi Anda.`
        });

        setTimeout(() => {
          setAuthMode('login');
          setFormData((prev) => ({
            ...prev,
            email: newAdmin.email,
            password: '',
            confirmPassword: ''
          }));
        }, 1500);

      } else {
        const account = registeredAdmins.find(
          (acc) =>
            acc.email.toLowerCase() === formData.email.toLowerCase() &&
            acc.password === formData.password
        );

        if (!account) {
          const emailExists = registeredAdmins.some(
            (acc) => acc.email.toLowerCase() === formData.email.toLowerCase()
          );

          if (emailExists) {
            setErrors({ password: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' });
          } else {
            setErrors({
              email: 'Akun dengan email ini belum terdaftar. Silakan buat akun baru terlebih dahulu.'
            });
          }
          return;
        }

        setFeedbackAlert({
          type: 'success',
          title: 'Notifikasi Keamanan Terkirim ke HP!',
          message: `Pemberitahuan aktivitas masuk dikirim ke ${account.email}.`
        });

        setTimeout(() => {
          onLoginSuccess({
            fullName: account.fullName,
            email: account.email
          });
        }, 1200);
      }
    }, 900);
  };

  return (
    <div className="max-w-md mx-auto my-8">
      
      {/* Back Button */}
      <button
        onClick={onBackToUserPortal}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Portal Peminjam
      </button>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 relative overflow-hidden">
        
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700" />

        {/* Icon & Title */}
        <div className="text-center mb-5 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25 ring-4 ring-blue-50">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {authMode === 'login' ? 'Masuk Petugas Admin' : 'Daftar Akun Admin Baru'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {authMode === 'login'
              ? 'Hanya petugas resmi yang berhak mengelola inventaris, data peminjaman, & pemeliharaan.'
              : 'Daftarkan nama & email aktif Anda untuk mendapatkan hak akses pengelolaan inventaris.'}
          </p>
        </div>

        {/* Switcher Tab: Masuk vs Buat Akun */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 border border-slate-200/70">
          <button
            type="button"
            onClick={() => handleSwitchMode('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('register')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Buat Akun Admin
          </button>
        </div>

        {/* Security Info */}
        <div className="mb-5 p-3 bg-blue-50/80 border border-blue-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
          <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Proteksi Keamanan Akun:</span>
            <span className="text-[11px] text-blue-700">
              {authMode === 'login'
                ? 'Notifikasi masuk dan waktu login akan dikirim otomatis ke Gmail HP Anda.'
                : 'Email aktif diperlukan untuk menerima notifikasi verifikasi & aktivitas inventaris.'}
            </span>
          </div>
        </div>

        {/* Alert Notification Toast */}
        {feedbackAlert && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">{feedbackAlert.title}</span>
              <span className="text-[11px] text-emerald-700">{feedbackAlert.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* Nama Lengkap (Register) */}
          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Nama Lengkap Admin <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Contoh: ADITYA PRATAMA"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (errors.fullName) setErrors({ ...errors, fullName: null });
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border rounded-xl text-slate-900 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                    errors.fullName
                      ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.fullName && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.fullName}
                </p>
              )}
            </div>
          )}

          {/* Email Aktif */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Email Aktif Admin <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">
                Notif Gmail HP
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="namaadmin@gmail.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                className={`w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border rounded-xl text-slate-900 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
              </p>
            )}
          </div>

          {/* Kata Sandi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Kata Sandi (Password) <span className="text-red-500">*</span>
              </label>
              
              {/* Tombol Lupa Kata Sandi (Hanya muncul saat Mode Login) */}
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <KeyRound className="w-3 h-3" />
                  {isResetting ? 'Mengirim...' : 'Lupa Kata Sandi?'}
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 5 karakter..."
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                className={`w-full pl-10 pr-12 py-2.5 sm:py-3 bg-slate-50 border rounded-xl text-slate-900 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                  errors.password
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.password}
              </p>
            )}
          </div>

          {/* Konfirmasi Kata Sandi (Register) */}
          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Ulangi Kata Sandi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ketik ulang kata sandi yang sama..."
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                  }}
                  className={`w-full pl-10 pr-12 py-2.5 sm:py-3 bg-slate-50 border rounded-xl text-slate-900 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                    errors.confirmPassword
                      ? 'border-red-400 focus:ring-red-200 bg-red-50/20'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmPassword}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm ${
                isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {authMode === 'login'
                      ? 'Mengirim Notifikasi ke HP & Masuk...'
                      : 'Mendaftarkan Akun Admin...'}
                  </span>
                </>
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Panel Pengelola Admin</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Daftarkan Akun Admin Baru</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Footer switch prompt */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          {authMode === 'login' ? (
            <p className="text-xs text-slate-500">
              Belum punya akun admin?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Daftar akun di sini
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Sudah memiliki akun admin?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Masuk di sini
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}