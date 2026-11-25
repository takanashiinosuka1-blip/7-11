import React, { useState, useRef } from 'react';
import {
  Flame,
  Gift,
  Tag,
  Plus,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Product,
  ProductPromoOffer,
  BranchStock,
  CartItem,
} from '../utils/inventory.ts';
import { PROMO_CAMPAIGNS } from '../data/mockData.ts';
import { ProductGrid } from './ProductGrid.tsx';

interface PromoMenuViewProps {
  products: Product[];
  productsMap: Record<string, Product>;
  branchStock: BranchStock;
  cart: CartItem[];
  claimedCoupons: string[];
  activeCouponCode: string | null;
  onClaimAndApplyCoupon: (code: string, discountAmount: number, title: string) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
  onApplyProductPromoOffer: (product: Product, offer: ProductPromoOffer) => void;
  onBackToShop: () => void;
}

export const PromoMenuView: React.FC<PromoMenuViewProps> = ({
  products,
  productsMap,
  branchStock,
  cart,
  activeCouponCode,
  onClaimAndApplyCoupon,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenProductDetail,
  onApplyProductPromoOffer,
  onBackToShop,
}) => {
  const [promoTab, setPromoTab] = useState<
    'all' | 'bundles' | 'flash' | 'mstamp' | 'multibuy'
  >('all');
  const bundleRailRef = useRef<HTMLDivElement>(null);

  const scrollBundles = (dir: 'left' | 'right') => {
    if (!bundleRailRef.current) return;
    bundleRailRef.current.scrollBy({
      left: dir === 'left' ? -380 : 380,
      behavior: 'smooth',
    });
  };

  // Filter promotional products
  const promoProducts = products.filter((p) => {
    const hasPromos = (p.relatedPromos?.length || 0) > 0;
    const isDiscounted = p.isHotDeal || (p.originalPrice && p.originalPrice > p.price);

    if (promoTab === 'bundles') {
      return p.relatedPromos?.some((o) => o.promoType === 'bundle');
    }
    if (promoTab === 'flash') {
      return isDiscounted;
    }
    if (promoTab === 'mstamp') {
      return p.isMStamp && (p.mStampEarned || 0) >= 3;
    }
    if (promoTab === 'multibuy') {
      return p.relatedPromos?.some((o) => o.promoType === 'multi_buy');
    }
    return hasPromos || isDiscounted;
  });

  // Collect all bundle & multi-buy special offers across products
  const featuredOffers: { product: Product; offer: ProductPromoOffer }[] = [];
  products.forEach((p) => {
    p.relatedPromos?.forEach((offer) => {
      featuredOffers.push({ product: p, offer });
    });
  });

  return (
    <div className="space-y-6">
      {/* Compact Header Banner for Dedicated Promo Menu */}
      <div className="bg-gradient-to-r from-[#EE3124] via-[#EA580C] to-[#F58220] text-white rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-yellow-300 text-slate-950 text-[10px] font-extrabold uppercase flex items-center gap-1">
                <Flame className="w-3 h-3 fill-slate-950" />
                PROMO MENU
              </span>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                ศูนย์รวมสินค้าโปรโมชั่น & ชุดเซ็ตจับคู่
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToShop}
            className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 self-start sm:self-center shadow-2xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าร้าน</span>
          </button>
        </div>

        {/* Quick Coupon Strip */}
        <div className="mt-3.5 pt-3 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {PROMO_CAMPAIGNS.map((camp) => {
            const isApplied = activeCouponCode === camp.couponCode;
            return (
              <div
                key={camp.id}
                className="bg-black/25 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-white truncate">
                    โค้ด {camp.couponCode} ลด ฿{camp.discountAmount}
                  </div>
                </div>
                {camp.couponCode && camp.discountAmount && (
                  <button
                    type="button"
                    onClick={() =>
                      onClaimAndApplyCoupon(
                        camp.couponCode!,
                        camp.discountAmount!,
                        camp.title
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0 transition-all ${
                      isApplied
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-white text-slate-900 hover:bg-amber-300'
                    }`}
                  >
                    {isApplied ? 'ใช้อยู่ ✓' : 'เก็บโค้ด'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-Menu Tabs for Promotion Types */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[
          { id: 'all', label: 'โปรทั้งหมด' },
          { id: 'bundles', label: 'จับคู่ลดเพิ่ม' },
          { id: 'flash', label: 'ลดอย่างแรง' },
          { id: 'multibuy', label: 'ซื้อครบคุ้มกว่า' },
          { id: 'mstamp', label: 'แจก M-Stamp' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPromoTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              promoTab === tab.id
                ? 'bg-[#EE3124] text-white shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Horizontal Scrollable 1-Click Promo Sets Rail */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#F58220]" />
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
              ชุดเซ็ตจับคู่สุดคุ้ม
            </h2>
            <span className="text-xs text-slate-400">({featuredOffers.length})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBundles('left')}
              aria-label="เลื่อนชุดโปรไปทางซ้าย"
              className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBundles('right')}
              aria-label="เลื่อนชุดโปรไปทางขวา"
              className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={bundleRailRef}
          className="flex items-stretch gap-3.5 overflow-x-auto pb-2 pt-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {featuredOffers.map(({ product, offer }) => {
            const mainStock = branchStock.stock[product.id] ?? 0;
            const bundleProd = offer.bundleProductId
              ? productsMap[offer.bundleProductId]
              : undefined;
            const bundleStock = offer.bundleProductId
              ? branchStock.stock[offer.bundleProductId] ?? 0
              : 99;
            const reqQty = offer.targetQuantity || 1;
            const canBuy = mainStock >= reqQty && bundleStock > 0;

            return (
              <div
                key={offer.id}
                className="w-[240px] sm:w-[260px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Visual Product Image Pair with Overlaid Promo Graphic */}
                <div
                  onClick={() => onOpenProductDetail(product)}
                  className="relative h-36 bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center"
                >
                  {bundleProd ? (
                    <div className="grid grid-cols-2 w-full h-full">
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover border-r border-white/50"
                      />
                      <img
                        src={bundleProd.image}
                        alt={bundleProd.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

                  <span className="absolute top-2 left-2 bg-[#EE3124] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-xs">
                    {offer.badge}
                  </span>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                    <span className="text-[11px] font-extrabold text-amber-300 drop-shadow-xs">
                      ลดเพิ่ม ฿{offer.extraDiscount}
                    </span>
                    <span className="text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded">
                      {offer.highlightSavingText}
                    </span>
                  </div>
                </div>

                {/* Minimal Card Footer: 1-line title + Quick Add Button */}
                <div className="p-3 flex items-center justify-between gap-2">
                  <div
                    onClick={() => onOpenProductDetail(product)}
                    className="min-w-0 cursor-pointer"
                  >
                    <h3 className="font-bold text-xs text-slate-900 truncate group-hover:text-[#007A3D]">
                      {offer.title}
                    </h3>
                    <span className="text-[11px] text-emerald-700 font-semibold block truncate">
                      {product.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => onApplyProductPromoOffer(product, offer)}
                    aria-label={`เพิ่มโปร ${offer.title}`}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      canBuy
                        ? 'bg-[#007A3D] hover:bg-[#006834] text-white shadow-2xs active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Promotional Products Horizontal Rails */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#EE3124]" />
            <span>สินค้าที่ร่วมโปรโมชั่น ({promoProducts.length})</span>
          </h2>
        </div>

        <ProductGrid
          products={promoProducts}
          allProducts={products}
          branchStock={branchStock}
          cart={cart}
          onAddToCart={onAddToCart}
          onUpdateCartQuantity={onUpdateCartQuantity}
          onOpenProductDetail={onOpenProductDetail}
          onResetFilters={() => setPromoTab('all')}
        />
      </div>
    </div>
  );
};
