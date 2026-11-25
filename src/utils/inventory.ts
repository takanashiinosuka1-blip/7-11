/**
 * Inventory, geolocation, order calculation, and dynamic branch order lock logic
 */

export interface ProductPromoOffer {
  id: string;
  badge: string; // เช่น "จับคู่สุดคุ้ม", "ซื้อครบลดเพิ่ม", "แลกแสตมป์คุ้ม"
  title: string;
  description: string;
  promoType: 'bundle' | 'multi_buy' | 'coupon_combo' | 'mstamp_boost';
  targetQuantity?: number; // เช่น ซื้อครบ 2 หรือ 3 ชิ้น
  bundleProductId?: string; // สินค้าคู่กัน (ถ้าเป็นโปรจับคู่)
  extraDiscount: number; // ส่วนลดพิเศษเมื่อซื้อตามโปรนี้
  couponCode?: string; // โค้ดคูปองที่ใช้ร่วมกันได้
  bonusMStamps?: number;
  highlightSavingText: string; // เช่น "ประหยัดรวม ฿15 + รับฟรี 6 แสตมป์"
}

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  category: 'ready_meals' | 'all_cafe' | 'toasties' | 'snacks' | 'beverages' | 'daily_essentials';
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  isHotDeal?: boolean;
  isMStamp?: boolean;
  mStampEarned?: number;
  volumeOrWeight?: string;
  relatedPromos?: ProductPromoOffer[];
}

export type BranchType = 'main' | 'sub';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  open24Hours: boolean;
  deliveryRadiusKm: number;
  estimatedMinutes: number;
  branchType?: BranchType; // 'main' = สาขาใหญ่, 'sub' = สาขาย่อย
  activeOrders?: number; // จำนวนออเดอร์ปัจจุบันของสาขา
  maxOrderCapacity?: number; // ขีดจำกัดออเดอร์สูงสุด (สาขาใหญ่ = 70, สาขาย่อย = 50)
  targetOrderThreshold?: number; // เกณฑ์มาตรฐาน (40 ออเดอร์)
}

export interface BranchLockRulesConfig {
  mainMaxOrders: number; // 70 orders
  subTargetThreshold: number; // 40 orders
  subOverloadCapacity: number; // 50 orders (เยอะเกินรับมือ)
  subMinThreshold: number; // 15 orders (เกณฑ์ขั้นต่ำสาขาย่อย)
  subBalanceTolerance: number; // 6 orders (ผลต่างที่ถือว่าใกล้เคียงกัน)
  mainUnlockBalancedAvgMin: number; // 30 orders (ค่าเฉลี่ยสาขาย่อยเมื่อใกล้เคียงกันเพื่อปลดล็อคสาขาใหญ่)
}

export const DEFAULT_BRANCH_LOCK_CONFIG: BranchLockRulesConfig = {
  mainMaxOrders: 70,
  subTargetThreshold: 40,
  subOverloadCapacity: 50,
  subMinThreshold: 15,
  subBalanceTolerance: 6,
  mainUnlockBalancedAvgMin: 30,
};

export interface BranchLockEvaluation {
  branchId: string;
  branchType: BranchType;
  activeOrders: number;
  maxCapacity: number;
  isLocked: boolean;
  statusBadge: string;
  lockReason: string;
  unlockCondition: string;
  loadPercentage: number;
}

export interface BranchSystemSummary {
  evaluations: Record<string, BranchLockEvaluation>;
  mainBranchLocked: boolean;
  lockedCount: number;
  unlockedCount: number;
  minSubOrders: number;
  maxSubOrders: number;
  avgSubOrders: number;
  hasZeroOrderSub: boolean;
  areSubsBalanced: boolean;
  allSubsAboveTarget: boolean;
  anySubOverloaded: boolean;
}

/**
 * Evaluates which branches should be locked/unlocked according to the 4 priority rules:
 * 1. Lock Main Branch first if Sub-Branches are < 40 orders OR Main Branch >= 70 orders.
 * 2. Lock Sub-Branch if a nearby Sub-Branch has 0 orders or is below threshold (< 15) / far behind.
 * 3. Unlock Main Branch (when < 70) only when Sub-Branches are >= 40 orders, OR Sub-Branches have balanced/close average orders, OR a Sub-Branch is overloaded (>= 50).
 * 4. Unlock Sub-Branches only when no Sub-Branch has 0 orders AND Sub-Branch order counts are close to each other.
 */
export function evaluateBranchLockStatus(
  branches: Branch[],
  config: BranchLockRulesConfig = DEFAULT_BRANCH_LOCK_CONFIG
): BranchSystemSummary {
  const mainBranches = branches.filter((b) => (b.branchType ?? 'sub') === 'main');
  const subBranches = branches.filter((b) => (b.branchType ?? 'sub') === 'sub');

  const subOrders = subBranches.map((b) => b.activeOrders ?? 0);
  const minSubOrders = subOrders.length > 0 ? Math.min(...subOrders) : 0;
  const maxSubOrders = subOrders.length > 0 ? Math.max(...subOrders) : 0;
  const avgSubOrders =
    subOrders.length > 0
      ? Math.round((subOrders.reduce((sum, v) => sum + v, 0) / subOrders.length) * 10) / 10
      : 0;

  const hasZeroOrderSub = subBranches.some((b) => (b.activeOrders ?? 0) === 0);
  const hasBelowMinSub = subBranches.some((b) => (b.activeOrders ?? 0) < config.subMinThreshold);
  const allSubsAboveTarget =
    subBranches.length > 0 &&
    subBranches.every((b) => (b.activeOrders ?? 0) >= config.subTargetThreshold);
  const anySubOverloaded = subBranches.some(
    (b) => (b.activeOrders ?? 0) >= config.subOverloadCapacity
  );
  const areSubsBalanced =
    subBranches.length > 0 &&
    !hasZeroOrderSub &&
    !hasBelowMinSub &&
    maxSubOrders - minSubOrders <= config.subBalanceTolerance;

  const evaluations: Record<string, BranchLockEvaluation> = {};

  // Evaluate Main Branches
  for (const main of mainBranches) {
    const orders = main.activeOrders ?? 0;
    const maxCap = main.maxOrderCapacity ?? config.mainMaxOrders;
    const loadPercentage = Math.min(100, Math.round((orders / maxCap) * 100));

    if (orders >= config.mainMaxOrders) {
      evaluations[main.id] = {
        branchId: main.id,
        branchType: 'main',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: true,
        statusBadge: `ล็อคสาขาใหญ่ (ออเดอร์เต็ม ${orders}/${config.mainMaxOrders})`,
        lockReason: `ยอดออเดอร์สาขาใหญ่ถึงขีดจำกัดสูงสุด (${orders}/${config.mainMaxOrders} ออเดอร์) ระบบล็อคเพื่อป้องกันคิวล้น`,
        unlockCondition: `ปลดล็อคเมื่อยอดออเดอร์สาขาใหญ่ลดลงต่ำกว่า ${config.mainMaxOrders} ออเดอร์ และสาขาย่อยพร้อมรองรับ`,
        loadPercentage,
      };
    } else if (hasZeroOrderSub) {
      evaluations[main.id] = {
        branchId: main.id,
        branchType: 'main',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: true,
        statusBadge: 'ล็อคสาขาใหญ่ (กระจายไปสาขาย่อย 0 ออเดอร์)',
        lockReason:
          'มีสาขาย่อยที่ยอดออเดอร์เป็น 0 และต่ำกว่า 40 ออเดอร์ จึงล็อคสาขาใหญ่ก่อนเพื่อบังคับกระจายออเดอร์ไปสาขาย่อย',
        unlockCondition:
          'ปลดล็อคเมื่อไม่มีสาขาย่อยใดเป็น 0 และยอดออเดอร์สาขาย่อยเฉลี่ยใกล้เคียงกัน หรือทุกสาขาย่อย ≥ 40 ออเดอร์',
        loadPercentage,
      };
    } else if (allSubsAboveTarget) {
      evaluations[main.id] = {
        branchId: main.id,
        branchType: 'main',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: false,
        statusBadge: 'ปลดล็อคแล้ว (สาขาย่อย ≥ 40 ออเดอร์)',
        lockReason: `สาขาย่อยทุกสาขามียอดออเดอร์สูงกว่าเกณฑ์ (${config.subTargetThreshold} ออเดอร์) ระบบจึงปลดล็อคสาขาใหญ่ให้ช่วยรับออเดอร์`,
        unlockCondition: 'เปิดรับออเดอร์ปกติ (จะล็อคอีกครั้งเมื่อถึง 70 ออเดอร์)',
        loadPercentage,
      };
    } else if (anySubOverloaded) {
      evaluations[main.id] = {
        branchId: main.id,
        branchType: 'main',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: false,
        statusBadge: 'ปลดล็อคฉุกเฉิน (สาขาย่อยออเดอร์ล้น)',
        lockReason: `มีสาขาย่อยมียอดออเดอร์เยอะเกินรับมือ (≥ ${config.subOverloadCapacity} ออเดอร์) จึงปลดล็อคสาขาใหญ่เพื่อแบ่งเบาภาระ`,
        unlockCondition: 'เปิดรับออเดอร์ช่วยสาขาย่อย (จะล็อคเมื่อสาขาใหญ่ถึง 70 ออเดอร์)',
        loadPercentage,
      };
    } else if (areSubsBalanced && avgSubOrders >= config.mainUnlockBalancedAvgMin) {
      evaluations[main.id] = {
        branchId: main.id,
        branchType: 'main',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: false,
        statusBadge: 'ปลดล็อคแล้ว (สาขาย่อยยอดเฉลี่ยใกล้เคียงกัน)',
        lockReason: `สาขาย่อยมียอดออเดอร์เฉลี่ยใกล้เคียงกัน (${avgSubOrders} ออเดอร์, ต่างกันไม่เกิน ${config.subBalanceTolerance}) และไม่มีสาขาใดเป็น 0`,
        unlockCondition: 'เปิดรับออเดอร์ควบคู่กับสาขาย่อย',
        loadPercentage,
      };
    } else {
      evaluations[main.id] = {
        branchId: main.id,
        branchType: 'main',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: true,
        statusBadge: 'ล็อคสาขาใหญ่ (สาขาย่อยยังต่ำกว่า 40 ออเดอร์)',
        lockReason: `สาขาย่อยยังมียอดต่ำกว่าเกณฑ์ ${config.subTargetThreshold} ออเดอร์ (เฉลี่ย ${avgSubOrders} ออเดอร์) ล็อคสาขาใหญ่ก่อนเพื่อส่งออเดอร์ไปสาขาย่อย`,
        unlockCondition: `ปลดล็อคเมื่อสาขาย่อยทุกแห่ง ≥ ${config.subTargetThreshold} ออเดอร์ หรือยอดสาขาย่อยเฉลี่ยใกล้เคียงกัน (≥ ${config.mainUnlockBalancedAvgMin} ออเดอร์) หรือสาขาย่อยล้นมือ (≥ ${config.subOverloadCapacity})`,
        loadPercentage,
      };
    }
  }

  // Evaluate Sub-Branches
  for (const sub of subBranches) {
    const orders = sub.activeOrders ?? 0;
    const maxCap = sub.maxOrderCapacity ?? config.subOverloadCapacity;
    const loadPercentage = Math.min(100, Math.round((orders / maxCap) * 100));

    if (orders >= config.subOverloadCapacity) {
      evaluations[sub.id] = {
        branchId: sub.id,
        branchType: 'sub',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: true,
        statusBadge: `ล็อคสาขาย่อย (ออเดอร์เกินรับมือ ${orders}/${config.subOverloadCapacity})`,
        lockReason: `ยอดออเดอร์สาขาย่อยเยอะเกินรับมือ (${orders} ออเดอร์) ระบบล็อคและส่งต่อออเดอร์ไปยังสาขาใหญ่หรือสาขาย่อยอื่น`,
        unlockCondition: `ปลดล็อคเมื่อยอดออเดอร์ลดลงต่ำกว่า ${config.subOverloadCapacity} ออเดอร์ และใกล้เคียงกับสาขาย่อยอื่น`,
        loadPercentage,
      };
    } else if (hasZeroOrderSub) {
      if (orders > 0) {
        evaluations[sub.id] = {
          branchId: sub.id,
          branchType: 'sub',
          activeOrders: orders,
          maxCapacity: maxCap,
          isLocked: true,
          statusBadge: 'ล็อคชั่วคราว (มีสาขาย่อยอื่น Order = 0)',
          lockReason:
            'มีสาขาย่อยใกล้เคียงที่มียอดออเดอร์เป็น 0 ระบบจึงล็อคสาขานี้ชั่วคราวเพื่อบังคับกระจายออเดอร์ไปยังสาขาที่มี 0 ออเดอร์ก่อน',
          unlockCondition:
            'ห้ามมีสาขาใดมีออเดอร์เป็น 0 และยอดออเดอร์ของสาขาย่อยอื่นต้องขึ้นมาใกล้เคียงกันก่อนจึงจะปลดล็อค',
          loadPercentage,
        };
      } else {
        evaluations[sub.id] = {
          branchId: sub.id,
          branchType: 'sub',
          activeOrders: orders,
          maxCapacity: maxCap,
          isLocked: false,
          statusBadge: 'เปิดรับด่วนพิเศษ (สาขานี้มี 0 ออเดอร์)',
          lockReason:
            'สาขานี้ยังมียอดออเดอร์เป็น 0 ระบบจึงเปิดรับออเดอร์เป็นลำดับแรกและล็อคสาขาอื่นชั่วคราวเพื่อดึงยอดขึ้นมา',
          unlockCondition: 'พร้อมรับออเดอร์ทันที',
          loadPercentage,
        };
      }
    } else if (orders - minSubOrders > config.subBalanceTolerance) {
      evaluations[sub.id] = {
        branchId: sub.id,
        branchType: 'sub',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: true,
        statusBadge: `ล็อคชั่วคราว (รอยอดสาขาย่อยอื่นไล่ทัน)`,
        lockReason: `มียอดออเดอร์ (${orders}) สูงกว่าสาขาย่อยที่ต่ำสุด (${minSubOrders} ออเดอร์) เกินเกณฑ์สมดุล ล็อคเพื่อให้สาขาย่อยอื่นมียอดใกล้เคียงกันก่อน`,
        unlockCondition: `ปลดล็อคเมื่อสาขาย่อยอื่นมียอดออเดอร์ใกล้เคียงกัน (ผลต่างไม่เกิน ${config.subBalanceTolerance} ออเดอร์)`,
        loadPercentage,
      };
    } else if (hasBelowMinSub && orders >= config.subMinThreshold) {
      evaluations[sub.id] = {
        branchId: sub.id,
        branchType: 'sub',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: true,
        statusBadge: `ล็อคชั่วคราว (มีสาขาย่อยต่ำกว่าเกณฑ์ ${config.subMinThreshold})`,
        lockReason: `มีสาขาย่อยใกล้เคียงมียอดออเดอร์ต่ำกว่าเกณฑ์ขั้นต่ำ (${config.subMinThreshold} ออเดอร์) ระบบจึงส่งออเดอร์ไปช่วยสาขาที่ยอดต่ำก่อน`,
        unlockCondition: `ปลดล็อคเมื่อสาขาย่อยทุกแห่งมียอดผ่านเกณฑ์ ${config.subMinThreshold} ออเดอร์ และมียอดใกล้เคียงกัน`,
        loadPercentage,
      };
    } else {
      evaluations[sub.id] = {
        branchId: sub.id,
        branchType: 'sub',
        activeOrders: orders,
        maxCapacity: maxCap,
        isLocked: false,
        statusBadge: areSubsBalanced
          ? 'เปิดรับออเดอร์ (ยอดสาขาย่อยสมดุล)'
          : 'เปิดรับออเดอร์ (เร่งเพิ่มยอดให้สมดุล)',
        lockReason: areSubsBalanced
          ? `ยอดออเดอร์สาขาย่อยทุกแห่งใกล้เคียงกัน (เฉลี่ย ${avgSubOrders} ออเดอร์) และไม่มีสาขาใดมีออเดอร์เป็น 0`
          : `เปิดรับออเดอร์เพื่อให้ยอดออเดอร์ (${orders}) ขยับขึ้นไปใกล้เคียงกับสาขาย่อยอื่น`,
        unlockCondition: 'พร้อมรับออเดอร์และตัดสต๊อกอัตโนมัติ',
        loadPercentage,
      };
    }
  }

  const allEvals = Object.values(evaluations);
  const lockedCount = allEvals.filter((e) => e.isLocked).length;
  const unlockedCount = allEvals.filter((e) => !e.isLocked).length;
  const mainBranchLocked = mainBranches.length > 0 ? evaluations[mainBranches[0].id]?.isLocked ?? false : false;

  return {
    evaluations,
    mainBranchLocked,
    lockedCount,
    unlockedCount,
    minSubOrders,
    maxSubOrders,
    avgSubOrders,
    hasZeroOrderSub,
    areSubsBalanced,
    allSubsAboveTarget,
    anySubOverloaded,
  };
}

/**
 * Finds the best available (unlocked) nearest branch to user's coordinates
 */
export function findNearestAvailableBranch(
  branches: Branch[],
  lat: number,
  lng: number
): {
  branch: Branch;
  distanceKm: number;
  wasRedirected: boolean;
  originalNearestBranch: Branch;
  summary: BranchSystemSummary;
} {
  if (branches.length === 0) {
    throw new Error('No branches available');
  }

  const summary = evaluateBranchLockStatus(branches);
  const nearestOverall = findNearestBranch(branches, lat, lng);

  const unlockedBranches = branches.filter((b) => !summary.evaluations[b.id]?.isLocked);
  if (unlockedBranches.length === 0) {
    // Fallback if all are locked: pick the branch with the lowest activeOrders
    const fallback = [...branches].sort(
      (a, b) => (a.activeOrders ?? 0) - (b.activeOrders ?? 0)
    )[0];
    return {
      branch: fallback,
      distanceKm: calculateDistance(lat, lng, fallback.lat, fallback.lng),
      wasRedirected: fallback.id !== nearestOverall.branch.id,
      originalNearestBranch: nearestOverall.branch,
      summary,
    };
  }

  const nearestUnlocked = findNearestBranch(unlockedBranches, lat, lng);
  return {
    branch: nearestUnlocked.branch,
    distanceKm: nearestUnlocked.distanceKm,
    wasRedirected: nearestUnlocked.branch.id !== nearestOverall.branch.id,
    originalNearestBranch: nearestOverall.branch,
    summary,
  };
}

export interface BranchStock {
  branchId: string;
  stock: Record<string, number>; // productId -> quantity
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type DropOffMethod = 'hand_to_hand' | 'leave_at_lobby' | 'hang_at_gate';

export interface DeliveryAddress {
  id: string;
  label: 'บ้าน' | 'คอนโด' | 'ที่ทำงาน' | 'อื่นๆ';
  recipientName: string;
  phone: string;
  houseNumber: string; // เช่น 45/12 ชั้น 8 ห้อง 802
  buildingOrVillage?: string;
  floor?: string;
  roomNumber?: string;
  soi: string;
  street: string;
  subDistrict: string; // แขวง / ตำบล
  district: string; // เขต / อำเภอ
  province: string;
  postalCode: string;
  landmark?: string; // จุดสังเกต
  riderNotes?: string; // คำแนะนำการส่ง
  dropOffMethod?: DropOffMethod; // รูปแบบการรับสินค้า
  lat: number;
  lng: number;
  isDefault?: boolean;
}

export interface TrackingStepLog {
  stepIndex: number; // 0 to 4
  code: 'confirmed' | 'packing' | 'picked_up' | 'delivering' | 'completed';
  title: string;
  detail: string;
  timestamp: string;
  completed: boolean;
}

export interface RiderInfo {
  name: string;
  phone: string;
  plateNumber: string;
  rating: number;
  avatarCode: string;
}

export interface DeliverySchedule {
  mode: 'express' | 'scheduled';
  slotLabel: string; // เช่น "ส่งด่วนทันที (15-20 นาที)" หรือ "วันนี้ 21:30 - 22:00 น."
  heatingPreference: 'heat_now' | 'no_heat' | 'separate_ice';
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  branchId: string;
  branchName: string;
  branchLat: number;
  branchLng: number;
  address: DeliveryAddress;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  grandTotal: number;
  mStampsEarned: number;
  paymentMethod: 'promptpay' | 'truemoney' | 'cod' | 'credit_card';
  status: 'confirmed' | 'packing' | 'picked_up' | 'delivering' | 'completed';
  currentStepIndex: number; // 0 to 4
  riderProgressPercent: number; // 0 to 100 along route
  createdAt: string;
  estimatedArrivalTime: string;
  estimatedTotalMinutes: number;
  prepMinutes: number;
  travelMinutes: number;
  distanceKm: number;
  schedule: DeliverySchedule;
  rider: RiderInfo;
  timeline: TrackingStepLog[];
}

/**
 * Calculates detailed time breakdown (prep time + travel time + ETA) based on distance and item count
 */
export function calculateDeliveryTimeEstimate(
  distanceKm: number,
  itemCount: number,
  hasHeatedItems: boolean = true,
  baseDate: Date = new Date()
): {
  prepMinutes: number;
  travelMinutes: number;
  totalMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  etaText: string;
  etaWindowText: string;
} {
  // Base store packing time: 4 mins + 1 min per 3 items + 3 mins if heated toastie/bento
  const itemPrep = Math.ceil(Math.max(1, itemCount) / 3);
  const heatPrep = hasHeatedItems ? 3 : 0;
  const prepMinutes = 4 + itemPrep + heatPrep;

  // Rider travel time: ~4 mins per km (minimum 5 mins)
  const travelMinutes = Math.max(5, Math.round(distanceKm * 4.5));
  const totalMinutes = prepMinutes + travelMinutes;

  const minMinutes = Math.max(10, totalMinutes - 2);
  const maxMinutes = totalMinutes + 5;

  const arrivalMin = new Date(baseDate.getTime() + minMinutes * 60000);
  const arrivalMax = new Date(baseDate.getTime() + maxMinutes * 60000);

  const formatHHMM = (d: Date) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return {
    prepMinutes,
    travelMinutes,
    totalMinutes,
    minMinutes,
    maxMinutes,
    etaText: `${formatHHMM(arrivalMin)} น.`,
    etaWindowText: `${formatHHMM(arrivalMin)} - ${formatHHMM(arrivalMax)} น.`,
  };
}

/**
 * Calculates straight line distance (Haversine formula in KM)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100;
}

/**
 * Finds the closest branch to user's coordinates
 */
export function findNearestBranch(
  branches: Branch[],
  lat: number,
  lng: number
): { branch: Branch; distanceKm: number } {
  if (branches.length === 0) {
    throw new Error('No branches available');
  }

  let closest = branches[0];
  let minDistance = calculateDistance(lat, lng, closest.lat, closest.lng);

  for (let i = 1; i < branches.length; i++) {
    const dist = calculateDistance(lat, lng, branches[i].lat, branches[i].lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = branches[i];
    }
  }

  return { branch: closest, distanceKm: minDistance };
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

/**
 * Checks stock state for a specific product in a branch
 */
export function checkStockStatus(currentStock: number | undefined): {
  status: StockStatus;
  label: string;
  color: string;
  quantity: number;
} {
  const qty = typeof currentStock === 'number' ? Math.max(0, currentStock) : 0;
  if (qty <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      label: 'สินค้าหมด',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      quantity: 0,
    };
  }
  if (qty <= 3) {
    return {
      status: 'LOW_STOCK',
      label: `เหลือเพียง ${qty} ชิ้น`,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      quantity: qty,
    };
  }
  return {
    status: 'IN_STOCK',
    label: `มีสินค้า (${qty} ชิ้น)`,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    quantity: qty,
  };
}

/**
 * Deducts stock automatically for a given branch
 * Returns updated stock record or throws error if insufficient
 */
export function deductStock(
  branchStock: BranchStock,
  items: CartItem[]
): {
  updatedStock: BranchStock;
  deductions: { productId: string; requested: number; remaining: number }[];
} {
  const newStockMap = { ...branchStock.stock };
  const deductions: { productId: string; requested: number; remaining: number }[] = [];

  // 1. First verify all items have enough stock
  for (const item of items) {
    const current = newStockMap[item.productId] ?? 0;
    if (current < item.quantity) {
      throw new Error(
        `สินค้าไม่เพียงพอ (ID: ${item.productId}): ต้องการ ${item.quantity} แต่มีเพียง ${current}`
      );
    }
  }

  // 2. Perform safe deduction
  for (const item of items) {
    const current = newStockMap[item.productId] ?? 0;
    const remaining = current - item.quantity;
    newStockMap[item.productId] = remaining;
    deductions.push({
      productId: item.productId,
      requested: item.quantity,
      remaining,
    });
  }

  return {
    updatedStock: {
      ...branchStock,
      stock: newStockMap,
    },
    deductions,
  };
}

/**
 * Restocks or adjust inventory for testing / warehouse restock
 */
export function updateProductStock(
  branchStock: BranchStock,
  productId: string,
  newQuantity: number
): BranchStock {
  return {
    ...branchStock,
    stock: {
      ...branchStock.stock,
      [productId]: Math.max(0, newQuantity),
    },
  };
}

/**
 * Calculates order subtotal, discounts, delivery fees, and earned M-Stamps
 */
export function calculateOrderTotals(
  cart: CartItem[],
  products: Record<string, Product>,
  usePointsDiscount: number = 0
): {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  earnedMStamps: number;
  totalItemsCount: number;
} {
  let subtotal = 0;
  let earnedMStamps = 0;
  let totalItemsCount = 0;

  for (const item of cart) {
    const prod = products[item.productId];
    if (prod) {
      subtotal += prod.price * item.quantity;
      totalItemsCount += item.quantity;
      if (prod.mStampEarned) {
        earnedMStamps += prod.mStampEarned * item.quantity;
      }
    }
  }

  // Standard 7-Delivery rules: Free delivery when ordering >= 100 THB, otherwise 20 THB
  const deliveryFee = subtotal >= 100 || subtotal === 0 ? 0 : 20;
  const discount = Math.min(subtotal, Math.max(0, usePointsDiscount));
  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    subtotal,
    discount,
    deliveryFee,
    total,
    earnedMStamps,
    totalItemsCount,
  };
}

/**
 * Validates manual address entry
 */
export function validateDeliveryAddress(address: Partial<DeliveryAddress>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!address.recipientName?.trim()) {
    errors.recipientName = 'กรุณาระบุชื่อผู้รับ';
  }
  if (!address.phone?.trim() || !/^[0-9\-+\s]{9,12}$/.test(address.phone.trim())) {
    errors.phone = 'กรุณาระบุเบอร์โทรศัพท์ติดต่อที่ถูกต้อง';
  }
  if (!address.houseNumber?.trim()) {
    errors.houseNumber = 'กรุณาระบุเลขที่บ้าน หรือ อาคาร/ห้อง';
  }
  if (!address.subDistrict?.trim()) {
    errors.subDistrict = 'กรุณาระบุแขวง/ตำบล';
  }
  if (!address.district?.trim()) {
    errors.district = 'กรุณาระบุเขต/อำเภอ';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
