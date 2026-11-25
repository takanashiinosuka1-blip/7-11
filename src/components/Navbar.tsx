import React from 'react';
import {
  MapPin,
  ShoppingBag,
  RefreshCw,
  Bike,
  Flame,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  DeliveryAddress,
  Branch,
  DeliverySchedule,
  BranchLockEvaluation,
} from '../utils/inventory.ts';

interface NavbarProps {
  currentAddress: DeliveryAddress;
  currentBranch: Branch;
  currentBranchLock?: BranchLockEvaluation;
  branchDistanceKm: number;
  deliverySchedule: DeliverySchedule;
  activeOrdersCount: number;
  cartCount: number;
  cartTotal: number;
  allMemberPoints: number;
  mStampCount: number;
  activeView: 'shop' | 'promotions' | 'inventory' | 'orders' | 'audit';
  setActiveView: (view: 'shop' | 'promotions' | 'inventory' | 'orders' | 'audit') => void;
  onOpenAddressModal: () => void;
  onOpenCartDrawer: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentAddress,
  currentBranch,
  currentBranchLock,
  activeOrdersCount,
  cartCount,
  cartTotal,
  allMemberPoints,
  mStampCount,
  activeView,
  setActiveView,
  onOpenAddressModal,
  onOpenCartDrawer,
}) => {
  const isLocked = currentBranchLock?.isLocked ?? false;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Skip Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:text-xs focus:font-bold"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      {/* 7-Eleven Tricolor Top Bar */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#007A3D]" />
        <div className="h-full w-1/3 bg-[#EE3124]" />
        <div className="h-full w-1/3 bg-[#F58220]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView('shop')}
            className="flex items-center gap-2.5 text-left shrink-0 focus:outline-hidden"
            aria-label="ไปที่หน้าหลัก 7-Delivery"
          >
            <div className="w-9 h-9 rounded-lg bg-[#007A3D] flex items-center justify-center font-bold text-white">
              <span className="text-lg tracking-tighter text-[#F58220]">7</span>
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight whitespace-nowrap">
              7-DELIVERY
            </span>
          </button>

          {/* Location & Branch Selector */}
          <button
            type="button"
            onClick={onOpenAddressModal}
            aria-label="เลือกที่อยู่จัดส่งและสาขา"
            className="taste-btn flex items-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-left max-w-[280px] xl:max-w-[360px] shrink truncate"
          >
            <MapPin className="w-4 h-4 text-[#007A3D] shrink-0" />
            <div className="truncate text-xs">
              <span className="font-bold text-slate-900">{currentAddress.label}: </span>
              <span className="text-slate-600">{currentAddress.street}</span>
              <span className="mx-1.5 text-slate-400">·</span>
              <span
                className={`font-bold inline-flex items-center gap-0.5 tabular-nums ${
                  isLocked ? 'text-rose-600' : 'text-[#007A3D]'
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3 h-3 inline" />
                ) : (
                  <Unlock className="w-3 h-3 inline" />
                )}
                {currentBranch.activeOrders ?? 0}/{currentBranch.maxOrderCapacity ?? 70}
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView('shop')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeView === 'shop'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              หน้าร้าน
            </button>
            <button
              type="button"
              onClick={() => setActiveView('promotions')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeView === 'promotions'
                  ? 'bg-[#EE3124] text-white'
                  : 'text-[#EE3124] hover:bg-red-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>สินค้าโปรโมชั่น</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('inventory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeView === 'inventory'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#007A3D]" />
              <span>ล็อคสาขา & สต๊อก</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeView === 'orders'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5 text-[#F58220]" />
              <span>ติดตามส่งของ ({activeOrdersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('audit')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeView === 'audit'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สรุประบบ
            </button>
          </nav>

          {/* Member Points & Cart Action */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <span className="font-bold text-[#007A3D] tabular-nums">
                {allMemberPoints.toLocaleString()} แต้ม
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-bold text-amber-600 tabular-nums">
                {mStampCount} แสตมป์
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenCartDrawer}
              aria-label={`เปิดตะกร้าสินค้า ${cartCount} รายการ รวม ${cartTotal} บาท`}
              className="taste-btn relative flex items-center gap-2 px-3.5 py-2.5 bg-[#007A3D] hover:bg-[#006834] text-white rounded-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-bold tabular-nums">฿{cartTotal.toLocaleString()}</span>
              {cartCount > 0 && (
                <span className="bg-[#EE3124] text-white font-bold text-[11px] px-1.5 py-0.5 rounded-md min-w-5 text-center tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
