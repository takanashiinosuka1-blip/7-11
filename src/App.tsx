/**
 * 7-Delivery Redesign & Auto-Stock System
 * Enhanced with:
 * 1. Priority Branch Order Load-Balancing & Auto-Lock System (ล็อคสาขาใหญ่เมื่อย่อย < 40 หรือใหญ่ >= 70, ล็อคสาขาย่อยเมื่อมีย่อยอื่น = 0 หรือต่ำกว่าเกณฑ์, ปลดล็อคเมื่อยอดเฉลี่ยใกล้เคียงกัน/ผ่านเกณฑ์)
 * 2. Interactive Sliding Ad Banner with Direct Add-to-Cart (แบนเนอร์โฆษณาแบบสไลด์ กดเพิ่มสินค้าโปรลงตะกร้าได้ทันที)
 * 3. Product-Specific Promo Decision Modal (เวลากดดูสินค้าจะแสดงโปรโมชั่นของสินค้านั้นๆ เพื่อให้ตัดสินใจซื้อตามโปรได้ทันที)
 * 4. Dedicated Promotional Products Menu (เมนูแยกสำหรับสินค้าโปรโมชั่นและชุดเซ็ตสุดคุ้ม)
 */

import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { PromoShowcase } from './components/PromoShowcase.tsx';
import { PromoMenuView } from './components/PromoMenuView.tsx';
import { CategoryBar } from './components/CategoryBar.tsx';
import { ProductGrid } from './components/ProductGrid.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { AddressModal } from './components/AddressModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { InventoryDashboard } from './components/InventoryDashboard.tsx';
import { OrderHistoryModal } from './components/OrderHistoryModal.tsx';
import { AuditComparisonModal } from './components/AuditComparisonModal.tsx';

import {
  INITIAL_BRANCHES,
  INITIAL_PRODUCTS,
  INITIAL_BRANCH_STOCKS,
  INITIAL_SAVED_ADDRESSES,
  INITIAL_ORDERS,
  SlideAdBannerItem,
} from './data/mockData.ts';

import {
  Product,
  ProductPromoOffer,
  Branch,
  BranchStock,
  DeliveryAddress,
  DeliverySchedule,
  CartItem,
  OrderRecord,
  calculateDistance,
  findNearestAvailableBranch,
  evaluateBranchLockStatus,
  deductStock,
  calculateOrderTotals,
  calculateDeliveryTimeEstimate,
} from './utils/inventory.ts';

import {
  CheckCircle2,
  Bike,
  ChevronRight,
  Lock,
  Unlock,
  Sliders,
} from 'lucide-react';

export default function App() {
  // Master Datasets (Branches now stateful for live order count & auto-lock)
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [branchStocks, setBranchStocks] =
    useState<Record<string, BranchStock>>(INITIAL_BRANCH_STOCKS);
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>(
    INITIAL_SAVED_ADDRESSES
  );

  // User Location & Schedule State
  const [currentAddress, setCurrentAddress] = useState<DeliveryAddress>(
    INITIAL_SAVED_ADDRESSES[0]
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    const match = findNearestAvailableBranch(
      INITIAL_BRANCHES,
      INITIAL_SAVED_ADDRESSES[0].lat,
      INITIAL_SAVED_ADDRESSES[0].lng
    );
    return match.branch.id;
  });

  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule>({
    mode: 'express',
    slotLabel: 'ส่งด่วนทันที (15-20 นาที)',
    heatingPreference: 'heat_now',
  });

  // Promotional Coupons State
  const [claimedCoupons, setClaimedCoupons] = useState<string[]>([]);
  const [activeCouponCode, setActiveCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  // Cart & Member Rewards
  const [cart, setCart] = useState<CartItem[]>([
    { productId: 'prod-toastie-ham-cheese', quantity: 1 },
    { productId: 'prod-allcafe-matcha', quantity: 1 },
  ]);

  const [allMemberPoints, setAllMemberPoints] = useState<number>(1450);
  const [mStampCount, setMStampCount] = useState<number>(12);

  // Orders & Stock Logs
  const [orders, setOrders] = useState<OrderRecord[]>(INITIAL_ORDERS);
  const [stockLogs, setStockLogs] = useState<
    {
      id: string;
      timestamp: string;
      branchName: string;
      productName: string;
      change: number;
      remaining: number;
      reason: string;
    }[]
  >([
    {
      id: 'log-init-1',
      timestamp: '20:42:10',
      branchName: 'สาขาใหญ่ อโศก ทาวเวอร์',
      productName: 'แซนวิชครัวซองต์แฮมชีส (อบร้อน)',
      change: -2,
      remaining: 12,
      reason: 'คำสั่งซื้อออนไลน์ #7D-8842 (กำลังจัดส่ง)',
    },
    {
      id: 'log-init-2',
      timestamp: '20:15:00',
      branchName: 'สาขาใหญ่ อโศก ทาวเวอร์',
      productName: 'ไอศกรีมเนสท์เล่ ไมโล',
      change: -5,
      remaining: 0,
      reason: 'คำสั่งซื้อออนไลน์ #7D-8790 (สินค้าหมด)',
    },
  ]);

  // Views & Modals ('promotions' added for Dedicated Promo Menu)
  const [activeView, setActiveView] = useState<
    'shop' | 'promotions' | 'inventory' | 'orders' | 'audit'
  >('shop');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] =
    useState<Product | null>(null);

  // Shop Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [dealsOnly, setDealsOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');

  // Flash Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3400);
  };

  // Lookup Maps & Dynamic Branch Lock Evaluation
  const productsMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const branchLockSummary = useMemo(() => {
    return evaluateBranchLockStatus(branches);
  }, [branches]);

  const currentBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) || branches[0];
  }, [branches, selectedBranchId]);

  const currentBranchLock = branchLockSummary.evaluations[currentBranch.id];

  const branchDistanceKm = useMemo(() => {
    return calculateDistance(
      currentAddress.lat,
      currentAddress.lng,
      currentBranch.lat,
      currentBranch.lng
    );
  }, [currentAddress, currentBranch]);

  const currentStock = branchStocks[selectedBranchId] || {
    branchId: selectedBranchId,
    stock: {},
  };

  const cartTotals = useMemo(() => {
    return calculateOrderTotals(cart, productsMap, couponDiscount);
  }, [cart, productsMap, couponDiscount]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (dealsOnly) {
      result = result.filter(
        (p) => p.isHotDeal || (p.originalPrice && p.originalPrice > p.price)
      );
    }

    if (inStockOnly) {
      result = result.filter((p) => {
        const qty = currentStock.stock[p.id] ?? 0;
        return qty > 0;
      });
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, selectedCategory, searchQuery, dealsOnly, inStockOnly, sortBy, currentStock]);

  // Branch Order Load & Lock Simulator Handlers
  const handleAdjustBranchOrders = (branchId: string, delta: number) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? { ...b, activeOrders: Math.max(0, (b.activeOrders ?? 0) + delta) }
          : b
      )
    );
  };

  const handleSetBranchOrders = (branchId: string, ordersCount: number) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId ? { ...b, activeOrders: Math.max(0, ordersCount) } : b
      )
    );
    const targetBranch = branches.find((b) => b.id === branchId);
    showToast(
      `อัปเดตยอดออเดอร์ ${targetBranch?.name || 'สาขา'} เป็น ${ordersCount} Order`
    );
  };

  const handleApplyOrderScenario = (
    ordersByBranchId: Record<string, number>,
    scenarioTitle: string
  ) => {
    const nextBranches = branches.map((b) => ({
      ...b,
      activeOrders:
        ordersByBranchId[b.id] !== undefined
          ? ordersByBranchId[b.id]
          : b.activeOrders ?? 0,
    }));
    setBranches(nextBranches);

    // Auto-route to best unlocked branch according to priority rules
    const best = findNearestAvailableBranch(
      nextBranches,
      currentAddress.lat,
      currentAddress.lng
    );
    setSelectedBranchId(best.branch.id);
    showToast(
      `⚡ จำลอง "${scenarioTitle}" สำเร็จ → ระบบเลือก ${best.branch.name} ที่เปิดรับออเดอร์`
    );
  };

  const handleSwitchToAvailableBranch = () => {
    const best = findNearestAvailableBranch(
      branches,
      currentAddress.lat,
      currentAddress.lng
    );
    setSelectedBranchId(best.branch.id);
    showToast(`สลับไปยัง "${best.branch.name}" ที่เปิดรับออเดอร์เรียบร้อย`);
  };

  // Promo Coupon Handler
  const handleClaimAndApplyCoupon = (
    code: string,
    discountAmount: number,
    title: string
  ) => {
    if (!claimedCoupons.includes(code)) {
      setClaimedCoupons((prev) => [...prev, code]);
    }
    setActiveCouponCode(code);
    setCouponDiscount(discountAmount);
    showToast(
      `🎟️ เก็บและใช้คูปอง "${code}" ลด ฿${discountAmount} (${title}) ในตะกร้าแล้ว!`
    );
  };

  // Direct Add-to-Cart from Slide Ad Banner
  const handleAddPromoSlideToCart = (slide: SlideAdBannerItem) => {
    const mainProd = productsMap[slide.productId];
    if (!mainProd) return;

    const availMain = currentStock.stock[slide.productId] ?? 0;
    if (availMain <= 0) {
      showToast(`ขออภัย "${mainProd.name}" สินค้าหมดที่สาขานี้`);
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      const addOne = (pid: string) => {
        const avail = currentStock.stock[pid] ?? 0;
        const idx = next.findIndex((i) => i.productId === pid);
        if (idx >= 0) {
          if (next[idx].quantity < avail) {
            next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          }
        } else if (avail > 0) {
          next.push({ productId: pid, quantity: 1 });
        }
      };

      addOne(slide.productId);
      if (slide.bundleProductId) {
        addOne(slide.bundleProductId);
      }
      return next;
    });

    if (slide.couponCode && slide.extraDiscount > 0) {
      if (!claimedCoupons.includes(slide.couponCode)) {
        setClaimedCoupons((prev) => [...prev, slide.couponCode!]);
      }
      setActiveCouponCode(slide.couponCode);
      setCouponDiscount(slide.extraDiscount);
    }

    showToast(
      `🛒 เพิ่มโปรโมชั่น "${slide.title}" ลงตะกร้าพร้อมใช้ส่วนลดเรียบร้อย!`
    );
  };

  // Apply Product-Specific Promo Offer from ProductDetailModal or PromoMenuView
  const handleApplyProductPromoOffer = (
    product: Product,
    offer: ProductPromoOffer
  ) => {
    const reqQty = offer.targetQuantity || 1;
    const availMain = currentStock.stock[product.id] ?? 0;

    if (availMain < reqQty) {
      showToast(
        `ขออภัย สต๊อก "${product.name}" มีเพียง ${availMain} ชิ้น ไม่พอสำหรับโปรนี้`
      );
      return;
    }

    setCart((prev) => {
      const next = [...prev];

      const setOrAddQty = (pid: string, qtyToAdd: number) => {
        const avail = currentStock.stock[pid] ?? 0;
        const idx = next.findIndex((i) => i.productId === pid);
        if (idx >= 0) {
          const updatedQty = Math.min(avail, Math.max(next[idx].quantity, qtyToAdd));
          next[idx] = { ...next[idx], quantity: updatedQty };
        } else {
          next.push({ productId: pid, quantity: Math.min(avail, qtyToAdd) });
        }
      };

      setOrAddQty(product.id, reqQty);
      if (offer.bundleProductId) {
        setOrAddQty(offer.bundleProductId, 1);
      }

      return next;
    });

    if (offer.couponCode && offer.extraDiscount > 0) {
      if (!claimedCoupons.includes(offer.couponCode)) {
        setClaimedCoupons((prev) => [...prev, offer.couponCode!]);
      }
      setActiveCouponCode(offer.couponCode);
      setCouponDiscount(offer.extraDiscount);
    }

    showToast(
      `🔥 เลือกซื้อตามโปร "${offer.title}" สำเร็จ! (ลดเพิ่ม ฿${offer.extraDiscount})`
    );
  };

  // Standard Cart Handlers
  const handleAddToCart = (product: Product) => {
    const available = currentStock.stock[product.id] ?? 0;
    if (available <= 0) {
      showToast(`ขออภัย "${product.name}" สินค้าหมดที่สาขานี้`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= available) {
          showToast(
            `สินค้า "${product.name}" ถึงจำนวนสูงสุดในสต๊อกแล้ว (${available} ชิ้น)`
          );
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });

    showToast(`เพิ่ม "${product.name}" ลงในตะกร้าแล้ว (สต๊อกสาขา: ${available} ชิ้น)`);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }

    const available = currentStock.stock[productId] ?? 0;
    if (quantity > available) {
      showToast(`มีสินค้าในสต๊อกสาขาเพียง ${available} ชิ้น`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // CHECKOUT & AUTOMATIC REAL-TIME STOCK DEDUCTION + BRANCH ORDER LOAD BALANCING
  const handleCheckout = (
    paymentMethod: 'promptpay' | 'truemoney' | 'cod' | 'credit_card',
    mStampsUsed: number
  ) => {
    try {
      // Check if current branch is locked; if locked, auto-redirect to best unlocked branch
      let targetBranch = currentBranch;
      if (currentBranchLock?.isLocked) {
        const routed = findNearestAvailableBranch(
          branches,
          currentAddress.lat,
          currentAddress.lng
        );
        targetBranch = routed.branch;
        setSelectedBranchId(targetBranch.id);
      }

      const targetStock = branchStocks[targetBranch.id] || {
        branchId: targetBranch.id,
        stock: {},
      };

      const deductionResult = deductStock(targetStock, cart);

      setBranchStocks((prev) => ({
        ...prev,
        [targetBranch.id]: deductionResult.updatedStock,
      }));

      // Increment activeOrders on the fulfilling branch (+1 order)
      setBranches((prev) =>
        prev.map((b) =>
          b.id === targetBranch.id
            ? { ...b, activeOrders: (b.activeOrders ?? 0) + 1 }
            : b
        )
      );

      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour12: false });
      const newLogs = deductionResult.deductions.map((d) => ({
        id: `log-${Date.now()}-${d.productId}`,
        timestamp: timeStr,
        branchName: targetBranch.name,
        productName: productsMap[d.productId]?.name || 'สินค้า',
        change: -d.requested,
        remaining: d.remaining,
        reason: `ตัดสต๊อกอัตโนมัติ (คำสั่งซื้อออนไลน์)`,
      }));

      setStockLogs((prev) => [...newLogs, ...prev]);

      const totalDiscount = mStampsUsed * 3 + couponDiscount;
      const finalTotals = calculateOrderTotals(cart, productsMap, totalDiscount);
      const targetDistKm = calculateDistance(
        currentAddress.lat,
        currentAddress.lng,
        targetBranch.lat,
        targetBranch.lng
      );
      const timeEst = calculateDeliveryTimeEstimate(
        targetDistKm,
        finalTotals.totalItemsCount,
        deliverySchedule.heatingPreference === 'heat_now',
        now
      );

      const orderNumber = `7D-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder: OrderRecord = {
        id: `order-${Date.now()}`,
        orderNumber,
        branchId: targetBranch.id,
        branchName: targetBranch.name,
        branchLat: targetBranch.lat,
        branchLng: targetBranch.lng,
        address: currentAddress,
        items: cart.map((item) => {
          const prod = productsMap[item.productId];
          return {
            productId: item.productId,
            productName: prod?.name || 'สินค้า',
            quantity: item.quantity,
            unitPrice: prod?.price || 0,
            subtotal: (prod?.price || 0) * item.quantity,
          };
        }),
        subtotal: finalTotals.subtotal,
        discount: finalTotals.discount,
        deliveryFee: finalTotals.deliveryFee,
        grandTotal: finalTotals.total,
        mStampsEarned: finalTotals.earnedMStamps,
        paymentMethod,
        status: 'packing',
        currentStepIndex: 1,
        riderProgressPercent: 25,
        createdAt: timeStr,
        estimatedArrivalTime:
          deliverySchedule.mode === 'scheduled'
            ? deliverySchedule.slotLabel
            : timeEst.etaWindowText,
        estimatedTotalMinutes: timeEst.totalMinutes,
        prepMinutes: timeEst.prepMinutes,
        travelMinutes: timeEst.travelMinutes,
        distanceKm: targetDistKm,
        schedule: { ...deliverySchedule },
        rider: {
          name: 'สมศักดิ์ ส่งไว (ไรเดอร์ 7-Delivery)',
          phone: '089-711-2424',
          plateNumber: '2กฒ-9412 กทม.',
          rating: 4.9,
          avatarCode: 'SS',
        },
        timeline: [
          {
            stepIndex: 0,
            code: 'confirmed',
            title: 'รับคำสั่งซื้อ & ตัดสต๊อกอัตโนมัติสำเร็จ',
            detail: `ระบบล็อกและตัดสต๊อกสินค้า ${finalTotals.totalItemsCount} ชิ้นจาก ${targetBranch.name}`,
            timestamp: timeStr,
            completed: true,
          },
          {
            stepIndex: 1,
            code: 'packing',
            title: 'พนักงานกำลังจัดเตรียมสินค้า & อบร้อน',
            detail: `เตรียมอาหารและเครื่องดื่มตามคำสั่ง (${deliverySchedule.slotLabel})`,
            timestamp: timeStr,
            completed: true,
          },
          {
            stepIndex: 2,
            code: 'picked_up',
            title: 'ไรเดอร์รับสินค้าออกจากสาขา',
            detail: 'ไรเดอร์ตรวจสอบรายการสินค้าครบถ้วนและออกเดินทาง',
            timestamp: 'รอดำเนินการ',
            completed: false,
          },
          {
            stepIndex: 3,
            code: 'delivering',
            title: 'กำลังเดินทางไปยังจุดหมายของคุณ',
            detail: `มุ่งหน้าไปยัง ${currentAddress.houseNumber} (ระยะทาง ${targetDistKm} กม.)`,
            timestamp: 'รอดำเนินการ',
            completed: false,
          },
          {
            stepIndex: 4,
            code: 'completed',
            title: 'จัดส่งสำเร็จถึงมือลูกค้า',
            detail: 'ส่งมอบสินค้าตามจุดรับที่ลูกค้าระบุเรียบร้อย',
            timestamp: 'รอส่งมอบ',
            completed: false,
          },
        ],
      };

      setOrders((prev) => [newOrder, ...prev]);
      setMStampCount((prev) =>
        Math.max(0, prev - mStampsUsed + finalTotals.earnedMStamps)
      );
      setAllMemberPoints((prev) => prev + Math.floor(finalTotals.total / 10));

      setCart([]);
      setIsCartDrawerOpen(false);
      showToast(
        `🎉 ออเดอร์ #${orderNumber} ยืนยันแล้วที่ ${targetBranch.name}! กำลังเปิดหน้าติดตามไรเดอร์สด`
      );
      setActiveView('orders');
    } catch (err: any) {
      showToast(`❌ ไม่สามารถตัดสต๊อกได้: ${err.message}`);
    }
  };

  // Live Order Tracking Simulation Handlers
  const handleAdvanceOrderStep = (orderId: string) => {
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour12: false });
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const nextIdx = Math.min(4, ord.currentStepIndex + 1);
        const statusMap: OrderRecord['status'][] = [
          'confirmed',
          'packing',
          'picked_up',
          'delivering',
          'completed',
        ];
        const progressMap = [15, 30, 50, 80, 100];

        return {
          ...ord,
          currentStepIndex: nextIdx,
          status: statusMap[nextIdx],
          riderProgressPercent: progressMap[nextIdx],
          timeline: ord.timeline.map((t, i) =>
            i <= nextIdx
              ? {
                  ...t,
                  completed: true,
                  timestamp: t.completed ? t.timestamp : timeStr,
                }
              : t
          ),
        };
      })
    );
    showToast('🛵 อัปเดตสถานะการจัดส่งและตำแหน่งไรเดอร์เรียบร้อย!');
  };

  const handleResetOrderTracking = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          currentStepIndex: 1,
          status: 'packing',
          riderProgressPercent: 25,
          timeline: ord.timeline.map((t, i) => ({
            ...t,
            completed: i <= 1,
          })),
        };
      })
    );
    showToast('รีเซ็ตสถานะการจำลองไรเดอร์กลับไปที่ขั้นตอนเตรียมสินค้า');
  };

  // Inventory Dashboard Simulation Handlers
  const handleAdjustStock = (branchId: string, productId: string, delta: number) => {
    const bStock = branchStocks[branchId] || { branchId, stock: {} };
    const current = bStock.stock[productId] ?? 0;
    const nextQty = Math.max(0, current + delta);

    setBranchStocks((prev) => ({
      ...prev,
      [branchId]: {
        ...bStock,
        stock: {
          ...bStock.stock,
          [productId]: nextQty,
        },
      },
    }));

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour12: false });
    setStockLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        branchName: branches.find((b) => b.id === branchId)?.name || 'สาขา',
        productName: productsMap[productId]?.name || 'สินค้า',
        change: delta,
        remaining: nextQty,
        reason: delta < 0 ? 'จำลองลูกค้าหน้าร้านซื้อ' : 'เติมสต๊อกเข้าสาขา',
      },
      ...prev,
    ]);

    showToast(`อัปเดตสต๊อก ${productsMap[productId]?.name}: ${nextQty} ชิ้น`);
  };

  const handleSetStock = (branchId: string, productId: string, quantity: number) => {
    const bStock = branchStocks[branchId] || { branchId, stock: {} };
    setBranchStocks((prev) => ({
      ...prev,
      [branchId]: {
        ...bStock,
        stock: {
          ...bStock.stock,
          [productId]: quantity,
        },
      },
    }));

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour12: false });
    setStockLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        branchName: branches.find((b) => b.id === branchId)?.name || 'สาขา',
        productName: productsMap[productId]?.name || 'สินค้า',
        change: quantity - (bStock.stock[productId] ?? 0),
        remaining: quantity,
        reason: quantity === 0 ? 'จำลองสินค้าหมด (0 ชิ้น)' : 'ปรับสต๊อกโดยตรง',
      },
      ...prev,
    ]);

    showToast(`ตั้งค่าสต๊อก ${productsMap[productId]?.name} เป็น ${quantity} ชิ้น`);
  };

  const handleResetAllStocks = () => {
    setBranchStocks(INITIAL_BRANCH_STOCKS);
    setBranches(INITIAL_BRANCHES);
    showToast('รีเซ็ตสต๊อกและยอดออเดอร์ทุกสาขาเป็นค่าเริ่มต้นแล้ว');
  };

  // Address CRUD Handlers
  const handleSelectAddress = (addr: DeliveryAddress) => {
    setCurrentAddress(addr);
    const routed = findNearestAvailableBranch(branches, addr.lat, addr.lng);
    setSelectedBranchId(routed.branch.id);
    showToast(`เปลี่ยนจุดส่งเป็น "${addr.label}" (สาขา: ${routed.branch.name})`);
  };

  const handleSaveNewAddress = (addr: DeliveryAddress) => {
    setSavedAddresses((prev) => {
      const next = addr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [addr, ...next];
    });
    showToast(`เพิ่มที่อยู่ "${addr.label}" สำเร็จ`);
  };

  const handleUpdateAddress = (updated: DeliveryAddress) => {
    setSavedAddresses((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    if (currentAddress.id === updated.id) {
      setCurrentAddress(updated);
    }
    showToast(`อัปเดตข้อมูลที่อยู่ "${updated.label}" เรียบร้อย`);
  };

  const handleDeleteAddress = (addressId: string) => {
    setSavedAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== addressId);
      if (currentAddress.id === addressId && remaining.length > 0) {
        setCurrentAddress(remaining[0]);
      }
      return remaining;
    });
    showToast('ลบที่อยู่จัดส่งเรียบร้อยแล้ว');
  };

  const handleSetDefaultAddress = (addressId: string) => {
    setSavedAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === addressId,
      }))
    );
    showToast('ตั้งค่าเป็นที่อยู่จัดส่งเริ่มต้นแล้ว');
  };

  const handleSelectBranch = (branchId: string) => {
    const evalInfo = branchLockSummary.evaluations[branchId];
    const b = branches.find((branch) => branch.id === branchId);
    setSelectedBranchId(branchId);
    if (b) {
      if (evalInfo?.isLocked) {
        showToast(
          `⚠️ "${b.name}" ถูกล็อคชั่วคราว (${evalInfo.statusBadge}) — ระบบจะสลับไปสาขาที่เปิดรับเมื่อสั่งซื้อ`
        );
      } else {
        showToast(`เปลี่ยนสาขาจัดส่งเป็น "${b.name}" สต๊อกเชื่อมโยงทันที`);
      }
    }
  };

  const latestActiveOrder = orders[0];
  const modalProductCartQty = selectedProductForModal
    ? cart.find((c) => c.productId === selectedProductForModal.id)?.quantity || 0
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#007A3D]/20">
      {/* Top Navbar */}
      <Navbar
        currentAddress={currentAddress}
        currentBranch={currentBranch}
        currentBranchLock={currentBranchLock}
        branchDistanceKm={branchDistanceKm}
        deliverySchedule={deliverySchedule}
        activeOrdersCount={orders.length}
        cartCount={cartTotals.totalItemsCount}
        cartTotal={cartTotals.total}
        allMemberPoints={allMemberPoints}
        mStampCount={mStampCount}
        activeView={activeView}
        setActiveView={(v) => {
          if (v === 'audit') {
            setIsAuditModalOpen(true);
          } else {
            setActiveView(v);
          }
        }}
        onOpenAddressModal={() => setIsAddressModalOpen(true)}
        onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Live Order Status Strip on Storefront */}
      {(activeView === 'shop' || activeView === 'promotions') && latestActiveOrder && (
        <div className="bg-emerald-950 text-white border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-[#F58220] text-white font-extrabold text-[10px] flex items-center gap-1">
                <Bike className="w-3 h-3" />
                LIVE TRACKING
              </span>
              <span className="font-semibold">
                ออเดอร์ #{latestActiveOrder.orderNumber}:{' '}
                <span className="text-emerald-300">
                  {latestActiveOrder.timeline[latestActiveOrder.currentStepIndex]?.title}
                </span>
              </span>
              <span className="hidden md:inline text-slate-300">
                · ถึงประมาณ {latestActiveOrder.estimatedArrivalTime} (ไรเดอร์เดินทางแล้ว{' '}
                {latestActiveOrder.riderProgressPercent}%)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
            >
              <span>ดูแผนที่ไรเดอร์สด & เวลาส่ง</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 w-full">
        {/* VIEW 1: SHOPPING STOREFRONT WITH SLIDE AD BANNER & BRANCH LOCK STATUS */}
        {activeView === 'shop' && (
          <div className="space-y-6">
            {/* Interactive Slide Ad Banner with Direct Add-To-Cart */}
            <HeroBanner
              productsMap={productsMap}
              currentStock={currentStock}
              onAddPromoSlideToCart={handleAddPromoSlideToCart}
              onOpenPromoMenu={() => setActiveView('promotions')}
              onOpenProductDetail={(prod) => setSelectedProductForModal(prod)}
            />

            {/* Interactive Manual Branch Order Load & Auto-Lock Control Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-[#007A3D]" />
                    <span>ปรับยอด Order สาขาด้วยตัวเอง</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    · สาขาใหญ่ล็อคเมื่อย่อย &lt; 40 หรือใหญ่ &ge; 70 · สาขาย่อยห้ามเป็น 0
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyOrderScenario(
                        {
                          'branch-asoke': 35,
                          'branch-phromphong': 25,
                          'branch-thonglor': 22,
                          'branch-silom': 0,
                        },
                        'มีสาขาย่อย Order = 0'
                      )
                    }
                    className="taste-btn px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
                  >
                    เซ็ตย่อย = 0
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyOrderScenario(
                        {
                          'branch-asoke': 70,
                          'branch-phromphong': 42,
                          'branch-thonglor': 43,
                          'branch-silom': 41,
                        },
                        'สาขาใหญ่เต็ม 70 Order'
                      )
                    }
                    className="taste-btn px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold"
                  >
                    เซ็ตใหญ่ = 70
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyOrderScenario(
                        {
                          'branch-asoke': 45,
                          'branch-phromphong': 42,
                          'branch-thonglor': 41,
                          'branch-silom': 40,
                        },
                        'สมดุลทุกสาขา (ปลดล็อคทั้งหมด)'
                      )
                    }
                    className="taste-btn px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                  >
                    ปลดล็อคทุกสาขา
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="taste-btn px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    เปิดแผนที่สาขา
                  </button>
                </div>
              </div>

              {/* 4 Branches Interactive Manual Control Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {branches.map((b) => {
                  const ev = branchLockSummary.evaluations[b.id];
                  const isLocked = ev?.isLocked ?? false;
                  const isSelected = b.id === selectedBranchId;
                  const isMain = b.branchType === 'main';
                  const activeOrd = b.activeOrders ?? 0;
                  const maxCap = b.maxOrderCapacity ?? (isMain ? 70 : 60);

                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBranch(b.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors flex flex-col justify-between gap-2 ${
                        isLocked
                          ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                          : isSelected
                          ? 'bg-emerald-50/80 border-[#007A3D]'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isMain
                                ? 'bg-amber-100 text-amber-950'
                                : 'bg-sky-100 text-sky-900'
                            }`}
                          >
                            {isMain ? 'ใหญ่' : 'ย่อย'}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {b.name.replace('สาขาใหญ่ ', '').replace('สาขาย่อย ', '')}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                            isLocked
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>ล็อค</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-2.5 h-2.5" />
                              <span>เปิดรับ</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Manual User Stepper & Direct Order Input */}
                      <div
                        className="flex items-center justify-between gap-1 bg-white/90 rounded-lg p-1 border border-slate-200/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustBranchOrders(b.id, -5)}
                            aria-label={`ลดออเดอร์ ${b.name} 5 ออเดอร์`}
                            className="px-1.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] transition-colors"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustBranchOrders(b.id, -1)}
                            aria-label={`ลดออเดอร์ ${b.name} 1 ออเดอร์`}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                        </div>

                        <div className="flex items-baseline gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={120}
                            aria-label={`จำนวนออเดอร์ ${b.name}`}
                            value={activeOrd}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleSetBranchOrders(b.id, Number.isNaN(val) ? 0 : val);
                            }}
                            className="w-11 text-center font-extrabold text-xs text-slate-900 bg-transparent focus:outline-hidden focus:bg-slate-100 rounded tabular-nums"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold tabular-nums">
                            /{maxCap}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustBranchOrders(b.id, 1)}
                            aria-label={`เพิ่มออเดอร์ ${b.name} 1 ออเดอร์`}
                            className="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustBranchOrders(b.id, 5)}
                            aria-label={`เพิ่มออเดอร์ ${b.name} 5 ออเดอร์`}
                            className="px-1.5 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-[10px] transition-colors"
                          >
                            +5
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate">{ev?.statusBadge}</span>
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSetBranchOrders(b.id, 0)}
                            className="px-1.5 py-0.5 rounded bg-rose-100/80 hover:bg-rose-200 text-rose-800 font-bold"
                          >
                            เซ็ต 0
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetBranchOrders(b.id, isMain ? 70 : 42)}
                            className="px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold"
                          >
                            {isMain ? 'เซ็ต 70' : 'เซ็ต 42'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Switch Button if Selected Branch is Locked */}
              {currentBranchLock?.isLocked && (
                <div className="px-3 py-2 rounded-xl bg-rose-100 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-950">
                  <span className="font-semibold">
                    สาขาที่เลือกถูกล็อคชั่วคราว ({currentBranchLock.statusBadge})
                  </span>
                  <button
                    type="button"
                    onClick={handleSwitchToAvailableBranch}
                    className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold shrink-0"
                  >
                    สลับไปสาขาที่เปิดรับออเดอร์ทันที
                  </button>
                </div>
              )}
            </div>

            {/* Horizontal Scrollable Promotional & Coupon Rail */}
            <PromoShowcase
              claimedCoupons={claimedCoupons}
              activeCouponCode={activeCouponCode}
              onClaimAndApplyCoupon={handleClaimAndApplyCoupon}
              onFilterByPromoCategory={(cat) => {
                if (cat) {
                  setSelectedCategory(cat);
                } else {
                  setActiveView('promotions');
                }
              }}
            />

            {/* Categories, Search & Filters Bar */}
            <CategoryBar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              inStockOnly={inStockOnly}
              setInStockOnly={setInStockOnly}
              dealsOnly={dealsOnly}
              setDealsOnly={setDealsOnly}
              sortBy={sortBy}
              setSortBy={setSortBy}
              totalProductsCount={filteredProducts.length}
            />

            {/* Horizontal Scrollable Product Card Rails */}
            <ProductGrid
              products={filteredProducts}
              allProducts={products}
              branchStock={currentStock}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onOpenProductDetail={(prod) => setSelectedProductForModal(prod)}
              onResetFilters={() => {
                setSelectedCategory('all');
                setSearchQuery('');
                setInStockOnly(false);
                setDealsOnly(false);
                setSortBy('popular');
              }}
            />
          </div>
        )}

        {/* VIEW 2: DEDICATED PROMOTIONAL PRODUCTS MENU */}
        {activeView === 'promotions' && (
          <PromoMenuView
            products={products}
            productsMap={productsMap}
            branchStock={currentStock}
            cart={cart}
            claimedCoupons={claimedCoupons}
            activeCouponCode={activeCouponCode}
            onClaimAndApplyCoupon={handleClaimAndApplyCoupon}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onOpenProductDetail={(prod) => setSelectedProductForModal(prod)}
            onApplyProductPromoOffer={handleApplyProductPromoOffer}
            onBackToShop={() => setActiveView('shop')}
          />
        )}

        {/* VIEW 3: LIVE DELIVERY TRACKING & TIME SLA */}
        {activeView === 'orders' && (
          <OrderHistoryModal
            isOpen={true}
            onClose={() => setActiveView('shop')}
            orders={orders}
            onOpenShop={() => setActiveView('shop')}
            onAdvanceOrderStep={handleAdvanceOrderStep}
            onResetOrderTracking={handleResetOrderTracking}
            isInlineView={true}
          />
        )}

        {/* VIEW 4: REAL-TIME INVENTORY & PRIORITY BRANCH LOCK ENGINE */}
        {activeView === 'inventory' && (
          <InventoryDashboard
            products={products}
            branches={branches}
            branchLockSummary={branchLockSummary}
            selectedBranchId={selectedBranchId}
            onSelectBranch={handleSelectBranch}
            onAdjustBranchOrders={handleAdjustBranchOrders}
            onSetBranchOrders={handleSetBranchOrders}
            onApplyOrderScenario={handleApplyOrderScenario}
            branchStocks={branchStocks}
            stockLogs={stockLogs}
            onAdjustStock={handleAdjustStock}
            onSetStock={handleSetStock}
            onResetAllStocks={handleResetAllStocks}
            onSwitchToShop={() => setActiveView('shop')}
          />
        )}
      </main>

      {/* Product Detail & Promo Decision Modal */}
      <ProductDetailModal
        product={selectedProductForModal}
        isOpen={Boolean(selectedProductForModal)}
        onClose={() => setSelectedProductForModal(null)}
        productsMap={productsMap}
        currentBranch={currentBranch}
        branchStock={currentStock}
        cartQuantity={modalProductCartQty}
        onAddToCart={handleAddToCart}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onApplyProductPromoOffer={handleApplyProductPromoOffer}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Detailed Address, Map & Delivery Schedule Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        currentAddress={currentAddress}
        savedAddresses={savedAddresses}
        branches={branches}
        selectedBranchId={selectedBranchId}
        deliverySchedule={deliverySchedule}
        onUpdateSchedule={(sched) => {
          setDeliverySchedule(sched);
          showToast(`ตั้งเวลาจัดส่งเป็น "${sched.slotLabel}" เรียบร้อย`);
        }}
        onSelectAddress={handleSelectAddress}
        onSaveNewAddress={handleSaveNewAddress}
        onUpdateAddress={handleUpdateAddress}
        onDeleteAddress={handleDeleteAddress}
        onSetDefaultAddress={handleSetDefaultAddress}
        onSelectBranch={handleSelectBranch}
        onAdjustBranchOrders={handleAdjustBranchOrders}
        onSetBranchOrders={handleSetBranchOrders}
        onApplyOrderScenario={handleApplyOrderScenario}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        productsMap={productsMap}
        branchStock={currentStock}
        currentBranch={currentBranch}
        currentAddress={currentAddress}
        deliverySchedule={deliverySchedule}
        activeCouponCode={activeCouponCode}
        couponDiscount={couponDiscount}
        allMemberPoints={allMemberPoints}
        mStampCount={mStampCount}
        onUpdateQuantity={handleUpdateCartQuantity}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
        onOpenAddressModal={() => {
          setIsCartDrawerOpen(false);
          setIsAddressModalOpen(true);
        }}
      />

      {/* Audit Comparison Modal */}
      <AuditComparisonModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800">7-DELIVERY SMART QUEUE & PROMO</span>
            <span>·</span>
            <span>ระบบล็อคสาขาอัตโนมัติตามปริมาณ Order</span>
            <span>·</span>
            <span>แบนเนอร์โฆษณาสไลด์กดใส่ตะกร้าได้ทันที</span>
            <span>·</span>
            <span>เมนูสินค้าโปรโมชั่น & โปรรายสินค้า</span>
          </div>
          <p className="text-[11px] text-slate-400">
            ออกแบบเพื่อกระจายออเดอร์อย่างสมดุล ไม่ให้สาขาใดมีออเดอร์เป็น 0 พร้อมช่วยลูกค้าตัดสินใจซื้อตามโปรโมชั่นได้คุ้มค่าที่สุด
          </p>
        </div>
      </footer>
    </div>
  );
}
