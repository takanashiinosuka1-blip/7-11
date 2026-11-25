import React from 'react';
import {
  X,
  Tag,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  Flame,
  Gift,
  Store,
} from 'lucide-react';
import {
  Product,
  ProductPromoOffer,
  Branch,
  BranchStock,
  checkStockStatus,
} from '../utils/inventory.ts';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  productsMap: Record<string, Product>;
  currentBranch: Branch;
  branchStock: BranchStock;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onApplyProductPromoOffer: (product: Product, offer: ProductPromoOffer) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  productsMap,
  currentBranch,
  branchStock,
  cartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
  onApplyProductPromoOffer,
}) => {
  if (!isOpen || !product) return null;

  const currentStock = branchStock.stock[product.id] ?? 0;
  const stockInfo = checkStockStatus(currentStock);
  const isOutOfStock = stockInfo.status === 'OUT_OF_STOCK';
  const promos = product.relatedPromos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#F58220] text-white text-[10px] font-extrabold uppercase">
              รายละเอียดสินค้า & โปรโมชั่นแนะนำ
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              ตัดสินใจเลือกซื้อตามโปรที่คุ้มที่สุดสำหรับคุณ
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างรายละเอียดสินค้า"
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Top Product Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-5 relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
              />
              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                {product.isHotDeal && (
                  <span className="bg-[#EE3124] text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                    ลดอย่างแรง
                  </span>
                )}
                {product.isMStamp && (
                  <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                    +{product.mStampEarned} M-Stamp
                  </span>
                )}
              </div>
            </div>

            <div className="sm:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  ขนาด: {product.volumeOrWeight || 'มาตรฐาน'}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${stockInfo.color}`}
                >
                  {stockInfo.label}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {product.name}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">{product.description}</p>

              {/* Price Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block">ราคาต่อชิ้น</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#EE3124] tabular-nums">
                      ฿{product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-slate-400 line-through tabular-nums">
                        ฿{product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="flex items-center gap-1 text-slate-600 font-medium justify-end">
                    <Store className="w-3.5 h-3.5 text-[#007A3D]" />
                    <span>{currentBranch.name.replace('สาขา', '').trim()}</span>
                  </div>
                  {product.originalPrice && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      ประหยัดทันที ฿{product.originalPrice - product.price}/ชิ้น
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PROMOTIONS RELATED TO THIS PRODUCT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#F58220] flex items-center justify-center">
                  <Flame className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    โปรโมชั่นพิเศษสำหรับสินค้านี้ ({promos.length} รายการ)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    กดเลือกซื้อตามโปรโมชั่นด้านล่างเพื่อรับส่วนลดเพิ่มและแสตมป์พิเศษทันที
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                คุ้มกว่าซื้อแยกชิ้น!
              </span>
            </div>

            {promos.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                สินค้านี้ร่วมรายการสะสมแต้ม ALL member และ M-Stamp ตามปกติ
              </div>
            ) : (
              <div className="space-y-3">
                {promos.map((offer) => {
                  const bundleProd = offer.bundleProductId
                    ? productsMap[offer.bundleProductId]
                    : undefined;
                  const bundleStock = offer.bundleProductId
                    ? branchStock.stock[offer.bundleProductId] ?? 0
                    : 99;
                  const requiredMainQty = offer.targetQuantity || 1;
                  const canFulfillPromo =
                    currentStock >= requiredMainQty && bundleStock > 0;

                  return (
                    <div
                      key={offer.id}
                      className="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-r from-amber-50/90 via-white to-emerald-50/50 p-4 shadow-xs hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#EE3124] text-white text-[11px] font-extrabold flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            {offer.badge}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                            {offer.highlightSavingText}
                          </span>
                        </div>

                        {offer.couponCode && (
                          <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                            โค้ดอัตโนมัติ: {offer.couponCode} (-฿{offer.extraDiscount})
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-sm text-slate-900">{offer.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {offer.description}
                        </p>
                      </div>

                      {/* If Bundle Offer, Show Companion Product Preview */}
                      {bundleProd && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={bundleProd.image}
                              alt={bundleProd.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                            <div className="text-xs">
                              <div className="font-bold text-slate-800">
                                สินค้าจับคู่: {bundleProd.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                ราคาปกติ ฿{bundleProd.price} · สต๊อกสาขา: {bundleStock} ชิ้น
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-[#007A3D]">
                            ลดเพิ่ม ฿{offer.extraDiscount}
                          </span>
                        </div>
                      )}

                      {/* Direct Action Button to Buy with this Promo */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#007A3D]" />
                          <span>
                            {offer.promoType === 'bundle'
                              ? 'เพิ่มทั้ง 2 ชิ้นลงตะกร้า + ใช้คูปองส่วนลดทันที'
                              : offer.promoType === 'multi_buy'
                              ? `เพิ่มสินค้าครบ ${offer.targetQuantity} ชิ้น + ใช้ส่วนลดโปรทันที`
                              : 'เพิ่มสินค้าลงตะกร้า + ใช้คูปองส่วนลดทันที'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!canFulfillPromo}
                          onClick={() => {
                            onApplyProductPromoOffer(product, offer);
                            onClose();
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 ${
                            canFulfillPromo
                              ? 'bg-[#007A3D] hover:bg-[#006834] text-white cursor-pointer'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                          <span>
                            {canFulfillPromo
                              ? 'เลือกซื้อตามโปรนี้ทันที'
                              : `สต๊อกไม่พอสำหรับโปรนี้ (ต้องการ ${requiredMainQty} ชิ้น)`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Buy Single / Normal Cart Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span>หรือสั่งซื้อแบบปกติรายชิ้น: </span>
            <strong className="text-slate-900">฿{product.price} / ชิ้น</strong>
          </div>

          <div className="flex items-center gap-2.5">
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
              >
                สินค้าหมดชั่วคราวที่สาขานี้
              </button>
            ) : cartQuantity > 0 ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateCartQuantity(product.id, cartQuantity - 1)}
                  className="w-7 h-7 rounded-lg bg-white text-emerald-800 hover:bg-emerald-100 flex items-center justify-center shadow-2xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-extrabold text-emerald-950 px-2 tabular-nums">
                  ในตะกร้า {cartQuantity} ชิ้น
                </span>
                <button
                  type="button"
                  disabled={cartQuantity >= currentStock}
                  onClick={() => onUpdateCartQuantity(product.id, cartQuantity + 1)}
                  className="w-7 h-7 rounded-lg bg-[#007A3D] text-white hover:bg-[#006834] disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAddToCart(product)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>ซื้อแยก 1 ชิ้น (฿{product.price})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
