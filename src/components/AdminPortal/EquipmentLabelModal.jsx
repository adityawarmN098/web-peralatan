import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Tag, Package, CheckCircle2 } from 'lucide-react';

export default function EquipmentLabelModal({ equipment, onClose }) {
  if (!equipment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Label Stiker Inventaris</h3>
              <p className="text-[11px] text-slate-400">Siap dicetak untuk ditempel pada alat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Preview Area */}
        <div className="p-6 bg-slate-100 flex flex-col items-center">
          
          {/* Label Sticker Card */}
          <div id="printable-label" className="bg-white border-2 border-slate-800 rounded-xl p-4 w-full max-w-xs shadow-md">
            
            {/* Top Label Header */}
            <div className="border-b-2 border-slate-800 pb-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/logo-bbpvp.png"
                  alt="Logo BBPVP Bandung"
                  className="h-7 w-auto object-contain rounded"
                />
                <div>
                  <span className="text-[8px] font-black tracking-widest uppercase text-slate-500 block leading-tight">
                    ASET & INVENTARIS
                  </span>
                  <span className="font-black text-xs text-slate-900 leading-tight">
                    BBPVP BANDUNG
                  </span>
                </div>
              </div>
              <span className="text-[9px] bg-slate-900 text-white font-mono px-1.5 py-0.5 rounded font-bold">
                {equipment.category}
              </span>
            </div>

            {/* Label Body: QR Code & Detail */}
            <div className="flex items-center gap-4">
              <div className="p-1.5 bg-white border border-slate-300 rounded-lg shrink-0">
                <QRCodeSVG
                  value={`EQUIP:${equipment.id}|NAME:${equipment.name}`}
                  size={90}
                  level="M"
                />
              </div>

              <div className="space-y-1 text-left min-w-0">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">
                  Nomor Barang
                </span>
                <p className="font-mono text-base font-black text-blue-800 leading-tight">
                  {equipment.id}
                </p>

                <span className="text-[9px] font-bold text-slate-400 block uppercase pt-1">
                  Nama Peralatan
                </span>
                <p className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
                  {equipment.name}
                </p>
                <p className="text-[9px] text-slate-500 truncate mt-1">
                  Lokasi: {equipment.location}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-slate-300 mt-3 pt-2 flex items-center justify-between text-[8px] text-slate-400">
              <span>SCAN UNTUK CEK STATUS</span>
              <span>HAK MILIK RESMI</span>
            </div>

          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            Gunakan kertas stiker label ukuran 70x40mm atau sejenisnya.
          </p>

        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> Cetak Label Stiker
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
