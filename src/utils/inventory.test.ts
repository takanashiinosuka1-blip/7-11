import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistance,
  findNearestBranch,
  checkStockStatus,
  deductStock,
  calculateOrderTotals,
  validateDeliveryAddress,
  calculateDeliveryTimeEstimate,
  evaluateBranchLockStatus,
  findNearestAvailableBranch,
  type Branch,
  type BranchStock,
  type Product,
} from './inventory.ts';

test('calculateDistance accurately measures distance between GPS coordinates', () => {
  // Asoke intersection (13.7372, 100.5604) to Phrom Phong (13.7306, 100.5698)
  const dist = calculateDistance(13.7372, 100.5604, 13.7306, 100.5698);
  assert.ok(dist > 0.8 && dist < 1.5, `Distance ${dist} should be around 1.2 km`);
});

test('findNearestBranch correctly picks the nearest 7-Eleven store', () => {
  const branches: Branch[] = [
    {
      id: 'b1',
      name: 'สาขา อโศก ทาวเวอร์',
      code: '1042',
      address: 'สุขุมวิท 21',
      lat: 13.742,
      lng: 100.562,
      phone: '02-123-4567',
      open24Hours: true,
      deliveryRadiusKm: 3.0,
      estimatedMinutes: 15,
    },
    {
      id: 'b2',
      name: 'สาขา สยามพารากอน',
      code: '0512',
      address: 'พระราม 1',
      lat: 13.746,
      lng: 100.534,
      phone: '02-765-4321',
      open24Hours: true,
      deliveryRadiusKm: 3.0,
      estimatedMinutes: 25,
    },
  ];

  // User coordinate right near Asoke Tower
  const nearest = findNearestBranch(branches, 13.7425, 100.5622);
  assert.equal(nearest.branch.id, 'b1');
  assert.ok(nearest.distanceKm < 0.2);
});

test('checkStockStatus labels out of stock, low stock and in stock properly', () => {
  const zero = checkStockStatus(0);
  assert.equal(zero.status, 'OUT_OF_STOCK');
  assert.equal(zero.label, 'สินค้าหมด');

  const low = checkStockStatus(2);
  assert.equal(low.status, 'LOW_STOCK');
  assert.equal(low.label, 'เหลือเพียง 2 ชิ้น');

  const inStock = checkStockStatus(15);
  assert.equal(inStock.status, 'IN_STOCK');
  assert.equal(inStock.label, 'มีสินค้า (15 ชิ้น)');
});

test('deductStock decrements inventory correctly and prevents overselling', () => {
  const stock: BranchStock = {
    branchId: 'b1',
    stock: {
      toastie: 5,
      matcha: 2,
    },
  };

  const { updatedStock, deductions } = deductStock(stock, [
    { productId: 'toastie', quantity: 2 },
    { productId: 'matcha', quantity: 1 },
  ]);

  assert.equal(updatedStock.stock['toastie'], 3);
  assert.equal(updatedStock.stock['matcha'], 1);
  assert.equal(deductions.length, 2);

  // Attempting to deduct more than available throws error
  assert.throws(
    () => {
      deductStock(updatedStock, [{ productId: 'matcha', quantity: 3 }]);
    },
    { message: /สินค้าไม่เพียงพอ/ }
  );
});

test('calculateOrderTotals applies free delivery over 100 THB and tallies M-Stamps', () => {
  const products: Record<string, Product> = {
    p1: {
      id: 'p1',
      name: 'แซนวิชแฮมชีส',
      nameEn: 'Ham & Cheese Toastie',
      category: 'toasties',
      price: 35,
      image: '',
      description: '',
      mStampEarned: 3,
    },
    p2: {
      id: 'p2',
      name: 'ข้าวกะเพราหมูสับไข่ดาว',
      nameEn: 'Pad Kaprao Bento',
      category: 'ready_meals',
      price: 55,
      image: '',
      description: '',
      mStampEarned: 6,
    },
  };

  // Subtotal 35 + 55 = 90 (< 100) -> 20 THB delivery fee
  const result1 = calculateOrderTotals(
    [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 },
    ],
    products
  );
  assert.equal(result1.subtotal, 90);
  assert.equal(result1.deliveryFee, 20);
  assert.equal(result1.total, 110);
  assert.equal(result1.earnedMStamps, 9);

  // Subtotal 35*2 + 55 = 125 (>= 100) -> 0 THB delivery fee
  const result2 = calculateOrderTotals(
    [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ],
    products
  );
  assert.equal(result2.subtotal, 125);
  assert.equal(result2.deliveryFee, 0);
  assert.equal(result2.total, 125);
});

test('validateDeliveryAddress validates required fields for delivery', () => {
  const invalid = validateDeliveryAddress({
    recipientName: '',
    phone: '123',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.recipientName);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.houseNumber);

  const valid = validateDeliveryAddress({
    recipientName: 'สมชาย ใจดี',
    phone: '0812345678',
    houseNumber: '128/45 คอนโดเอสเกต ชั้น 12 ห้อง 1204',
    subDistrict: 'คลองเตยเหนือ',
    district: 'วัฒนา',
  });
  assert.equal(valid.isValid, true);
});

test('calculateDeliveryTimeEstimate computes prep time, travel time, and ETA window accurately', () => {
  const baseDate = new Date('2026-11-08T14:00:00');
  const estimate = calculateDeliveryTimeEstimate(2.0, 3, true, baseDate);
  // prep: 4 + 1 + 3 = 8 mins, travel: round(2.0 * 4.5) = 9 mins -> total 17 mins
  assert.equal(estimate.prepMinutes, 8);
  assert.equal(estimate.travelMinutes, 9);
  assert.equal(estimate.totalMinutes, 17);
  assert.equal(estimate.etaWindowText, '14:15 - 14:22 น.');
});

test('evaluateBranchLockStatus enforces priority lock and unlock rules for main and sub branches', () => {
  const createBranches = (mainOrders: number, sub1: number, sub2: number, sub3: number): Branch[] => [
    {
      id: 'main-1',
      name: 'สาขาใหญ่ อโศก',
      code: '1042',
      address: '',
      lat: 13.7425,
      lng: 100.5622,
      phone: '',
      open24Hours: true,
      deliveryRadiusKm: 3.5,
      estimatedMinutes: 15,
      branchType: 'main',
      activeOrders: mainOrders,
      maxOrderCapacity: 70,
    },
    {
      id: 'sub-1',
      name: 'สาขาย่อย พร้อมพงษ์',
      code: '0871',
      address: '',
      lat: 13.7312,
      lng: 100.5705,
      phone: '',
      open24Hours: true,
      deliveryRadiusKm: 3.0,
      estimatedMinutes: 20,
      branchType: 'sub',
      activeOrders: sub1,
      maxOrderCapacity: 50,
    },
    {
      id: 'sub-2',
      name: 'สาขาย่อย ทองหล่อ',
      code: '1428',
      address: '',
      lat: 13.7275,
      lng: 100.581,
      phone: '',
      open24Hours: true,
      deliveryRadiusKm: 3.5,
      estimatedMinutes: 22,
      branchType: 'sub',
      activeOrders: sub2,
      maxOrderCapacity: 50,
    },
    {
      id: 'sub-3',
      name: 'สาขาย่อย สีลม',
      code: '0215',
      address: '',
      lat: 13.7278,
      lng: 100.5312,
      phone: '',
      open24Hours: true,
      deliveryRadiusKm: 4.0,
      estimatedMinutes: 25,
      branchType: 'sub',
      activeOrders: sub3,
      maxOrderCapacity: 50,
    },
  ];

  // Case 1: Sub-branch 3 has 0 orders -> Main is locked, Sub-1 & Sub-2 are locked, only Sub-3 is unlocked
  const zeroCase = evaluateBranchLockStatus(createBranches(35, 25, 20, 0));
  assert.equal(zeroCase.evaluations['main-1'].isLocked, true);
  assert.equal(zeroCase.evaluations['sub-1'].isLocked, true);
  assert.equal(zeroCase.evaluations['sub-2'].isLocked, true);
  assert.equal(zeroCase.evaluations['sub-3'].isLocked, false);

  // Also verify findNearestAvailableBranch redirects from locked main-1 to unlocked sub-3
  const routed = findNearestAvailableBranch(createBranches(35, 25, 20, 0), 13.7425, 100.5622);
  assert.equal(routed.branch.id, 'sub-3');
  assert.equal(routed.wasRedirected, true);

  // Case 2: Sub-branches are < 40 and not yet high enough average (e.g., 20, 22, 19) -> Sub-branches unlocked (since balanced & none is 0), Main remains locked (< 40)
  const subBalancedLow = evaluateBranchLockStatus(createBranches(30, 20, 22, 19));
  assert.equal(subBalancedLow.evaluations['main-1'].isLocked, true);
  assert.equal(subBalancedLow.evaluations['sub-1'].isLocked, false);
  assert.equal(subBalancedLow.evaluations['sub-2'].isLocked, false);
  assert.equal(subBalancedLow.evaluations['sub-3'].isLocked, false);

  // Case 3: Sub-branches all >= 40 orders -> Main unlocks!
  const allAbove40 = evaluateBranchLockStatus(createBranches(45, 42, 41, 44));
  assert.equal(allAbove40.evaluations['main-1'].isLocked, false);

  // Case 4: Main branch >= 70 orders -> Main locks even if sub-branches >= 40!
  const mainOver70 = evaluateBranchLockStatus(createBranches(70, 42, 43, 41));
  assert.equal(mainOver70.evaluations['main-1'].isLocked, true);

  // Case 5: Sub-branch overloaded (>= 50) -> Main unlocks to help!
  const subOverloaded = evaluateBranchLockStatus(createBranches(35, 52, 22, 20));
  assert.equal(subOverloaded.evaluations['main-1'].isLocked, false);
  assert.equal(subOverloaded.evaluations['sub-1'].isLocked, true); // overloaded sub is locked
});
