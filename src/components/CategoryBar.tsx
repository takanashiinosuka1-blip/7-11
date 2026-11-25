import React from 'react';
import { Search, X, Flame, Coffee, UtensilsCrossed, Cookie, Milk, Check, Package } from 'lucide-react';

interface CategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  inStockOnly: boolean;
  setInStockOnly: (val: boolean) => void;
  dealsOnly: boolean;
  setDealsOnly: (val: boolean) => void;
  sortBy: 'popular' | 'price_asc' | 'price_desc';
  setSortBy: (sort: 'popular' | 'price_asc' | 'price_desc') => void;
  totalProductsCount: number;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  setSearchQuery,
  inStockOnly,
  setInStockOnly,
  dealsOnly,
  setDealsOnly,
  sortBy,
  setSortBy,
}) => {
  const categories = [
    { id: 'all', label: 'ทั้งหมด', icon: null },
    { id: 'toasties', label: 'แซนวิชอบร้อน', icon: Flame },
    { id: 'ready_meals', label: 'อาหารกล่อง', icon: UtensilsCrossed },
    { id: 'all_cafe', label: 'All Café', icon: Coffee },
    { id: 'snacks', label: 'ขนม & ไอศกรีม', icon: Cookie },
    { id: 'beverages', label: 'เครื่องดื่ม', icon: Milk },
    { id: 'daily_essentials', label: 'ของใช้ประจำวัน', icon: Package },
  ];

  return (
    <div className="space-y-3">
      {/* Search & Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <label htmlFor="store-search" className="sr-only">
            ค้นหาสินค้า
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="store-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาสินค้า เช่น แซนวิชแฮมชีส, ข้าวกะเพรา, มัทฉะ..."
            className="w-full pl-9 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#007A3D]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="ล้างการค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`taste-btn px-3 py-2 text-xs rounded-lg font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              inStockOnly
                ? 'bg-emerald-50 text-[#007A3D] border-[#007A3D]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center border ${inStockOnly ? 'bg-[#007A3D] border-[#007A3D] text-white' : 'border-slate-300'}`}>
              {inStockOnly && <Check className="w-2.5 h-2.5" />}
            </div>
            <span>มีสินค้าพร้อมส่ง</span>
          </button>

          <button
            type="button"
            onClick={() => setDealsOnly(!dealsOnly)}
            className={`taste-btn px-3 py-2 text-xs rounded-lg font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              dealsOnly
                ? 'bg-amber-50 text-amber-900 border-amber-400'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#EE3124]" />
            <span>ลดราคาพิเศษ</span>
          </button>

          <label htmlFor="sort-select" className="sr-only">
            จัดเรียงสินค้า
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold shrink-0"
          >
            <option value="popular">เรียงตามยอดนิยม</option>
            <option value="price_asc">ราคาต่ำไปสูง</option>
            <option value="price_desc">ราคาสูงไปต่ำ</option>
          </select>
        </div>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`taste-btn px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-[#007A3D] text-white'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
