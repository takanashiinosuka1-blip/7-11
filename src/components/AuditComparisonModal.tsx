import React from 'react';
import { X, CheckCircle, AlertTriangle, ArrowRight, MapPin, Layers, LayoutGrid } from 'lucide-react';

interface AuditComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditComparisonModal: React.FC<AuditComparisonModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const comparisonPoints = [
    {
      id: 1,
      title: 'ข้อ 1: UI เป็นระเบียบ ไม่ล่ก (Cluttered UI -> Clean & Organized)',
      issue: 'UI เดิมมีป้ายโปรโมชั่น ทับซ้อนกัน ป้ายแสตมป์หลายชั้น แบนเนอร์การ์ตูนแน่นจอ คุกกี้ป็อปอัปบังเต็มหน้า และการจัดหมวดหมู่สับสน',
      solution: 'ออกแบบใหม่ด้วย Typography Hierarchy ที่ชัดเจน, แบ่งหมวดหมู่ด้วย Segmented Tabs เรียบง่าย, รวมโปรโมชั่นไว้ใน Campaign Hero มีระบบค้นหาพร้อมไฮไลท์ และไม่มีป็อปอัปเกะกะ',
      status: 'แก้ไขแล้ว 100%',
      icon: LayoutGrid,
    },
    {
      id: 2,
      title: 'ข้อ 2: ระบบ Map และการระบุที่อยู่ละเอียด (Inaccurate Map -> Draggable Pin & Custom Address)',
      issue: 'ระบบ Map เดิมปักหมุดคลาดเคลื่อนบ่อย ไรเดอร์หาจุดส่งไม่เจอเพราะระบุได้เพียงชื่อกว้างๆ ไม่สามารถใส่ข้อมูลตึก/ชั้น/ห้อง/จุดสังเกตได้',
      solution: 'เพิ่มแผนที่ Interactive ที่ลากปรับหมุดได้อิสระ + ปุ่มค้นหาพิกัด GPS แม่นยำ + ฟอร์ม "เพิ่มที่อยู่เองแบบละเอียด" (เลขห้อง, ชั้น, ตึก, จุดสังเกต, คำแนะนำถึงไรเดอร์) และบันทึกที่อยู่โปรดได้',
      status: 'แก้ไขแล้ว 100%',
      icon: MapPin,
    },
    {
      id: 3,
      title: 'ข้อ 3: ระบบตัดสต๊อกอัตโนมัติ Real-Time (Misleading Stock -> Auto-Deduction Engine)',
      issue: 'เดิมระบุสถานะสินค้าว่ามีอยู่ แต่พอกดสั่งจริงของกลับหมดที่สาขา ทำให้ต้องกดยกเลิกหรือเปลี่ยนสินค้าเสียเวลา',
      solution: 'พัฒนาระบบ Live Branch Inventory ผูกสต๊อกจริงกับแต่ละสาขา เมื่อยืนยันคำสั่งซื้อจะทำการตัดสต๊อกทันที (Auto-Deduction) พร้อมแสดงสถานะ "มีสินค้า / เหลือ X ชิ้น / สินค้าหมด" แบบเรียลไทม์',
      status: 'แก้ไขแล้ว 100%',
      icon: Layers,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#007A3D] text-white flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                สรุปการวิเคราะห์และปรับปรุงตามความต้องการของผู้ใช้
              </h2>
              <p className="text-xs text-slate-500">
                เปรียบเทียบข้อดี ข้อเสีย และข้อพัฒนาของระบบ 7-Delivery Redesign
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Executive Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="font-bold text-[#007A3D] text-xs flex items-center gap-1.5 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>ข้อดีเดิมที่รักษาไว้</span>
              </div>
              <p className="text-xs text-slate-700">
                เข้าถึงง่าย สะดวกสบาย เมนูอาหารพร้อมทาน All Café ขนมและของใช้ครบครัน
              </p>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200">
              <div className="font-bold text-rose-700 text-xs flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>ข้อเสียที่พบในระบบเดิม</span>
              </div>
              <p className="text-xs text-slate-700">
                1. UI ล่ก รกสายตา 2. Map ปักหมุดคลาดเคลื่อน 3. สต๊อกสินค้ามี/หมดไม่ตรง
              </p>
            </div>

            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
              <div className="font-bold text-blue-700 text-xs flex items-center gap-1.5 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>แนวทางพัฒนาที่ลงมือทำจริง</span>
              </div>
              <p className="text-xs text-slate-700">
                จัดระเบียบ UI สะอาดตา + ระบบปักหมุด/เพิ่มที่อยู่เอง + ระบบตัดสต๊อกอัตโนมัติ
              </p>
            </div>
          </div>

          {/* Detailed Points */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              รายละเอียดการแก้ปัญหาทั้ง 3 ประเด็น
            </h3>

            {comparisonPoints.map((pt) => {
              const Icon = pt.icon;
              return (
                <div key={pt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#007A3D] flex items-center justify-center font-bold">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {pt.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {pt.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-lg border border-rose-200/80">
                      <span className="text-[11px] font-bold text-rose-600 block mb-1">
                        ❌ ปัญหาเดิม:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {pt.issue}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-emerald-200/80">
                      <span className="text-[11px] font-bold text-emerald-700 block mb-1">
                        ✅ การแก้ไขในระบบใหม่:
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {pt.solution}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reference Screenshots Preview (User's Attached Files) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h4 className="font-bold text-xs text-slate-800">
              ภาพอ้างอิงหน้าเว็บเดิมที่มีปัญหา (จากภาพที่คุณแนบมา):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <img
                  src="/public/assets/aistudio/Screenshot__1__2985a4f4.png"
                  alt="Screenshot 1 หน้าเว็บเดิม"
                  className="rounded-lg border border-slate-200 aspect-16/9 object-cover"
                />
                <span className="text-[10px] text-slate-500 block truncate">
                  แบนเนอร์ซ้อนทับ / Pop-up รก
                </span>
              </div>
              <div className="space-y-1">
                <img
                  src="/public/assets/aistudio/Screenshot__2__88753dc6.png"
                  alt="Screenshot 2 หน้าเว็บเดิม"
                  className="rounded-lg border border-slate-200 aspect-16/9 object-cover"
                />
                <span className="text-[10px] text-slate-500 block truncate">
                  ป้ายสติกเกอร์หลายชั้น
                </span>
              </div>
              <div className="space-y-1">
                <img
                  src="/public/assets/aistudio/Screenshot__3__f0b7ff69.png"
                  alt="Screenshot 3 หน้าเว็บเดิม"
                  className="rounded-lg border border-slate-200 aspect-16/9 object-cover"
                />
                <span className="text-[10px] text-slate-500 block truncate">
                  การ์ดเมนูใหม่แน่นจอ
                </span>
              </div>
              <div className="space-y-1">
                <img
                  src="/public/assets/aistudio/Screenshot__4__a6a7466a.png"
                  alt="Screenshot 4 หน้าเว็บเดิม"
                  className="rounded-lg border border-slate-200 aspect-16/9 object-cover"
                />
                <span className="text-[10px] text-slate-500 block truncate">
                  แถบคุกกี้และกราฟิกกระจัดกระจาย
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            คุณสามารถทดลองใช้งานทุกฟีเจอร์ได้โดยตรงในแอปพลิเคชันนี้
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#007A3D] text-white rounded-xl text-xs font-bold hover:bg-[#006834] transition-colors"
          >
            เข้าใจแล้ว เริ่มใช้งานเลย
          </button>
        </div>
      </div>
    </div>
  );
};
