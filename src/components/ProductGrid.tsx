import React, { useRef } from 'react';
import { ProductCard } from './ProductCard.tsx';
import { Product, BranchStock, CartItem } from '../utils/inventory.ts';
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  allProducts?: Product[];
  branchStock: BranchStock;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
  onResetFilters: () => void;
}

interface HorizontalProductRailProps {
  title: string;
  items: Product[];
  lookupMap: Record<string, Product>;
  branchStock: BranchStock;
  getCartQuantity: (id: string) => number;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onOpenProductDetail: (product: Product) => void;
}

const HorizontalProductRail: React.FC<HorizontalProductRailProps> = ({
  title,
  items,
  lookupMap,
  branchStock,
  getCartQuantity,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenProductDetail,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === 'left' ? -460 : 460;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Clean Section Heading + Manual Left/Right Controls */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
          {title} <span className="text-slate-400 font-normal text-sm tabular-nums">({items.length})</span>
        </h2>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label={`เลื่อนซ้าย ${title}`}
            className="taste-btn w-9 h-9 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label={`เลื่อนขวา ${title}`}
            className="taste-btn w-9 h-9 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Card Track */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scroll-smooth"
      >
        {items.map((prod) => {
          const stock = branchStock.stock[prod.id] ?? 0;
          const bundleId = prod.relatedPromos?.[0]?.bundleProductId;
          const pairedProduct = bundleId ? lookupMap[bundleId] : undefined;

          return (
            <ProductCard
              key={prod.id}
              product={prod}
              pairedProduct={pairedProduct}
              currentStock={stock}
              cartQuantity={getCartQuantity(prod.id)}
              onAddToCart={onAddToCart}
              onUpdateCartQuantity={onUpdateCartQuantity}
              onOpenProductDetail={onOpenProductDetail}
            />
          );
        })}
      </div>
    </section>
  );
};

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  allProducts,
  branchStock,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenProductDetail,
  onResetFilters,
}) => {
  const getCartQuantity = (productId: string) => {
    const item = cart.find((c) => c.productId === productId);
    return item ? item.quantity : 0;
  };

  const lookupMap: Record<string, Product> = {};
  (allProducts || products).forEach((p) => {
    lookupMap[p.id] = p;
  });

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-md mx-auto space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">ไม่พบรายการสินค้าที่ค้นหา</h3>
        <button
          type="button"
          onClick={onResetFilters}
          className="taste-btn px-4 py-2.5 bg-[#007A3D] text-white rounded-lg text-xs font-semibold hover:bg-[#006834] inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>แสดงสินค้าทั้งหมด</span>
        </button>
      </div>
    );
  }

  const hotDealItems = products.filter((p) => p.isHotDeal);

  return (
    <div className="space-y-8">
      <HorizontalProductRail
        title="สินค้าพร้อมส่งจากสาขา"
        items={products}
        lookupMap={lookupMap}
        branchStock={branchStock}
        getCartQuantity={getCartQuantity}
        onAddToCart={onAddToCart}
        onUpdateCartQuantity={onUpdateCartQuantity}
        onOpenProductDetail={onOpenProductDetail}
      />

      {hotDealItems.length >= 3 && products.length > 5 && (
        <HorizontalProductRail
          title="สินค้าโปรโมชั่นและจับคู่ลดราคา"
          items={hotDealItems}
          lookupMap={lookupMap}
          branchStock={branchStock}
          getCartQuantity={getCartQuantity}
          onAddToCart={onAddToCart}
          onUpdateCartQuantity={onUpdateCartQuantity}
          onOpenProductDetail={onOpenProductDetail}
        />
      )}
    </div>
  );
};
