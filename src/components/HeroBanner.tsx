import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Tag,
  Plus,
} from 'lucide-react';
import { SLIDE_AD_BANNERS, SlideAdBannerItem } from '../data/mockData.ts';
import { Product, BranchStock } from '../utils/inventory.ts';

interface HeroBannerProps {
  productsMap: Record<string, Product>;
  currentStock: BranchStock;
  onAddPromoSlideToCart: (slide: SlideAdBannerItem) => void;
  onOpenPromoMenu: () => void;
  onOpenProductDetail: (product: Product) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  productsMap,
  currentStock,
  onAddPromoSlideToCart,
  onOpenPromoMenu,
  onOpenProductDetail,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = SLIDE_AD_BANNERS;
  const activeSlide = slides[currentIndex] || slides[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const mainProduct = productsMap?.[activeSlide.productId];
  const bundleProduct = activeSlide.bundleProductId
    ? productsMap?.[activeSlide.bundleProductId]
    : undefined;

  const mainStock = currentStock?.stock?.[activeSlide.productId] ?? 0;
  const bundleStock = activeSlide.bundleProductId
    ? currentStock?.stock?.[activeSlide.bundleProductId] ?? 0
    : 99;
  const isAvailable = mainStock > 0 && bundleStock > 0;

  return (
    <section
      data-enter
      className="bg-white rounded-xl border border-slate-200 overflow-hidden"
    >
      <div className="p-5 sm:p-7">
        {/* Top Row: Plain Category Tag & Manual Slide Controls */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="font-bold text-[#EE3124]">{activeSlide.tag}</span>
            <span aria-hidden="true">·</span>
            <span>{activeSlide.periodText}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPromoMenu}
              className="taste-btn text-xs font-semibold text-[#007A3D] hover:underline px-2 py-1"
            >
              ดูสินค้าโปรโมชั่นทั้งหมด
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="สไลด์โฆษณาก่อนหน้า"
                className="taste-btn w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-600 px-1.5 tabular-nums">
                {currentIndex + 1}/{slides.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                aria-label="สไลด์โฆษณาถัดไป"
                className="taste-btn w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Split Hero Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Plain, direct copy + Price + Max 2 Hero Actions */}
          <div className="lg:col-span-7 space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-slate-900">
              {activeSlide.title}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
              {activeSlide.subtitle}
            </p>

            <div className="flex items-baseline gap-2.5 pt-1">
              <span className="text-3xl font-extrabold text-[#EE3124] tabular-nums">
                ฿{activeSlide.promoPrice}
              </span>
              <span className="text-sm text-slate-400 line-through tabular-nums">
                ฿{activeSlide.originalPrice}
              </span>
              <span className="text-xs font-semibold text-[#007A3D] ml-1">
                · {activeSlide.productHighlightText}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => onAddPromoSlideToCart(activeSlide)}
                className={`taste-btn px-5 py-3 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 ${
                  isAvailable
                    ? 'bg-[#007A3D] hover:bg-[#006834] text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{isAvailable ? activeSlide.ctaLabel : 'สินค้าหมดชั่วคราว'}</span>
              </button>

              {mainProduct && (
                <button
                  type="button"
                  onClick={() => onOpenProductDetail(mainProduct)}
                  className="taste-btn px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                >
                  <Tag className="w-4 h-4 text-[#EE3124]" />
                  <span>ดูเงื่อนไขโปรโมชั่น</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Clean Visual Frame with Product Photo Overlay (No caption below) */}
          <div className="lg:col-span-5">
            <div
              onClick={() => mainProduct && onOpenProductDetail(mainProduct)}
              className="relative h-48 sm:h-52 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
            >
              <img
                src={activeSlide.bannerImage}
                alt={activeSlide.title}
                className="taste-photo w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

              {mainProduct && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 bg-white/95 rounded-lg p-2 text-slate-900">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={mainProduct.image}
                      alt={mainProduct.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                    />
                    {bundleProduct && (
                      <img
                        src={bundleProduct.image}
                        alt={bundleProduct.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-md object-cover border border-amber-400 shrink-0 -ml-2"
                      />
                    )}
                    <span className="text-xs font-bold truncate">
                      {mainProduct.name}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-md bg-[#EE3124] text-white text-xs font-extrabold shrink-0 tabular-nums">
                    ฿{activeSlide.promoPrice}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
