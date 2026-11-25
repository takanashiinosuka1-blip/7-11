import React, { useState } from 'react';
import {
  X,
  MapPin,
  Crosshair,
  Building2,
  Home,
  Briefcase,
  Plus,
  Check,
  Store,
  Navigation,
  Clock,
  Trash2,
  Edit3,
  Search,
  ZoomIn,
  ZoomOut,
  Layers,
  ShieldCheck,
  Flame,
  CalendarClock,
  UserCheck,
  Package,
  DoorOpen,
  Lock,
  Unlock,
  Zap,
  Sliders,
} from 'lucide-react';
import {
  DeliveryAddress,
  Branch,
  DeliverySchedule,
  DropOffMethod,
  calculateDistance,
  findNearestBranch,
  findNearestAvailableBranch,
  evaluateBranchLockStatus,
  validateDeliveryAddress,
  calculateDeliveryTimeEstimate,
} from '../utils/inventory.ts';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: DeliveryAddress;
  savedAddresses: DeliveryAddress[];
  branches: Branch[];
  selectedBranchId: string;
  deliverySchedule: DeliverySchedule;
  onUpdateSchedule: (schedule: DeliverySchedule) => void;
  onSelectAddress: (address: DeliveryAddress) => void;
  onSaveNewAddress: (address: DeliveryAddress) => void;
  onUpdateAddress: (address: DeliveryAddress) => void;
  onDeleteAddress: (addressId: string) => void;
  onSetDefaultAddress: (addressId: string) => void;
  onSelectBranch: (branchId: string) => void;
  onAdjustBranchOrders?: (branchId: string, delta: number) => void;
  onSetBranchOrders?: (branchId: string, ordersCount: number) => void;
  onApplyOrderScenario?: (
    ordersByBranchId: Record<string, number>,
    scenarioTitle: string
  ) => void;
}

const PRESET_LOCATIONS = [
  { name: 'อโศกมนตรี (Ideo Asoke / มศว)', lat: 13.7430, lng: 100.5628, soi: 'สุขุมวิท 21', subDistrict: 'คลองเตยเหนือ' },
  { name: 'แยกอโศก (Terminal 21 / เสริมมิตร)', lat: 13.7395, lng: 100.5610, soi: 'สุขุมวิท 21 ซอย 1', subDistrict: 'คลองเตยเหนือ' },
  { name: 'พร้อมพงษ์ (สุขุมวิท 39 / เอ็มควอเทียร์)', lat: 13.7312, lng: 100.5705, soi: 'สุขุมวิท 39', subDistrict: 'คลองตันเหนือ' },
  { name: 'ทองหล่อ ซอย 4 (สุขุมวิท 55)', lat: 13.7275, lng: 100.5810, soi: 'ทองหล่อ 4', subDistrict: 'คลองตันเหนือ' },
  { name: 'สีลม (อาคาร ซี.พี. ทาวเวอร์)', lat: 13.7278, lng: 100.5312, soi: 'สีลม', subDistrict: 'สีลม' },
];

const SCHEDULE_TIME_SLOTS = [
  'วันนี้ 21:30 - 22:00 น.',
  'วันนี้ 22:00 - 22:30 น.',
  'วันนี้ 22:30 - 23:00 น.',
  'พรุ่งนี้เช้า 07:00 - 07:30 น.',
  'พรุ่งนี้เช้า 08:00 - 08:30 น.',
  'พรุ่งนี้เที่ยง 12:00 - 12:30 น.',
];

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  savedAddresses,
  branches,
  selectedBranchId,
  deliverySchedule,
  onUpdateSchedule,
  onSelectAddress,
  onSaveNewAddress,
  onUpdateAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  onSelectBranch,
  onAdjustBranchOrders,
  onSetBranchOrders,
  onApplyOrderScenario,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'saved' | 'map' | 'custom' | 'time'>('saved');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Interactive Map State
  const [mapPin, setMapPin] = useState<{ lat: number; lng: number }>({
    lat: currentAddress.lat,
    lng: currentAddress.lng,
  });
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapStyle, setMapStyle] = useState<'street' | 'hybrid'>('street');
  const [mapSearchText, setMapSearchText] = useState<string>('');

  // Custom Address Form State
  const [formData, setFormData] = useState<Partial<DeliveryAddress>>({
    label: 'คอนโด',
    recipientName: currentAddress.recipientName || 'ธนพัฒน์ ยิ่งเจริญ',
    phone: currentAddress.phone || '089-123-4567',
    houseNumber: '',
    buildingOrVillage: '',
    floor: '',
    roomNumber: '',
    soi: 'สุขุมวิท 21',
    street: 'ถนนอโศกมนตรี',
    subDistrict: 'คลองเตยเหนือ',
    district: 'วัฒนา',
    province: 'กรุงเทพมหานคร',
    postalCode: '10110',
    landmark: '',
    riderNotes: '',
    dropOffMethod: 'leave_at_lobby',
    lat: mapPin.lat,
    lng: mapPin.lng,
    isDefault: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);

  // Branch Lock Summary & Active Coordinates
  const branchLockSummary = evaluateBranchLockStatus(branches);
  const activeLat = activeTab === 'custom' || activeTab === 'map' ? mapPin.lat : currentAddress.lat;
  const activeLng = activeTab === 'custom' || activeTab === 'map' ? mapPin.lng : currentAddress.lng;
  const nearestCalculation = findNearestAvailableBranch(branches, activeLat, activeLng);
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || nearestCalculation.branch;
  const currentBranchLock = branchLockSummary.evaluations[currentBranch.id];
  const currentBranchDistKm = calculateDistance(activeLat, activeLng, currentBranch.lat, currentBranch.lng);
  const timeEstimate = calculateDeliveryTimeEstimate(currentBranchDistKm, 3, true);

  // Start editing an existing saved address
  const handleStartEdit = (addr: DeliveryAddress) => {
    setEditingAddressId(addr.id);
    setMapPin({ lat: addr.lat, lng: addr.lng });
    setFormData({ ...addr });
    setFormErrors({});
    setActiveTab('custom');
  };

  // Start adding a brand new address
  const handleStartAddNew = () => {
    setEditingAddressId(null);
    setFormData({
      label: 'คอนโด',
      recipientName: currentAddress.recipientName || 'ธนพัฒน์ ยิ่งเจริญ',
      phone: currentAddress.phone || '089-123-4567',
      houseNumber: '',
      buildingOrVillage: '',
      floor: '',
      roomNumber: '',
      soi: '',
      street: '',
      subDistrict: 'คลองเตยเหนือ',
      district: 'วัฒนา',
      province: 'กรุงเทพมหานคร',
      postalCode: '10110',
      landmark: '',
      riderNotes: '',
      dropOffMethod: 'hand_to_hand',
      lat: mapPin.lat,
      lng: mapPin.lng,
      isDefault: false,
    });
    setFormErrors({});
    setActiveTab('custom');
  };

  // Handle Map Click to Reposition Pin
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;

    const newLng = 100.52 + normalizedX * (100.59 - 100.52);
    const newLat = 13.76 - normalizedY * (13.76 - 13.72);

    const clampedLat = Math.round(newLat * 10000) / 10000;
    const clampedLng = Math.round(newLng * 10000) / 10000;

    setMapPin({ lat: clampedLat, lng: clampedLng });
    setFormData((prev) => ({
      ...prev,
      lat: clampedLat,
      lng: clampedLng,
    }));

    // Auto-match closest unlocked branch
    const nearest = findNearestAvailableBranch(branches, clampedLat, clampedLng);
    onSelectBranch(nearest.branch.id);
  };

  const handleSimulateGPS = () => {
    setIsLocating(true);
    setTimeout(() => {
      const accurateGps = { lat: 13.7432, lng: 100.5630 };
      setMapPin(accurateGps);
      setFormData((prev) => ({
        ...prev,
        lat: accurateGps.lat,
        lng: accurateGps.lng,
      }));
      const nearest = findNearestAvailableBranch(branches, accurateGps.lat, accurateGps.lng);
      onSelectBranch(nearest.branch.id);
      setIsLocating(false);
    }, 350);
  };

  const handleJumpToPreset = (loc: typeof PRESET_LOCATIONS[0]) => {
    setMapPin({ lat: loc.lat, lng: loc.lng });
    setFormData((prev) => ({
      ...prev,
      lat: loc.lat,
      lng: loc.lng,
      soi: loc.soi,
      subDistrict: loc.subDistrict,
    }));
    const nearest = findNearestAvailableBranch(branches, loc.lat, loc.lng);
    onSelectBranch(nearest.branch.id);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateDeliveryAddress(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    const fullAddress: DeliveryAddress = {
      id: editingAddressId || `addr-${Date.now()}`,
      label: formData.label || 'บ้าน',
      recipientName: formData.recipientName || 'ผู้รับ',
      phone: formData.phone || '',
      houseNumber: formData.houseNumber || '',
      buildingOrVillage: formData.buildingOrVillage || '',
      floor: formData.floor || '',
      roomNumber: formData.roomNumber || '',
      soi: formData.soi || '',
      street: formData.street || '',
      subDistrict: formData.subDistrict || '',
      district: formData.district || '',
      province: formData.province || 'กรุงเทพมหานคร',
      postalCode: formData.postalCode || '10110',
      landmark: formData.landmark || '',
      riderNotes: formData.riderNotes || '',
      dropOffMethod: formData.dropOffMethod || 'hand_to_hand',
      lat: mapPin.lat,
      lng: mapPin.lng,
      isDefault: formData.isDefault,
    };

    if (editingAddressId) {
      onUpdateAddress(fullAddress);
    } else {
      onSaveNewAddress(fullAddress);
    }
    onSelectAddress(fullAddress);
    onSelectBranch(nearestCalculation.branch.id);
    setEditingAddressId(null);
    onClose();
  };

  const filteredPresets = PRESET_LOCATIONS.filter(
    (p) =>
      !mapSearchText.trim() ||
      p.name.toLowerCase().includes(mapSearchText.toLowerCase()) ||
      p.soi.toLowerCase().includes(mapSearchText.toLowerCase())
  );

  const getDropOffLabel = (method?: DropOffMethod) => {
    if (method === 'leave_at_lobby') return 'ฝากไว้ที่ล็อบบี้/จุดรับของ';
    if (method === 'hang_at_gate') return 'แขวนไว้ที่ประตู/รั้ว';
    return 'รับกับมือไรเดอร์';
  };

  // Convert lat/lng to SVG percentages
  const toMapCoord = (lat: number, lng: number) => {
    const normX = (lng - 100.52) / (100.59 - 100.52);
    const normY = (13.76 - lat) / (13.76 - 13.72);
    return {
      x: Math.max(6, Math.min(94, normX * 100)),
      y: Math.max(6, Math.min(94, normY * 100)),
    };
  };

  const userPinPos = toMapCoord(mapPin.lat, mapPin.lng);
  const selectedBranchPos = toMapCoord(currentBranch.lat, currentBranch.lng);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#007A3D] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                จัดการที่อยู่จัดส่ง แผนที่ปักหมุด & ตั้งเวลาส่งสินค้า
              </h2>
              <p className="text-xs text-slate-500">
                ระบุพิกัดแม่นยำ พร้อมเลือกเวลารับสินค้าและรูปแบบการวางส่งได้ตามต้องการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-100/80 p-1.5 gap-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'saved'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-emerald-600" />
            <span>สมุดที่อยู่ ({savedAddresses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'map'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>ปักหมุดแผนที่ & สาขา</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab !== 'custom') handleStartAddNew();
            }}
            className={`py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'custom'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>{editingAddressId ? 'แก้ไขที่อยู่' : 'เพิ่มที่อยู่ละเอียด'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'time'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>ตั้งเวลาจัดส่ง</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: SAVED ADDRESSES BOOK WITH FULL CRUD */}
          {activeTab === 'saved' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  เลือกที่อยู่สำหรับจัดส่ง หรือแก้ไขรายละเอียดตึก/ห้อง/จุดสังเกต:
                </span>
                <button
                  type="button"
                  onClick={handleStartAddNew}
                  className="px-3 py-1.5 bg-[#007A3D] hover:bg-[#006834] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มที่อยู่ใหม่
                </button>
              </div>

              <div className="space-y-3">
                {savedAddresses.map((addr) => {
                  const isSelected = currentAddress.id === addr.id;
                  const nearBranch = findNearestBranch(branches, addr.lat, addr.lng);
                  const eta = calculateDeliveryTimeEstimate(nearBranch.distanceKm, 2, true);

                  return (
                    <div
                      key={addr.id}
                      onClick={() => {
                        onSelectAddress(addr);
                        setMapPin({ lat: addr.lat, lng: addr.lng });
                        onSelectBranch(nearBranch.branch.id);
                      }}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                        isSelected
                          ? 'border-[#007A3D] bg-emerald-50/50 shadow-xs ring-1 ring-[#007A3D]'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-[#007A3D] text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {addr.label === 'บ้าน' ? (
                            <Home className="w-4 h-4" />
                          ) : addr.label === 'ที่ทำงาน' ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                ค่าเริ่มต้น
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {getDropOffLabel(addr.dropOffMethod)}
                            </span>
                            <span className="text-xs text-slate-500">
                              ผู้รับ: {addr.recipientName} ({addr.phone})
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            {addr.houseNumber}
                            {addr.buildingOrVillage ? ` ${addr.buildingOrVillage}` : ''}
                            {addr.floor ? ` ชั้น ${addr.floor}` : ''}
                            {addr.roomNumber && addr.roomNumber !== '-' ? ` ห้อง ${addr.roomNumber}` : ''}
                            {addr.soi ? ` ซ.${addr.soi}` : ''} {addr.street} {addr.subDistrict} {addr.district}{' '}
                            {addr.province} {addr.postalCode}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-0.5">
                            {addr.landmark && (
                              <span className="text-amber-800">
                                <strong>จุดสังเกต:</strong> {addr.landmark}
                              </span>
                            )}
                            {addr.riderNotes && (
                              <span className="text-slate-500">
                                <strong>โน้ตไรเดอร์:</strong> {addr.riderNotes}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-800 font-medium">
                            <Store className="w-3.5 h-3.5 text-[#007A3D]" />
                            <span>
                              จัดส่งโดย {nearBranch.branch.name} (ห่าง {nearBranch.distanceKm} กม. · ถึงใน ~{eta.totalMinutes} นาที)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CRUD Action Buttons */}
                      <div
                        className="flex sm:flex-col items-center sm:items-end justify-end gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(addr)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                          {savedAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteAddress(addr.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                              title="ลบที่อยู่นี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => onSetDefaultAddress(addr.id)}
                            className="text-[11px] text-emerald-700 hover:underline font-medium"
                          >
                            ตั้งเป็นค่าเริ่มต้น
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ENHANCED INTERACTIVE PIN MAP & ROUTE PREVIEW */}
          {(activeTab === 'map' || activeTab === 'custom') && (
            <div className="space-y-3.5">
              {/* Search & GPS Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mapSearchText}
                    onChange={(e) => setMapSearchText(e.target.value)}
                    placeholder="ค้นหาชื่อคอนโด, อาคาร, ซอย หรือถนนเพื่อย้ายหมุด..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMapStyle(mapStyle === 'street' ? 'hybrid' : 'street')}
                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{mapStyle === 'street' ? 'โหมดดาวเทียม' : 'โหมดแผนที่ถนน'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateGPS}
                    disabled={isLocating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'กำลังระบุพิกัด...' : 'ดึงพิกัด GPS ปัจจุบัน'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Matching Landmarks Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">จุดสำคัญใกล้เคียง:</span>
                {filteredPresets.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleJumpToPreset(loc)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg text-slate-700 text-[11px] font-medium border border-slate-200/80 transition-colors"
                  >
                    {loc.name}
                  </button>
                ))}
              </div>

              {/* Interactive Map Viewport with Route Line & Zoom */}
              <div
                onClick={handleMapClick}
                className="relative h-64 sm:h-72 w-full rounded-2xl border border-slate-300 overflow-hidden cursor-crosshair select-none shadow-inner"
              >
                <div
                  className="w-full h-full transition-transform duration-200 origin-center"
                  style={{ transform: `scale(${mapZoom})` }}
                >
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="mapGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                        <path
                          d="M 36 0 L 0 0 0 36"
                          fill="none"
                          stroke={mapStyle === 'hybrid' ? '#334155' : '#D1D5DB'}
                          strokeWidth="0.8"
                        />
                      </pattern>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill={mapStyle === 'hybrid' ? '#0F172A' : '#EEF2F6'}
                    />
                    <rect width="100%" height="100%" fill="url(#mapGrid)" />

                    {/* Roads Network */}
                    <line x1="0" y1="200" x2="100%" y2="120" stroke={mapStyle === 'hybrid' ? '#475569' : '#CBD5E1'} strokeWidth="20" />
                    <line x1="0" y1="200" x2="100%" y2="120" stroke={mapStyle === 'hybrid' ? '#1E293B' : '#FFFFFF'} strokeWidth="14" />
                    <line x1="280" y1="0" x2="280" y2="100%" stroke={mapStyle === 'hybrid' ? '#475569' : '#CBD5E1'} strokeWidth="18" />
                    <line x1="280" y1="0" x2="280" y2="100%" stroke={mapStyle === 'hybrid' ? '#1E293B' : '#FFFFFF'} strokeWidth="12" />
                    <line x1="430" y1="20" x2="430" y2="100%" stroke={mapStyle === 'hybrid' ? '#475569' : '#CBD5E1'} strokeWidth="12" />
                    <line x1="430" y1="20" x2="430" y2="100%" stroke={mapStyle === 'hybrid' ? '#1E293B' : '#FFFFFF'} strokeWidth="8" />
                    <line x1="0" y1="45" x2="100%" y2="45" stroke={mapStyle === 'hybrid' ? '#475569' : '#CBD5E1'} strokeWidth="14" />
                    <line x1="0" y1="45" x2="100%" y2="45" stroke={mapStyle === 'hybrid' ? '#1E293B' : '#FFFFFF'} strokeWidth="9" />

                    {/* Green Park Zone */}
                    <rect
                      x="45"
                      y="70"
                      width="125"
                      height="80"
                      rx="14"
                      fill={mapStyle === 'hybrid' ? '#064E3B' : '#D1E7DD'}
                      opacity="0.85"
                    />
                    <text
                      x="65"
                      y="115"
                      fill={mapStyle === 'hybrid' ? '#6EE7B7' : '#0F5132'}
                      fontSize="11"
                      fontWeight="bold"
                    >
                      สวนเบญจกิติ
                    </text>

                    {/* Street Labels */}
                    <text x="292" y="88" fill={mapStyle === 'hybrid' ? '#94A3B8' : '#475569'} fontSize="10" fontWeight="600">
                      ถ.อโศกมนตรี (สุขุมวิท 21)
                    </text>
                    <text x="75" y="182" fill={mapStyle === 'hybrid' ? '#94A3B8' : '#475569'} fontSize="10" fontWeight="600">
                      ถ.สุขุมวิท (แนวรถไฟฟ้า BTS)
                    </text>
                    <text x="440" y="80" fill={mapStyle === 'hybrid' ? '#94A3B8' : '#475569'} fontSize="10">
                      ซ.สุขุมวิท 39 (พร้อมพงษ์)
                    </text>

                    {/* Active Route Line from Selected 7-Eleven Branch to User Pin */}
                    <line
                      x1={`${selectedBranchPos.x}%`}
                      y1={`${selectedBranchPos.y}%`}
                      x2={`${userPinPos.x}%`}
                      y2={`${userPinPos.y}%`}
                      stroke="#007A3D"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                    />
                  </svg>

                  {/* 7-Eleven Store Pins with Live Lock & Order Count Status */}
                  {branches.map((b) => {
                    const pos = toMapCoord(b.lat, b.lng);
                    const isSelectedBranch = currentBranch.id === b.id;
                    const bEval = branchLockSummary.evaluations[b.id];
                    const isBranchLocked = bEval?.isLocked ?? false;

                    return (
                      <div
                        key={b.id}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBranch(b.id);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg shadow-md text-[10px] font-bold border transition-all ${
                            isBranchLocked
                              ? 'bg-rose-600 text-white border-rose-200 opacity-95'
                              : isSelectedBranch
                              ? 'bg-[#007A3D] text-white border-white scale-110 ring-4 ring-emerald-500/30'
                              : 'bg-white text-slate-800 border-slate-300 hover:scale-105'
                          }`}
                        >
                          {isBranchLocked ? (
                            <Lock className="w-2.5 h-2.5 text-amber-200" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#F58220]" />
                          )}
                          <span>
                            {b.branchType === 'main' ? 'สาขาใหญ่' : 'ย่อย'} #{b.code} (
                            {b.activeOrders ?? 0}/{b.maxOrderCapacity ?? 70})
                          </span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Customer Target Pin */}
                  <div
                    style={{ left: `${userPinPos.x}%`, top: `${userPinPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-full z-20 pointer-events-none transition-all duration-150"
                  >
                    <div className="flex flex-col items-center">
                      <div className="bg-[#EE3124] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap mb-0.5 border border-white">
                        หมุดรับสินค้า ({currentBranchDistKm} กม. จากสาขา)
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#EE3124] text-white flex items-center justify-center shadow-lg ring-4 ring-red-500/30">
                        <MapPin className="w-4 h-4 fill-white" />
                      </div>
                      <div className="w-2 h-2 rounded-full bg-slate-900 mt-0.5" />
                    </div>
                  </div>
                </div>

                {/* Zoom Controls Overlay */}
                <div
                  className="absolute right-3 bottom-3 flex flex-col gap-1 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setMapZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))}
                    className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center"
                    aria-label="ซูมเข้า"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom((z) => Math.max(1.0, +(z - 0.2).toFixed(1)))}
                    className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200 flex items-center justify-center"
                    aria-label="ซูมออก"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Live Coordinates & Coverage Status */}
                <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-xs text-[11px] text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs flex items-center gap-2">
                  <span className="font-mono font-semibold">
                    {mapPin.lat.toFixed(4)}, {mapPin.lng.toFixed(4)}
                  </span>
                  <span className="text-emerald-700 font-bold">
                    · เปิดรับ {branchLockSummary.unlockedCount}/4 สาขา
                  </span>
                </div>
              </div>

              {/* BRANCH ORDER SCENARIO SIMULATOR RIGHT INSIDE THE MAP TAB */}
              {onApplyOrderScenario && (
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-slate-950" />
                        จำลองสถานการณ์ยอด Order สาขาบนแผนที่
                      </span>
                      <span className="text-[11px] text-slate-300">
                        กดปุ่มเพื่อจำลองการล็อค/ปลดล็อคสาขาและดูการเปลี่ยนเส้นทางบนแผนที่ทันที
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-300">
                      เฉลี่ยสาขาย่อย: {branchLockSummary.avgSubOrders} Order
                    </span>
                  </div>

                  {/* 6 Scenario Buttons Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      {
                        label: '1. มีย่อย Order = 0 (ล็อคสาขาอื่น)',
                        sub: 'ใหญ่=35, ย่อย1=25, ย่อย2=22, สีลม=0',
                        orders: {
                          'branch-asoke': 35,
                          'branch-phromphong': 25,
                          'branch-thonglor': 22,
                          'branch-silom': 0,
                        },
                      },
                      {
                        label: '2. ย่อย < 40 Order (ล็อคสาขาใหญ่)',
                        sub: 'ใหญ่=32, ย่อย1=22, ย่อย2=20, สีลม=21',
                        orders: {
                          'branch-asoke': 32,
                          'branch-phromphong': 22,
                          'branch-thonglor': 20,
                          'branch-silom': 21,
                        },
                      },
                      {
                        label: '3. ย่อยยอดห่างกัน (ล็อคย่อยที่นำโด่ง)',
                        sub: 'ใหญ่=35, ย่อย1=32, ย่อย2=28, สีลม=14',
                        orders: {
                          'branch-asoke': 35,
                          'branch-phromphong': 32,
                          'branch-thonglor': 28,
                          'branch-silom': 14,
                        },
                      },
                      {
                        label: '4. ย่อยเฉลี่ยใกล้เคียงกัน (ปลดล็อคทั้งหมด)',
                        sub: 'ใหญ่=48, ย่อย1=34, ย่อย2=32, สีลม=33',
                        orders: {
                          'branch-asoke': 48,
                          'branch-phromphong': 34,
                          'branch-thonglor': 32,
                          'branch-silom': 33,
                        },
                      },
                      {
                        label: '5. ย่อยทุกสาขา ≥ 40 (ปลดล็อคสาขาใหญ่)',
                        sub: 'ใหญ่=45, ย่อย1=42, ย่อย2=44, สีลม=41',
                        orders: {
                          'branch-asoke': 45,
                          'branch-phromphong': 42,
                          'branch-thonglor': 44,
                          'branch-silom': 41,
                        },
                      },
                      {
                        label: '6. สาขาใหญ่เต็ม 70 Order (ล็อคสาขาใหญ่)',
                        sub: 'ใหญ่=70 (เต็ม), ย่อย1=42, ย่อย2=41, สีลม=43',
                        orders: {
                          'branch-asoke': 70,
                          'branch-phromphong': 42,
                          'branch-thonglor': 41,
                          'branch-silom': 43,
                        },
                      },
                    ].map((scen) => (
                      <button
                        key={scen.label}
                        type="button"
                        onClick={() => onApplyOrderScenario(scen.orders, scen.label)}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-emerald-500/25 border border-white/15 hover:border-emerald-400 text-left transition-all"
                      >
                        <div className="text-[11px] font-extrabold text-amber-300">
                          {scen.label}
                        </div>
                        <div className="text-[10px] text-slate-300 mt-0.5">{scen.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* INTERACTIVE BRANCH SELECTION CARDS WITH ORDER CONTROLS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#007A3D]" />
                    <span>เลือกสาขาจัดส่งบนแผนที่ & ปรับยอด Order รายสาขา:</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    คลิกเลือกสาขาหรือกดปุ่ม +/- เพื่อทดสอบการล็อคสาขา
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {branches.map((b) => {
                    const bEval = branchLockSummary.evaluations[b.id];
                    const isLocked = bEval?.isLocked ?? false;
                    const isSelected = currentBranch.id === b.id;
                    const dist = calculateDistance(activeLat, activeLng, b.lat, b.lng);
                    const isMain = b.branchType === 'main';

                    return (
                      <div
                        key={b.id}
                        onClick={() => onSelectBranch(b.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                          isLocked
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : isSelected
                            ? 'bg-emerald-50/80 border-[#007A3D] ring-1 ring-[#007A3D]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                isMain
                                  ? 'bg-amber-100 text-amber-950'
                                  : 'bg-sky-100 text-sky-900'
                              }`}
                            >
                              {isMain ? 'สาขาใหญ่' : 'สาขาย่อย'} · ห่าง {dist} กม.
                            </span>

                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1 ${
                                isLocked
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>ล็อคชั่วคราว</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-2.5 h-2.5" />
                                  <span>เปิดรับออเดอร์</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {b.name}
                            </span>
                            <span className="font-extrabold text-sm tabular-nums shrink-0">
                              {b.activeOrders ?? 0}/{b.maxOrderCapacity ?? 70} Order
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-600 line-clamp-1">
                            {bEval?.lockReason}
                          </p>
                        </div>

                        {/* Quick Order Adjust Buttons inside Map Branch Card */}
                        {onAdjustBranchOrders && onSetBranchOrders && (
                          <div
                            className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onSetBranchOrders(b.id, 0)}
                                className="px-1.5 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold"
                              >
                                เซ็ต 0
                              </button>
                              <button
                                type="button"
                                onClick={() => onAdjustBranchOrders(b.id, -5)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                onClick={() => onAdjustBranchOrders(b.id, 5)}
                                className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => onSetBranchOrders(b.id, isMain ? 70 : 42)}
                                className="px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold"
                              >
                                {isMain ? 'เซ็ต 70' : 'เซ็ต 42'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectBranch(b.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isSelected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-[#007A3D] text-white'
                              }`}
                            >
                              {isSelected ? 'เลือกอยู่ ✓' : 'เลือกสาขานี้'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Branch & ETA Summary Card */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  currentBranchLock?.isLocked
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 mt-0.5 ${
                      currentBranchLock?.isLocked ? 'bg-rose-600' : 'bg-[#007A3D]'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {currentBranch.name}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        ระยะทาง {currentBranchDistKm} กม.
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          currentBranchLock?.isLocked
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {currentBranchLock?.statusBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {currentBranchLock?.lockReason}
                    </p>
                    <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                      เวลาเตรียมสินค้า ~{timeEstimate.prepMinutes} นาที + เดินทาง ~
                      {timeEstimate.travelMinutes} นาที (ถึงประมาณ {timeEstimate.etaWindowText})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILED ADDRESS FORM (ADD / EDIT) */}
          {activeTab === 'custom' && (
            <form onSubmit={handleSaveForm} className="space-y-4 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {editingAddressId ? 'แก้ไขข้อมูลที่อยู่จัดส่ง' : 'กรอกรายละเอียดที่อยู่ใหม่ (ระบุตึก/ชั้น/ห้อง/จุดสังเกต)'}
                </span>
                <span className="text-[11px] text-rose-500">* ข้อมูลจำเป็น</span>
              </div>

              {/* Place Type */}
              <div className="grid grid-cols-4 gap-2">
                {(['คอนโด', 'บ้าน', 'ที่ทำงาน', 'อื่นๆ'] as const).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setFormData({ ...formData, label: lbl })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      formData.label === lbl
                        ? 'border-[#007A3D] bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lbl === 'บ้าน' && <Home className="w-3.5 h-3.5" />}
                    {lbl === 'ที่ทำงาน' && <Briefcase className="w-3.5 h-3.5" />}
                    {lbl === 'คอนโด' && <Building2 className="w-3.5 h-3.5" />}
                    <span>{lbl}</span>
                  </button>
                ))}
              </div>

              {/* Recipient & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อผู้รับสินค้า <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.recipientName}
                    onChange={(e) => {
                      setFormData({ ...formData, recipientName: e.target.value });
                      if (formErrors.recipientName) setFormErrors({ ...formErrors, recipientName: '' });
                    }}
                    placeholder="เช่น ธนพัฒน์ ยิ่งเจริญ"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  {formErrors.recipientName && (
                    <span className="text-[10px] text-rose-500 mt-0.5 block">{formErrors.recipientName}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    placeholder="เช่น 089-123-4567"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  {formErrors.phone && (
                    <span className="text-[10px] text-rose-500 mt-0.5 block">{formErrors.phone}</span>
                  )}
                </div>
              </div>

              {/* House No, Building, Floor, Room */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    บ้านเลขที่ / ชื่อคอนโด / โครงการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.houseNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, houseNumber: e.target.value });
                      if (formErrors.houseNumber) setFormErrors({ ...formErrors, houseNumber: '' });
                    }}
                    placeholder="เช่น เลขที่ 128/45 คอนโด Ideo Asoke"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                  {formErrors.houseNumber && (
                    <span className="text-[10px] text-rose-500 mt-0.5 block">{formErrors.houseNumber}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">อาคาร / ตึก</label>
                  <input
                    type="text"
                    value={formData.buildingOrVillage}
                    onChange={(e) => setFormData({ ...formData, buildingOrVillage: e.target.value })}
                    placeholder="เช่น อาคาร A"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ชั้น</label>
                    <input
                      type="text"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      placeholder="14"
                      className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">เลขห้อง</label>
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder="1402"
                      className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Soi & Subdistrict */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">ซอย / ถนน</label>
                  <input
                    type="text"
                    value={formData.soi}
                    onChange={(e) => setFormData({ ...formData, soi: e.target.value })}
                    placeholder="เช่น ซอยสุขุมวิท 21 (อโศกมนตรี)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    แขวง / ตำบล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subDistrict}
                    onChange={(e) => setFormData({ ...formData, subDistrict: e.target.value })}
                    placeholder="เช่น คลองเตยเหนือ"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Drop-off Method Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  รูปแบบการรับมอบสินค้า (Drop-off Instruction)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, dropOffMethod: 'hand_to_hand' })}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      formData.dropOffMethod === 'hand_to_hand'
                        ? 'border-[#007A3D] bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-[#007A3D] shrink-0" />
                    <span>รับกับมือไรเดอร์โดยตรง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, dropOffMethod: 'leave_at_lobby' })}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      formData.dropOffMethod === 'leave_at_lobby'
                        ? 'border-[#007A3D] bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Package className="w-4 h-4 text-[#007A3D] shrink-0" />
                    <span>ฝากไว้ที่ล็อบบี้ / จุดวางของ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, dropOffMethod: 'hang_at_gate' })}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                      formData.dropOffMethod === 'hang_at_gate'
                        ? 'border-[#007A3D] bg-emerald-50 text-emerald-950 font-semibold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <DoorOpen className="w-4 h-4 text-[#007A3D] shrink-0" />
                    <span>วางหน้าห้อง / แขวนที่รั้วบ้าน</span>
                  </button>
                </div>
              </div>

              {/* Landmark & Rider Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    จุดสังเกตสำคัญ (ช่วยให้ไรเดอร์หาเจอง่ายขึ้น)
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    placeholder="เช่น อยู่ตรงข้าม มศว ประสานมิตร ประตูรั้วสีขาว"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    คำแนะนำเพิ่มเติมถึงไรเดอร์
                  </label>
                  <input
                    type="text"
                    value={formData.riderNotes}
                    onChange={(e) => setFormData({ ...formData, riderNotes: e.target.value })}
                    placeholder="เช่น โทรแจ้งก่อนถึง 5 นาที, ไม่ต้องกดกริ่ง"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#007A3D] hover:bg-[#006834] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกที่อยู่นี้และใช้จัดส่งทันที</span>
              </button>
            </form>
          )}

          {/* TAB 4: DELIVERY TIME & SCHEDULING MANAGEMENT */}
          {activeTab === 'time' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#007A3D] text-white flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    จัดการเวลาจัดส่งและการเตรียมอาหารร้อน (Time & Prep Control)
                  </h3>
                  <p className="text-xs text-slate-600">
                    เลือกให้จัดส่งด่วนทันที (คำนวณเวลาจริงตามระยะทาง {currentBranchDistKm} กม.) หรือจองคิวเวลาจัดส่งล่วงหน้าได้
                  </p>
                </div>
              </div>

              {/* Express vs Scheduled Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSchedule({
                      ...deliverySchedule,
                      mode: 'express',
                      slotLabel: `ส่งด่วนทันที (${timeEstimate.minMinutes}-${timeEstimate.maxMinutes} นาที)`,
                    })
                  }
                  className={`p-4 rounded-2xl border text-left transition-all space-y-1.5 ${
                    deliverySchedule.mode === 'express'
                      ? 'border-[#007A3D] bg-emerald-50/60 ring-1 ring-[#007A3D]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">⚡ ส่งด่วนทันที (Express)</span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      ถึง ~{timeEstimate.etaWindowText}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    จัดของและอบร้อน {timeEstimate.prepMinutes} นาที · ไรเดอร์เดินทาง {timeEstimate.travelMinutes} นาที
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSchedule({
                      ...deliverySchedule,
                      mode: 'scheduled',
                      slotLabel: SCHEDULE_TIME_SLOTS[0],
                    })
                  }
                  className={`p-4 rounded-2xl border text-left transition-all space-y-1.5 ${
                    deliverySchedule.mode === 'scheduled'
                      ? 'border-[#007A3D] bg-emerald-50/60 ring-1 ring-[#007A3D]'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">🕒 จองเวลาจัดส่งล่วงหน้า</span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      เลือกช่วงเวลาได้
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    ระบุรอบเวลาที่สะดวกรับสินค้าล่วงหน้า พนักงานจะอุ่นอาหารให้ตรงรอบส่ง
                  </p>
                </button>
              </div>

              {/* Time Slot Picker when Scheduled is active */}
              {deliverySchedule.mode === 'scheduled' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    เลือกรอบเวลาที่ต้องการให้จัดส่งถึง:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SCHEDULE_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          onUpdateSchedule({
                            ...deliverySchedule,
                            mode: 'scheduled',
                            slotLabel: slot,
                          })
                        }
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                          deliverySchedule.slotLabel === slot
                            ? 'bg-[#007A3D] text-white border-[#007A3D] font-bold shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Heating & Beverage Prep Preference */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800">
                  การเตรียมอาหารอุ่นร้อนและเครื่องดื่ม All Café:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSchedule({ ...deliverySchedule, heatingPreference: 'heat_now' })
                    }
                    className={`p-3 rounded-xl border text-left space-y-1 ${
                      deliverySchedule.heatingPreference === 'heat_now'
                        ? 'border-[#007A3D] bg-emerald-50 font-semibold text-emerald-950'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Flame className="w-3.5 h-3.5 text-[#EE3124]" />
                      <span>อบร้อนพร้อมทานทันที</span>
                    </div>
                    <p className="text-[11px] text-slate-500">อุ่นแซนวิชและข้าวกล่องก่อนไรเดอร์ออก</p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSchedule({ ...deliverySchedule, heatingPreference: 'separate_ice' })
                    }
                    className={`p-3 rounded-xl border text-left space-y-1 ${
                      deliverySchedule.heatingPreference === 'separate_ice'
                        ? 'border-[#007A3D] bg-emerald-50 font-semibold text-emerald-950'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-bold">🧊 แยกน้ำแข็งเครื่องดื่ม</div>
                    <p className="text-[11px] text-slate-500">ไม่ให้น้ำแข็งละลายระหว่างเดินทาง</p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSchedule({ ...deliverySchedule, heatingPreference: 'no_heat' })
                    }
                    className={`p-3 rounded-xl border text-left space-y-1 ${
                      deliverySchedule.heatingPreference === 'no_heat'
                        ? 'border-[#007A3D] bg-emerald-50 font-semibold text-emerald-950'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-bold">❄️ ไม่ต้องอุ่นร้อน</div>
                    <p className="text-[11px] text-slate-500">เก็บเข้าตู้เย็นไว้อุ่นทานเองภายหลัง</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span>
              จุดส่ง: <strong className="text-slate-900">{currentAddress.label}</strong>
            </span>
            <span>·</span>
            <span>
              เวลาส่ง: <strong className="text-emerald-800">{deliverySchedule.slotLabel}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#007A3D] text-white rounded-xl text-xs font-bold hover:bg-[#006834] transition-colors shadow-xs"
          >
            ยืนยันการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
};
