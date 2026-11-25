import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Truck,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CreditCard,
  QrCode,
  Banknote,
  Wallet,
  AlertTriangle,
  Clock,
  Ticket,
} from 'lucide-react';
import {
  CartItem,
  Product,
  Branch,
  BranchStock,
  DeliveryAddress,
  DeliverySchedule,
  calculateOrderTotals,
} from '../utils/inventory.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  productsMap: Record<string, Product>;
  branchStock: BranchStock;
  currentBranch: Branch;
  currentAddress: DeliveryAddress;
  deliverySchedule: DeliverySchedule;
  activeCouponCode: string | null;
  couponDiscount: number;
  allMemberPoints: number;
  mStampCount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onCheckout: (
    paymentMethod: 'promptpay' | 'truemoney' | 'cod' | 'credit_card',
    mStampsUsed: number
  ) => void;
  onOpenAddressModal: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  productsMap,
  branchStock,
  currentBranch,
  currentAddress,
  deliverySchedule,
  activeCouponCode,
  couponDiscount,
  mStampCount,
  onUpdateQuantity,
  onCheckout,
  onOpenAddressModal,
}) => {
  if (!isOpen) return null;

  const [useMStamps, setUseMStamps] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<
    'promptpay' | 'truemoney' | 'cod' | 'credit_card'
  >('promptpay');

  const stampDiscount = useMStamps ? Math.min(20, mStampCount * 3) : 0;
  const stampsToDeduct = useMStamps ? Math.min(mStampCount, 6) : 0;
  const combinedDiscount = stampDiscount + couponDiscount;

  const totals = calculateOrderTotals(cart, productsMap, combinedDiscount);

  const stockErrors: {
    productId: string;
    productName: string;
    available: number;
    inCart: number;
  }[] = [];
  for (const item of cart) {
    const available = branchStock.stock[item.productId] ?? 0;
    if (item.quantity > available) {
      stockErrors.push({
        productId: item.productId,
        productName: productsMap[item.productId]?.name || 'สินค้า',
        available,
        inCart: item.quantity,
      });
    }
  }

  const hasStockErrors = stockErrors.length > 0;
  const freeDeliveryDiff = Math.max(0, 100 - totals.subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#007A3D] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">ตะกร้าสินค้า 7-Delivery</h2>
              <p className="text-[11px] text-slate-500">
                {cart.length > 0 ? `${totals.totalItemsCount} ชิ้นในตะกร้า` : 'ยังไม่มีสินค้า'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
            aria-label="ปิดตะกร้า"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2.5">
          <Truck className="w-4 h-4 text-[#007A3D] shrink-0" />
          <div className="flex-1 text-xs text-slate-700">
            {freeDeliveryDiff === 0 ? (
              <span className="font-semibold text-emerald-800">
                ยินดีด้วย! คุณได้รับสิทธิ์ <span className="underline">จัดส่งฟรี</span> ในออเดอร์นี้
              </span>
            ) : (
              <span>
                สั่งเพิ่มอีก <strong className="text-[#EE3124] font-bold">฿{freeDeliveryDiff}</strong> เพื่อรับ{' '}
                <span className="font-bold text-emerald-800">จัดส่งฟรี!</span> (ขั้นต่ำ ฿100)
              </span>
            )}
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-[#007A3D] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.subtotal / 100) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Delivery Address & Time Schedule Summary */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <MapPin className="w-3.5 h-3.5 text-[#007A3D] shrink-0" />
              <span className="truncate text-slate-700">
                <strong className="text-slate-900">{currentAddress.label}:</strong>{' '}
                {currentAddress.houseNumber} ({currentBranch.name.replace('สาขา ', '')})
              </span>
            </div>
            <button
              onClick={onOpenAddressModal}
              className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0"
            >
              เปลี่ยนที่อยู่/เวลา
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium pl-5">
            <Clock className="w-3 h-3 shrink-0" />
            <span>รอบเวลาจัดส่ง: {deliverySchedule.slotLabel}</span>
          </div>
        </div>

        {/* Stock Error Notice */}
        {hasStockErrors && (
          <div className="mx-4 my-2 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <AlertTriangle className="w-4 h-4" />
              <span>สต๊อกที่สาขาไม่เพียงพอ</span>
            </div>
            {stockErrors.map((err) => (
              <p key={err.productId} className="text-[11px] text-rose-600">
                • {err.productName}: มีในสต๊อกสาขานี้เพียง {err.available} ชิ้น (ในตะกร้ามี {err.inCart} ชิ้น)
              </p>
            ))}
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">ยังไม่มีสินค้าในตะกร้า</p>
              <p className="text-xs text-slate-400 max-w-xs">
                เลือกสินค้าอร่อยๆ เครื่องดื่มสดชื่น หรือของใช้ประจำวันจาก 7-Eleven ได้เลย
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const product = productsMap[item.productId];
              if (!product) return null;

              const availableStock = branchStock.stock[item.productId] ?? 0;
              const isExceeded = item.quantity > availableStock;

              return (
                <div
                  key={item.productId}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                    isExceeded
                      ? 'border-rose-300 bg-rose-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="font-bold text-[#EE3124] tabular-nums">฿{product.price}</span>
                      {product.mStampEarned && (
                        <span className="text-[10px] text-amber-700 font-medium">
                          +{product.mStampEarned * item.quantity} M-Stamp
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] mt-0.5 text-slate-500">
                      สต๊อกสาขา: {availableStock} ชิ้น
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                      aria-label="ลดจำนวน"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                    </button>
                    <span className="text-xs font-bold text-slate-900 w-5 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= availableStock}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                        item.quantity >= availableStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#007A3D] text-white hover:bg-[#006834]'
                      }`}
                      aria-label="เพิ่มจำนวน"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            {/* Active Coupon Banner */}
            {activeCouponCode && couponDiscount > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <Ticket className="w-4 h-4 text-[#007A3D]" />
                  <span>คูปองโฆษณา {activeCouponCode}</span>
                </div>
                <span className="font-bold text-emerald-700">-฿{couponDiscount}</span>
              </div>
            )}

            {/* M-Stamp Discount Option */}
            {mStampCount > 0 && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                    M
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">ใช้สิทธิ์ส่วนลด M-Stamp</div>
                    <div className="text-[11px] text-slate-600">
                      คุณมี {mStampCount} ดวง (ลดเพิ่ม ฿{Math.min(20, mStampCount * 3)})
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useMStamps}
                  onChange={(e) => setUseMStamps(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <span className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                วิธีชำระเงิน
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedPayment('promptpay')}
                  className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                    selectedPayment === 'promptpay'
                      ? 'border-[#007A3D] bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>พร้อมเพย์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayment('truemoney')}
                  className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                    selectedPayment === 'truemoney'
                      ? 'border-[#007A3D] bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-[#F58220]" />
                  <span>TrueMoney</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayment('cod')}
                  className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                    selectedPayment === 'cod'
                      ? 'border-[#007A3D] bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>เงินสด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayment('credit_card')}
                  className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-colors ${
                    selectedPayment === 'credit_card'
                      ? 'border-[#007A3D] bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>บัตร</span>
                </button>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-1.5 text-xs pt-1 border-t border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>ยอดรวมสินค้า ({totals.totalItemsCount} ชิ้น)</span>
                <span className="font-semibold text-slate-900 tabular-nums">฿{totals.subtotal}</span>
              </div>

              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>ส่วนลดรวม (คูปอง / M-Stamp)</span>
                  <span className="font-semibold tabular-nums">-฿{totals.discount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>ค่าบริการจัดส่ง</span>
                <span className="tabular-nums">
                  {totals.deliveryFee === 0 ? (
                    <span className="font-bold text-[#007A3D]">ฟรี</span>
                  ) : (
                    <span>฿{totals.deliveryFee}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>ยอดชำระสุทธิ</span>
                <span className="text-base text-[#EE3124] tabular-nums">฿{totals.total}</span>
              </div>
            </div>

            <button
              onClick={() => onCheckout(selectedPayment, stampsToDeduct)}
              disabled={hasStockErrors}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                hasStockErrors
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#007A3D] hover:bg-[#006834] text-white active:scale-98'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ยืนยันการสั่งซื้อ & ติดตามไรเดอร์สด</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
