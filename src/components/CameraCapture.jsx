import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function CameraCapture({ onPhotoCaptured, currentPhoto }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(currentPhoto || null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera aktif, atau gunakan opsi upload file foto.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Helper kompresi gambar agar ringan (<60KB) dan cepat diupload ke Google Drive / Apps Script
  const compressImage = (dataUrl, maxWidth = 480, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext('2d');
    // Mirror the image horizontally for natural selfie experience
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const compressed = await compressImage(rawDataUrl, 480, 0.7);
    
    setPhotoPreview(compressed);
    stopCamera();
    onPhotoCaptured(compressed);
  };

  const retakePhoto = () => {
    setPhotoPreview(null);
    onPhotoCaptured(null);
    startCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target.result;
      const compressed = await compressImage(rawDataUrl, 480, 0.7);
      setPhotoPreview(compressed);
      stopCamera();
      onPhotoCaptured(compressed);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-800">
          Foto Wajah Peminjam <span className="text-red-500">*</span>
        </label>
        <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Disimpan ke Google Drive
        </span>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 bg-slate-50/70 text-center relative overflow-hidden transition-all duration-200 hover:border-slate-400">
        
        {/* Hidden Elements */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* State 1: Photo already captured / preview */}
        {photoPreview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <img
                src={photoPreview}
                alt="Foto Wajah Peminjam"
                className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-2xl border-4 border-white shadow-md ring-2 ring-emerald-500"
              />
              <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Foto Wajah Berhasil Diambil
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Foto siap diverifikasi dan diunggah ke Google Drive
              </p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={retakePhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Ambil Ulang
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 text-xs font-semibold rounded-lg transition"
              >
                <Upload className="w-3.5 h-3.5" /> Ganti dari File
              </button>
            </div>
          </div>
        ) : isCameraActive ? (
          /* State 2: Live camera preview */
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-full max-w-xs aspect-4/3 bg-black rounded-2xl overflow-hidden shadow-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {/* Face Guide Oval Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-36 h-48 sm:w-44 sm:h-56 border-2 border-dashed border-white/70 rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs font-medium">
                    Posisikan Wajah Di Sini
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={takeSnapshot}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-600/30 transition transform active:scale-95"
              >
                <Camera className="w-4 h-4" /> Jepret Foto Wajah
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Initial idle state */
          <div className="py-4 px-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Ambil Foto Wajah Anda
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
              Wajib untuk identifikasi peminjam. Foto akan otomatis tersimpan di Google Drive dan ditautkan ke Spreadsheet.
            </p>

            {cameraError && (
              <div className="mb-3 max-w-sm mx-auto p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-blue-500/20 transition"
              >
                <Camera className="w-4 h-4" /> Buka Kamera Selfie
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition"
              >
                <Upload className="w-4 h-4" /> Upload Foto Wajah
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
