import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product, checkStockStatus } from '../utils/inventory.ts';

interface ProductCardProps {
  product: Product;
  pairedProduct?: Product;
  currentStock: number;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  pairedProduct,
  currentStock,
  cartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenProductDetail,
}) => {
  const stockInfo = checkStockStatus(currentStock);
  const isOutOfStock = stockInfo.status === 'OUT_OF_STOCK';
  const isMaxInCart = cartQuantity >= currentStock;
  const topPromo = product.relatedPromos?.[0];

  return (
    <article className="taste-card w-[200px] sm:w-[224px] shrink-0 snap-start bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col group select-none">
      {/* Product Photo with Direct Visual Promo Overlay */}
      <div
        onClick={() => onOpenProductDetail(product)}
        className="relative aspect-square w-full bg-slate-100 overflow-hidden cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          referrerPolicy="no-referrer"
          className={`taste-photo w-full h-full object-cover ${
            isOutOfStock ? 'grayscale opacity-55' : ''
          }`}
        />

        {/* Top-Left: M-Stamp Coin Graphic */}
        {product.isMStamp && product.mStampEarned && (
          <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-2xs">
            <span className="w-3.5 h-3.5 rounded-full bg-white text-[#EE3124] font-black text-[9px] flex items-center justify-center">
              M
            </span>
            <span className="text-[10px] font-extrabold leading-none tabular-nums">
              +{product.mStampEarned}
            </span>
          </div>
        )}

        {/* Top-Right: Stock Count */}
        <div className="absolute top-2.5 right-2.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md tabular-nums ${
              isOutOfStock
                ? 'bg-rose-600 text-white'
                : stockInfo.status === 'LOW_STOCK'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/95 text-slate-800'
            }`}
          >
            {isOutOfStock ? 'หมด' : `คงเหลือ ${currentStock}`}
          </span>
        </div>

        {/* Bottom Overlay on Photo: Visual Promo Graphic on Product Image */}
        {topPromo && (
          <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
            {topPromo.promoType === 'bundle' && pairedProduct ? (
              <div className="bg-slate-950/90 text-white rounded-lg p-1.5 flex items-center gap-2">
                <div className="relative shrink-0 flex items-center">
                  <img
                    src={pairedProduct.image}
                    alt={pairedProduct.name}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-md object-cover border border-amber-400"
                  />
                  <span className="-ml-2 w-4 h-4 rounded-full bg-[#EE3124] text-white text-[9px] font-black flex items-center justify-center">
                    +
                  </span>
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[9px] font-bold text-amber-300 truncate">
                    {topPromo.badge}
                  </span>
                  <span className="block text-[11px] font-extrabold text-white truncate tabular-nums">
                    คู่กันลด ฿{topPromo.extraDiscount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#EE3124] text-white rounded-lg px-2 py-1.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-amber-300 text-slate-950 flex items-center justify-center shrink-0 font-black text-[11px]">
                  %
                </span>
                <div className="min-w-0 leading-tight">
                  <span className="block text-[9px] font-bold text-amber-200 truncate">
                    {topPromo.badge}
                  </span>
                  <span className="block text-[11px] font-extrabold text-white truncate tabular-nums">
                    {topPromo.targetQuantity && topPromo.targetQuantity > 1
                      ? `ซื้อ ${topPromo.targetQuantity} ลด ฿${topPromo.extraDiscount}`
                      : `ลดเพิ่ม ฿${topPromo.extraDiscount}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Minimal Card Footer: 1-Line Title, Price & Add Action */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <h3
          onClick={() => onOpenProductDetail(product)}
          className="font-semibold text-sm text-slate-900 line-clamp-1 group-hover:text-[#007A3D] transition-colors cursor-pointer"
        >
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div
            onClick={() => onOpenProductDetail(product)}
            className="flex items-baseline gap-1.5 cursor-pointer"
          >
            <span className="text-base font-bold text-slate-900 tabular-nums">
              ฿{product.price}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-slate-400 line-through tabular-nums">
                ฿{product.originalPrice}
              </span>
            )}
          </div>

          {isOutOfStock ? (
            <span className="px-2.5 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
              สินค้าหมด
            </span>
          ) : cartQuantity > 0 ? (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => onUpdateCartQuantity(product.id, cartQuantity - 1)}
                className="taste-btn w-7 h-7 rounded-md bg-white text-slate-800 hover:bg-slate-50 flex items-center justify-center"
                aria-label={`ลดจำนวน ${product.name}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-900 w-5 text-center tabular-nums">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!isMaxInCart) {
                    onUpdateCartQuantity(product.id, cartQuantity + 1);
                  }
                }}
                disabled={isMaxInCart}
                className={`taste-btn w-7 h-7 rounded-md flex items-center justify-center ${
                  isMaxInCart
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#007A3D] text-white hover:bg-[#006834]'
                }`}
                aria-label={`เพิ่มจำนวน ${product.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="taste-btn w-9 h-9 rounded-lg bg-[#007A3D] hover:bg-[#006834] text-white flex items-center justify-center"
              aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
