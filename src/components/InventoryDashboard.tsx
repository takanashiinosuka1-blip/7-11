import React from 'react';
import {
  Store,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ShieldCheck,
  RotateCcw,
  Lock,
  Unlock,
  Sliders,
  Zap,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Product,
  Branch,
  BranchStock,
  BranchSystemSummary,
  checkStockStatus,
} from '../utils/inventory.ts';

interface InventoryDashboardProps {
  products: Product[];
  branches: Branch[];
  branchLockSummary: BranchSystemSummary;
  selectedBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onAdjustBranchOrders: (branchId: string, delta: number) => void;
  onSetBranchOrders: (branchId: string, ordersCount: number) => void;
  onApplyOrderScenario: (ordersByBranchId: Record<string, number>, scenarioTitle: string) => void;
  branchStocks: Record<string, BranchStock>;
  stockLogs: {
    id: string;
    timestamp: string;
    branchName: string;
    productName: string;
    change: number;
    remaining: number;
    reason: string;
  }[];
  onAdjustStock: (branchId: string, productId: string, delta: number) => void;
  onSetStock: (branchId: string, productId: string, quantity: number) => void;
  onResetAllStocks: () => void;
  onSwitchToShop: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  products,
  branches,
  branchLockSummary,
  selectedBranchId,
  onSelectBranch,
  onAdjustBranchOrders,
  onSetBranchOrders,
  onApplyOrderScenario,
  branchStocks,
  stockLogs,
  onAdjustStock,
  onSetStock,
  onResetAllStocks,
  onSwitchToShop,
}) => {
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const currentStock = branchStocks[selectedBranchId] || {
    branchId: selectedBranchId,
    stock: {},
  };

  // Calculate inventory metrics for currently selected branch
  let totalItemsCount = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    totalItemsCount++;
    const qty = currentStock.stock[p.id] ?? 0;
    if (qty <= 0) outOfStockCount++;
    else if (qty <= 3) lowStockCount++;
    else inStockCount++;
  });

  const fulfillmentRate = Math.round(
    ((totalItemsCount - outOfStockCount) / totalItemsCount) * 100
  );

  const scenarios = [
    {
      id: 'scen-zero-sub',
      badge: 'กรณีที่ 1 · ห้ามมีสาขา Order = 0',
      title: 'มีสาขาย่อย Order เป็น 0 (ล็อคสาขาอื่นทั้งหมด)',
      desc: 'สาขาใหญ่=35, ย่อยพร้อมพงษ์=25, ย่อยทองหล่อ=22, ย่อยสีลม=0 → ล็อคทุกสาขาที่มีออเดอร์เพื่อบังคับส่งออเดอร์ไปสาขาสีลมที่เป็น 0',
      orders: {
        'branch-asoke': 35,
        'branch-phromphong': 25,
        'branch-thonglor': 22,
        'branch-silom': 0,
      },
    },
    {
      id: 'scen-sub-under40',
      badge: 'กรณีที่ 2 · ล็อคสาขาใหญ่ก่อน',
      title: 'สาขาย่อยต่ำกว่า 40 Order (ล็อคสาขาใหญ่)',
      desc: 'สาขาใหญ่=32, ย่อยพร้อมพงษ์=22, ย่อยทองหล่อ=20, ย่อยสีลม=21 → ล็อคสาขาใหญ่ก่อนเพื่อให้สาขาย่อยรับออเดอร์จนถึงเกณฑ์',
      orders: {
        'branch-asoke': 32,
        'branch-phromphong': 22,
        'branch-thonglor': 20,
        'branch-silom': 21,
      },
    },
    {
      id: 'scen-sub-imbalanced',
      badge: 'กรณีที่ 3 · ล็อคสาขาย่อยที่นำโด่ง',
      title: 'สาขาย่อยยอดห่างกันเกินเกณฑ์ (ล็อคสาขาย่อยที่สูงกว่า)',
      desc: 'สาขาใหญ่=35, ย่อยพร้อมพงษ์=32, ย่อยทองหล่อ=28, ย่อยสีลม=14 → ล็อคพร้อมพงษ์ & ทองหล่อ รอให้สีลมมียอดใกล้เคียงกันก่อน',
      orders: {
        'branch-asoke': 35,
        'branch-phromphong': 32,
        'branch-thonglor': 28,
        'branch-silom': 14,
      },
    },
    {
      id: 'scen-balanced-unlock',
      badge: 'กรณีที่ 4 · ยอดเฉลี่ยใกล้เคียงกัน',
      title: 'สาขาย่อยยอดเฉลี่ยใกล้เคียงกัน (ปลดล็อคทุกสาขา)',
      desc: 'สาขาใหญ่=48, ย่อยพร้อมพงษ์=34, ย่อยทองหล่อ=32, ย่อยสีลม=33 → ยอดสาขาย่อยใกล้เคียงกันและไม่มีสาขาเป็น 0 จึงปลดล็อคครบทุกสาขา',
      orders: {
        'branch-asoke': 48,
        'branch-phromphong': 34,
        'branch-thonglor': 32,
        'branch-silom': 33,
      },
    },
    {
      id: 'scen-sub-above40',
      badge: 'กรณีที่ 5 · สาขาย่อย ≥ 40 Order',
      title: 'สาขาย่อยทุกสาขาสูงกว่าเกณฑ์ 40 Order (ปลดล็อคสาขาใหญ่)',
      desc: 'สาขาใหญ่=45, ย่อยพร้อมพงษ์=42, ย่อยทองหล่อ=44, ย่อยสีลม=41 → สาขาย่อยเกิน 40 ทุกแห่ง ปลดล็อคสาขาใหญ่เต็มรูปแบบ',
      orders: {
        'branch-asoke': 45,
        'branch-phromphong': 42,
        'branch-thonglor': 44,
        'branch-silom': 41,
      },
    },
    {
      id: 'scen-main-over70',
      badge: 'กรณีที่ 6 · สาขาใหญ่เต็ม 70 Order',
      title: 'สาขาใหญ่ยอดถึง 70 Order (ล็อคสาขาใหญ่ทันที)',
      desc: 'สาขาใหญ่=70 (เต็มเพดาน), ย่อยพร้อมพงษ์=42, ย่อยทองหล่อ=41, ย่อยสีลม=43 → ล็อคสาขาใหญ่ทันทีและกระจายออเดอร์ไปสาขาย่อยแทน',
      orders: {
        'branch-asoke': 70,
        'branch-phromphong': 42,
        'branch-thonglor': 41,
        'branch-silom': 43,
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* SECTION 1: PRIORITY BRANCH ORDER LOCK & LOAD BALANCING ENGINE */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold uppercase flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  SMART ORDER LOAD BALANCER · ระบบล็อคสาขาอัตโนมัติ
                </span>
                <span className="text-xs text-emerald-300 font-medium">
                  จัดลำดับความสำคัญการล็อคสาขาใหญ่ (เพดาน 70 Order) และสาขาย่อย (เกณฑ์ 40 Order)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                ระบบควบคุมปริมาณออเดอร์และล็อคสาขาอัตโนมัติ (Priority Branch Lock)
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                ป้องกันออเดอร์กระจุกตัวที่สาขาเดียวและห้ามมีสาขาย่อยใดมีออเดอร์เป็น 0 หากสาขาที่ลูกค้าเลือกถูกล็อค ระบบจะสลับไปสาขาที่เปิดรับออเดอร์ให้อัตโนมัติ
              </p>
            </div>

            {/* Summary Pill Box */}
            <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-2xl p-3.5 shrink-0">
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block">สาขาเปิดรับออเดอร์</span>
                <span className="text-xl font-extrabold text-emerald-400 tabular-nums">
                  {branchLockSummary.unlockedCount} สาขา
                </span>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block">สาขาถูกล็อคชั่วคราว</span>
                <span className="text-xl font-extrabold text-rose-400 tabular-nums">
                  {branchLockSummary.lockedCount} สาขา
                </span>
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div className="text-center px-2">
                <span className="text-[10px] text-slate-300 block">เฉลี่ยสาขาย่อย</span>
                <span className="text-xl font-extrabold text-amber-300 tabular-nums">
                  {branchLockSummary.avgSubOrders} Order
                </span>
              </div>
            </div>
          </div>

          {/* 4 Priority Rules Reference Strip */}
          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-black/25 border border-white/10 rounded-xl p-3 space-y-1">
              <div className="font-bold text-amber-300">1. การล็อคสาขาใหญ่ก่อน</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ล็อคสาขาใหญ่ทันทีหากสาขาย่อยมียอดต่ำกว่า <strong>40 Order</strong> หรือเมื่อสาขาใหญ่มียอดถึงเพดาน <strong>70 Order</strong>
              </p>
            </div>
            <div className="bg-black/25 border border-white/10 rounded-xl p-3 space-y-1">
              <div className="font-bold text-rose-300">2. การล็อคสาขาย่อย</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ล็อคสาขาย่อยที่มีออเดอร์สูง เมื่อมีสาขาย่อยใกล้เคียงมียอดเป็น <strong>0 Order</strong> หรือต่ำกว่าเกณฑ์ขั้นต่ำ (15 Order)
              </p>
            </div>
            <div className="bg-black/25 border border-white/10 rounded-xl p-3 space-y-1">
              <div className="font-bold text-emerald-300">3. เงื่อนไขปลดล็อคสาขาใหญ่</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ปลดล็อคเมื่อสาขาย่อย <strong>≥ 40 Order</strong> หรือยอดสาขาย่อย<strong>เฉลี่ยใกล้เคียงกัน</strong> หรือสาขาย่อย<strong>ออเดอร์ล้นเกินรับมือ (≥ 50)</strong>
              </p>
            </div>
            <div className="bg-black/25 border border-white/10 rounded-xl p-3 space-y-1">
              <div className="font-bold text-sky-300">4. เงื่อนไขปลดล็อคสาขาย่อย</div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ห้ามมีสาขาใดมีออเดอร์เป็น <strong>0</strong> เด็ดขาด และยอดออเดอร์สาขาย่อยอื่นต้องขึ้นมา<strong>ใกล้เคียงกันก่อน</strong>จึงจะปลดล็อค
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Simulator Presets */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#007A3D]" />
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                กดทดสอบสถานการณ์การล็อค/ปลดล็อคสาขาอัตโนมัติ (6 กรณีศึกษา):
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              คลิกปุ่มด้านล่างเพื่อจำลองยอดออเดอร์และดูผลลัพธ์การล็อคสาขาทันที
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {scenarios.map((scen) => (
              <button
                key={scen.id}
                type="button"
                onClick={() => onApplyOrderScenario(scen.orders, scen.title)}
                className="p-3 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 text-left transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-extrabold text-[#007A3D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {scen.badge}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-700">
                    กดจำลอง →
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 mb-0.5">{scen.title}</div>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                  {scen.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Branch Cards Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((branch) => {
            const evalInfo = branchLockSummary.evaluations[branch.id];
            const isLocked = evalInfo?.isLocked ?? false;
            const orders = branch.activeOrders ?? 0;
            const maxCap = branch.maxOrderCapacity ?? (branch.branchType === 'main' ? 70 : 50);
            const isMain = branch.branchType === 'main';
            const isSelected = branch.id === selectedBranchId;

            return (
              <div
                key={branch.id}
                className={`rounded-2xl border-2 p-4 transition-all flex flex-col justify-between gap-3 ${
                  isLocked
                    ? 'border-rose-300 bg-rose-50/40'
                    : isSelected
                    ? 'border-[#007A3D] bg-emerald-50/30 shadow-xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row: Branch Type Badge & Lock Status Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isMain
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-sky-100 text-sky-900 border border-sky-300'
                        }`}
                      >
                        {isMain ? 'สาขาใหญ่ (MAIN HUB)' : 'สาขาย่อย (SUB BRANCH)'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        #{branch.code}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-2xs ${
                        isLocked
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>ล็อคชั่วคราว (LOCKED)</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>เปิดรับออเดอร์ (OPEN)</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Branch Name & Order Gauge */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">{evalInfo?.statusBadge}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-extrabold tabular-nums text-slate-900">
                        {orders}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          / {maxCap} Order
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {isMain ? 'ล็อคเมื่อ ≥ 70 หรือย่อย < 40' : 'เกณฑ์เป้าหมาย 40 Order'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isLocked
                          ? 'bg-rose-600'
                          : orders >= 40
                          ? 'bg-emerald-600'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (orders / maxCap) * 100)}%` }}
                    />
                  </div>

                  {/* Reason & Unlock Condition Explanation Box */}
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isLocked
                        ? 'bg-rose-100/70 border-rose-200 text-rose-950'
                        : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="font-bold flex items-start gap-1.5">
                      <span>สถานะระบบ:</span>
                      <span className="font-medium">{evalInfo?.lockReason}</span>
                    </div>
                    <div className="text-[11px] opacity-85">
                      <strong>เงื่อนไขปลดล็อค/การทำงาน:</strong> {evalInfo?.unlockCondition}
                    </div>
                  </div>
                </div>

                {/* Bottom Controls: Adjust Active Orders & Select Branch */}
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600 mr-1">
                      ปรับยอด Order:
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetBranchOrders(branch.id, 0)}
                      className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold"
                    >
                      เซ็ต 0
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustBranchOrders(branch.id, -5)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustBranchOrders(branch.id, -1)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustBranchOrders(branch.id, 1)}
                      className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustBranchOrders(branch.id, 5)}
                      className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[11px] font-bold"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSetBranchOrders(branch.id, isMain ? 70 : 42)
                      }
                      className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold"
                    >
                      {isMain ? 'เซ็ต 70 (เต็ม)' : 'เซ็ต 42 (≥เกณฑ์)'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectBranch(branch.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : isLocked
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-[#007A3D] text-white hover:bg-[#006834]'
                    }`}
                  >
                    {isSelected
                      ? 'กำลังดูสาขานี้'
                      : isLocked
                      ? 'ดูสต๊อก (สาขาล็อคอยู่)'
                      : 'เลือกใช้สาขานี้'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: REAL-TIME STOCK DEDUCTION TABLE FOR SELECTED BRANCH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>ความพร้อมจัดส่งสินค้า</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {fulfillmentRate}%
          </div>
          <p className="text-[11px] text-slate-400">
            {totalItemsCount - outOfStockCount} จาก {totalItemsCount} รายการพร้อมส่ง
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>สินค้าพร้อมจำหน่าย</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">
            {inStockCount}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">สต๊อกเพียงพอต่อการจัดส่ง</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>สินค้าใกล้หมด (&le; 3 ชิ้น)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 tabular-nums">
            {lowStockCount}
          </div>
          <p className="text-[11px] text-amber-700 font-medium">เตือนลูกค้าบนการ์ดสินค้า</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>สินค้าหมดชั่วคราว</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
            {outOfStockCount}
          </div>
          <p className="text-[11px] text-rose-600 font-medium">ปิดรับออเดอร์อัตโนมัติ</p>
        </div>
      </div>

      {/* Branch Selector and Interactive Warehouse Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#007A3D] text-white flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-900">
                  ตารางสต๊อกสินค้า: {currentBranch.name}
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  รหัสสาขา: {currentBranch.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">{currentBranch.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onResetAllStocks}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตสต๊อก</span>
            </button>
            <button
              onClick={onSwitchToShop}
              className="px-3.5 py-1.5 bg-[#007A3D] hover:bg-[#006834] text-white rounded-xl text-xs font-bold transition-all"
            >
              กลับไปหน้าร้าน
            </button>
          </div>
        </div>

        {/* Stock Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">รายการสินค้า</th>
                <th className="py-3 px-3">หมวดหมู่</th>
                <th className="py-3 px-3">ราคา</th>
                <th className="py-3 px-3">สถานะสต๊อก</th>
                <th className="py-3 px-3 text-center">จำนวนคงเหลือ</th>
                <th className="py-3 px-4 text-right">เครื่องมือจำลองสต๊อก (ทดสอบระบบ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((prod) => {
                const stockQty = currentStock.stock[prod.id] ?? 0;
                const status = checkStockStatus(stockQty);

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{prod.name}</div>
                          <div className="text-[11px] text-slate-400">{prod.nameEn}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {prod.category === 'toasties'
                        ? 'แซนวิชอบร้อน'
                        : prod.category === 'ready_meals'
                        ? 'อาหารกล่อง'
                        : prod.category === 'all_cafe'
                        ? 'All Café'
                        : prod.category === 'snacks'
                        ? 'ขนมของว่าง'
                        : prod.category === 'beverages'
                        ? 'เครื่องดื่ม'
                        : 'ของใช้'}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-900 tabular-nums">
                      ฿{prod.price}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-extrabold text-slate-900 tabular-nums text-sm">
                      {stockQty}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onAdjustStock(selectedBranchId, prod.id, -1)}
                          disabled={stockQty <= 0}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-md text-[11px] font-medium transition-colors"
                        >
                          -1 ขาย
                        </button>
                        <button
                          onClick={() => onAdjustStock(selectedBranchId, prod.id, 5)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold transition-colors"
                        >
                          +5 เติม
                        </button>
                        <button
                          onClick={() => onSetStock(selectedBranchId, prod.id, 0)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-[11px] font-medium transition-colors"
                        >
                          เซ็ตเป็น 0
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Stock Deduction Audit Activity Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#007A3D] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                บันทึกการตัดสต๊อกอัตโนมัติ (Live Auto-Deduction Event Log)
              </h3>
              <p className="text-[11px] text-slate-500">
                แสดงประวัติการอัปเดตสต๊อกแบบเรียลไทม์ทุกครั้งที่มีคำสั่งซื้อหรือการเติมของ
              </p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {stockLogs.length} รายการล่าสุด
          </span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {stockLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {log.timestamp}
                </span>
                <span className="font-semibold text-slate-800">{log.branchName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-700">{log.productName}</span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-bold tabular-nums ${
                    log.change < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {log.change > 0 ? `+${log.change}` : log.change} ชิ้น
                </span>
                <span className="text-slate-500 text-[11px]">
                  (คงเหลือ {log.remaining} ชิ้น)
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  {log.reason}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
