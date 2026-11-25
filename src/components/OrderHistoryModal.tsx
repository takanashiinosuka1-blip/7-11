import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  PackageCheck,
  Bike,
  Clock,
  ShieldCheck,
  MapPin,
  Store,
  Phone,
  MessageSquare,
  Play,
  RotateCcw,
  Star,
  CalendarClock,
  Navigation,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { OrderRecord } from '../utils/inventory.ts';

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  onOpenShop: () => void;
  onAdvanceOrderStep?: (orderId: string) => void;
  onResetOrderTracking?: (orderId: string) => void;
  isInlineView?: boolean;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  orders,
  onOpenShop,
  onAdvanceOrderStep,
  onResetOrderTracking,
  isInlineView = false,
}) => {
  if (!isOpen) return null;

  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [riderChatNote, setRiderChatNote] = useState<string>('');
  const [sentMessages, setSentMessages] = useState<string[]>([
    'ไรเดอร์: รับสินค้าครบถ้วนและกำลังเดินทางไปที่คอนโดครับ',
  ]);

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleSendNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderChatNote.trim()) return;
    setSentMessages((prev) => [...prev, `คุณ: ${riderChatNote.trim()}`]);
    setRiderChatNote('');
  };

  // Convert lat/lng to map coordinates for live tracking canvas
  const toTrackCoord = (lat: number, lng: number) => {
    const normX = (lng - 100.52) / (100.59 - 100.52);
    const normY = (13.76 - lat) / (13.76 - 13.72);
    return {
      x: Math.max(12, Math.min(88, normX * 100)),
      y: Math.max(15, Math.min(85, normY * 100)),
    };
  };

  const innerContent = (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#007A3D] text-white flex items-center justify-center shadow-xs">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-slate-900">
                ระบบติดตามการจัดส่งสด (Live GPS Tracking & Time SLA)
              </h2>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                REAL-TIME GPS
              </span>
            </div>
            <p className="text-xs text-slate-500">
              ติดตามตำแหน่งไรเดอร์ เวลาจัดเตรียมอาหาร เวลาเดินทาง และสถานะทั้ง 5 ขั้นตอนอย่างละเอียด
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {orders.length > 1 && (
            <select
              value={activeOrder?.id || ''}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-semibold text-slate-800"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  ออเดอร์ #{o.orderNumber} ({o.createdAt})
                </option>
              ))}
            </select>
          )}

          {!isInlineView && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {!activeOrder ? (
        <div className="text-center py-12 space-y-3 p-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <p className="font-semibold text-slate-800 text-sm">ยังไม่มีคำสั่งซื้อในระบบ</p>
          <button
            onClick={onOpenShop}
            className="px-4 py-2 bg-[#007A3D] text-white rounded-xl text-xs font-semibold hover:bg-[#006834]"
          >
            เลือกซื้อสินค้า
          </button>
        </div>
      ) : (
        <div className="p-5 sm:p-6 space-y-6">
          {/* 1. Detailed Time Breakdown & SLA Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                <span>เวลาถึงโดยประมาณ (ETA)</span>
                <Clock className="w-4 h-4 text-[#007A3D]" />
              </div>
              <div className="text-lg font-extrabold text-[#007A3D] tabular-nums">
                {activeOrder.status === 'completed' ? 'ส่งถึงเรียบร้อย' : activeOrder.estimatedArrivalTime}
              </div>
              <p className="text-[11px] text-slate-600">
                สั่งเมื่อ {activeOrder.createdAt} น. ({activeOrder.schedule.slotLabel})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>เวลาจัดของ & อบร้อน</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {activeOrder.prepMinutes} นาที
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                {activeOrder.schedule.heatingPreference === 'heat_now'
                  ? 'อบร้อนพร้อมทานทันที'
                  : activeOrder.schedule.heatingPreference === 'separate_ice'
                  ? 'แยกน้ำแข็งเครื่องดื่ม'
                  : 'ไม่อุ่นร้อน'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>ระยะทาง & เวลาเดินทาง</span>
                <Navigation className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {activeOrder.distanceKm} กม. (~{activeOrder.travelMinutes} นาที)
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                จาก {activeOrder.branchName.replace('สาขา ', '')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>ความคืบหน้าการส่ง</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums">
                {activeOrder.riderProgressPercent}%
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#007A3D] h-full rounded-full transition-all duration-300"
                  style={{ width: `${activeOrder.riderProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Split View: Live GPS Rider Map (Left) + 5-Step Detailed Timeline (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Live GPS Rider Map & Rider Info */}
            <div className="lg:col-span-7 space-y-4">
              {/* Interactive Live Rider Map */}
              {(() => {
                const startPos = { x: 24, y: 68 };
                const endPos = { x: 78, y: 28 };
                const progress = activeOrder.riderProgressPercent / 100;
                const riderX = startPos.x + (endPos.x - startPos.x) * progress;
                const riderY = startPos.y + (endPos.y - startPos.y) * progress;

                return (
                  <div className="relative h-64 sm:h-72 w-full rounded-2xl border border-slate-300 bg-[#EEF2F6] overflow-hidden shadow-inner">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="trackGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                          <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#CBD5E1" strokeWidth="0.7" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="#E8EEF3" />
                      <rect width="100%" height="100%" fill="url(#trackGrid)" />

                      {/* Roads */}
                      <line x1="0" y1="75%" x2="100%" y2="25%" stroke="#CBD5E1" strokeWidth="26" />
                      <line x1="0" y1="75%" x2="100%" y2="25%" stroke="#FFFFFF" strokeWidth="18" />
                      <line x1="24%" y1="0" x2="24%" y2="100%" stroke="#FFFFFF" strokeWidth="14" />
                      <line x1="78%" y1="0" x2="78%" y2="100%" stroke="#FFFFFF" strokeWidth="14" />

                      {/* Full Planned Route */}
                      <line
                        x1={`${startPos.x}%`}
                        y1={`${startPos.y}%`}
                        x2={`${endPos.x}%`}
                        y2={`${endPos.y}%`}
                        stroke="#94A3B8"
                        strokeWidth="5"
                        strokeDasharray="6 4"
                      />

                      {/* Completed Route Portion */}
                      <line
                        x1={`${startPos.x}%`}
                        y1={`${startPos.y}%`}
                        x2={`${riderX}%`}
                        y2={`${riderY}%`}
                        stroke="#007A3D"
                        strokeWidth="5"
                      />
                    </svg>

                    {/* Origin Pin: 7-Eleven Store */}
                    <div
                      style={{ left: `${startPos.x}%`, top: `${startPos.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    >
                      <div className="flex flex-col items-center">
                        <div className="px-2 py-0.5 bg-[#007A3D] text-white text-[10px] font-bold rounded-md shadow-md whitespace-nowrap border border-white">
                          ต้นทาง: {activeOrder.branchName.replace('สาขา ', '')}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#007A3D] text-white flex items-center justify-center shadow-md border-2 border-white mt-0.5">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Destination Pin: Customer Address */}
                    <div
                      style={{ left: `${endPos.x}%`, top: `${endPos.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    >
                      <div className="flex flex-col items-center">
                        <div className="px-2 py-0.5 bg-[#EE3124] text-white text-[10px] font-bold rounded-md shadow-md whitespace-nowrap border border-white">
                          จุดส่ง: {activeOrder.address.label} ({activeOrder.address.houseNumber})
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#EE3124] text-white flex items-center justify-center shadow-md border-2 border-white mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Moving Rider Pin */}
                    <div
                      style={{ left: `${riderX}%`, top: `${riderY}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center">
                        <div className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-extrabold rounded-full shadow-lg whitespace-nowrap border border-white">
                          🛵 ไรเดอร์ ({activeOrder.riderProgressPercent}%)
                        </div>
                        <div className="w-9 h-9 rounded-full bg-[#F58220] text-white flex items-center justify-center shadow-xl ring-4 ring-amber-400/40 border-2 border-white mt-0.5">
                          <Bike className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Simulation Control Bar on Map */}
                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        เครื่องมือจำลองการเดินทางของไรเดอร์:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {onAdvanceOrderStep && activeOrder.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => onAdvanceOrderStep(activeOrder.id)}
                            className="px-3 py-1.5 bg-[#007A3D] hover:bg-[#006834] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>ขยับสถานะถัดไป (+1 ขั้นตอน)</span>
                          </button>
                        )}
                        {onResetOrderTracking && (
                          <button
                            type="button"
                            onClick={() => onResetOrderTracking(activeOrder.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>เริ่มจำลองใหม่</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Rider Info & Quick Chat Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#007A3D] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                      {activeOrder.rider.avatarCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {activeOrder.rider.name}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {activeOrder.rider.rating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        ทะเบียนรถ: <strong className="text-slate-700">{activeOrder.rider.plateNumber}</strong> · โทร: {activeOrder.rider.phone}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                    กระเป๋าเก็บความร้อน-เย็นมาตรฐาน 7-Delivery
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-1.5 max-h-24 overflow-y-auto text-xs">
                  {sentMessages.map((msg, i) => (
                    <div key={i} className="text-slate-700">
                      {msg}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendNote} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={riderChatNote}
                    onChange={(e) => setRiderChatNote(e.target.value)}
                    placeholder="พิมพ์ข้อความฝากถึงไรเดอร์ เช่น วางไว้ที่โต๊ะประชาสัมพันธ์..."
                    className="flex-1 text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shrink-0"
                  >
                    ส่งข้อความ
                  </button>
                </form>
              </div>
            </div>

            {/* Right 5 Cols: 5-Step Timestamped Timeline & Order Summary */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-bold text-sm text-slate-900">
                    ไทม์ไลน์สถานะการจัดส่ง (5 ขั้นตอน)
                  </h3>
                  <span className="text-xs font-bold text-[#007A3D]">
                    ออเดอร์ #{activeOrder.orderNumber}
                  </span>
                </div>

                <div className="space-y-3 relative pl-2">
                  {activeOrder.timeline.map((step, idx) => {
                    const isCurrent = idx === activeOrder.currentStepIndex;
                    const isDone = step.completed;

                    return (
                      <div key={step.code} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              isCurrent
                                ? 'bg-[#F58220] text-white ring-4 ring-amber-400/30'
                                : isDone
                                ? 'bg-[#007A3D] text-white'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          {idx < activeOrder.timeline.length - 1 && (
                            <div
                              className={`w-0.5 h-7 mt-1 ${
                                isDone ? 'bg-[#007A3D]' : 'bg-slate-200'
                              }`}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-bold ${
                                isCurrent
                                  ? 'text-[#F58220]'
                                  : isDone
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {step.title}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 shrink-0">
                              {step.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destination & Order Items Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5 text-xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>รายละเอียดที่อยู่ปลายทาง</span>
                  <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    ตัดสต๊อกเรียบร้อย
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  <strong>{activeOrder.address.label}:</strong> {activeOrder.address.houseNumber}{' '}
                  {activeOrder.address.buildingOrVillage}
                  {activeOrder.address.floor ? ` ชั้น ${activeOrder.address.floor}` : ''}
                  {activeOrder.address.roomNumber && activeOrder.address.roomNumber !== '-'
                    ? ` ห้อง ${activeOrder.address.roomNumber}`
                    : ''}{' '}
                  ({activeOrder.address.recipientName} · {activeOrder.address.phone})
                </p>
                {activeOrder.address.landmark && (
                  <p className="text-[11px] text-amber-800">
                    <strong>จุดสังเกต:</strong> {activeOrder.address.landmark}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200 space-y-1">
                  {activeOrder.items.map((it) => (
                    <div key={it.productId} className="flex justify-between text-slate-700">
                      <span>
                        {it.productName} <strong className="text-slate-900">x{it.quantity}</strong>
                      </span>
                      <span className="font-semibold tabular-nums">฿{it.subtotal}</span>
                    </div>
                  ))}
                  {activeOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>ส่วนลดโปรโมชั่น / M-Stamp</span>
                      <span>-฿{activeOrder.discount}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
                    <span>ยอดชำระสุทธิ</span>
                    <span className="text-[#EE3124] tabular-nums">฿{activeOrder.grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isInlineView) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto">{innerContent}</div>
    </div>
  );
};
