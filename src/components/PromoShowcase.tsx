import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Ticket,
  Flame,
} from 'lucide-react';
import { PROMO_CAMPAIGNS, PromoCampaign } from '../data/mockData.ts';

interface PromoShowcaseProps {
  claimedCoupons: string[];
  activeCouponCode: string | null;
  onClaimAndApplyCoupon: (code: string, discountAmount: number, title: string) => void;
  onFilterByPromoCategory: (category?: string) => void;
}

export const PromoShowcase: React.FC<PromoShowcaseProps> = ({
  claimedCoupons,
  activeCouponCode,
  onClaimAndApplyCoupon,
  onFilterByPromoCategory,
}) => {
  const railRef = useRef<HTMLDivElement>(null);

  const handleScroll = (dir: 'left' | 'right') => {
    if (!railRef.current) return;
    railRef.current.scrollBy({
      left: dir === 'left' ? -360 : 360,
      behavior: 'smooth',
    });
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#EE3124] fill-[#EE3124]" />
          <h2 className="font-extrabold text-sm sm:text-base text-slate-900">
            คูปอง & แคมเปญลดเพิ่ม
          </h2>
          <span className="text-xs text-slate-500 hidden sm:inline">
            · กดรับโค้ดลดท้ายบิลได้ทันที
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onFilterByPromoCategory(undefined)}
            className="text-xs font-bold text-[#007A3D] hover:underline mr-1"
          >
            ดูโปรทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => handleScroll('left')}
            aria-label="เลื่อนแคมเปญไปทางซ้าย"
            className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            aria-label="เลื่อนแคมเปญไปทางขวา"
            className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Campaign & Coupon Cards */}
      <div
        ref={railRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {PROMO_CAMPAIGNS.map((promo: PromoCampaign) => {
          const isClaimed = promo.couponCode ? claimedCoupons.includes(promo.couponCode) : false;
          const isApplied = promo.couponCode && activeCouponCode === promo.couponCode;

          return (
            <div
              key={promo.id}
              className="w-[290px] sm:w-[340px] shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex items-center gap-3 p-2.5"
            >
              {/* Compact Visual Thumbnail */}
              <div
                onClick={() => onFilterByPromoCategory(promo.categoryFilter)}
                className={`relative w-20 h-20 rounded-xl bg-gradient-to-br ${promo.bgGradient} overflow-hidden shrink-0 cursor-pointer flex items-end p-1.5`}
              >
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-85 hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="relative z-10 text-[9px] font-extrabold text-amber-300 leading-tight truncate">
                  ลด ฿{promo.discountAmount}
                </span>
              </div>

              {/* Compact Content & 1-Click Coupon Button */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                <div>
                  <span className="text-[10px] font-bold text-[#EE3124] block truncate">
                    {promo.badge}
                  </span>
                  <h3 className="font-bold text-xs text-slate-900 truncate mt-0.5">
                    {promo.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-1.5">
                  {promo.couponCode && promo.discountAmount ? (
                    <button
                      type="button"
                      onClick={() =>
                        onClaimAndApplyCoupon(
                          promo.couponCode!,
                          promo.discountAmount!,
                          promo.title
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                        isApplied
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : isClaimed
                          ? 'bg-amber-50 text-amber-900 border border-amber-300'
                          : 'bg-[#007A3D] hover:bg-[#006834] text-white'
                      }`}
                    >
                      <Ticket className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {isApplied
                          ? `ใช้อยู่ (${promo.couponCode})`
                          : `เก็บโค้ด -฿${promo.discountAmount}`}
                      </span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onFilterByPromoCategory(promo.categoryFilter)}
                    className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors shrink-0"
                  >
                    ดูสินค้า
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
