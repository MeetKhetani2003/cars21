/**
 * Automotive Valuation Engine for Cars21
 * Realistic ex-showroom baselines, Indian auto market depreciation schedules,
 * km degradation, ownership multipliers, condition scoring, and empirical DB matching.
 */

export interface ValuationInput {
  make?: string;
  model?: string;
  year?: number;
  variant?: string;
  km?: number;
  fuel?: string;
  transmission?: string;
  owners?: number;
  condition?: string;
  city?: string;
  registration?: string;
}

export interface ValuationResult {
  fairMarketValue: number;
  instantCashPrice: number;
  privateSalePrice: number;
  dealerShowroomPrice: number;
  exShowroomEstimated: number;
  marketRange: {
    low: number;
    high: number;
  };
  confidenceScore: number;
  demandIndex: 'High' | 'Very High' | 'Moderate' | 'Steady';
  rtoState?: string;
  rtoCity?: string;
  breakdown: {
    baseExShowroom: number;
    ageDepreciationPercent: number;
    ageDepreciationAmount: number;
    kmAdjustmentAmount: number;
    ownershipAdjustmentAmount: number;
    conditionAdjustmentAmount: number;
    transmissionBonus: number;
    fuelBonus: number;
  };
  futureForecast: {
    month6: number;
    month12: number;
    month24: number;
  };
  matchingDbListingsCount?: number;
}

// Model base ex-showroom benchmark prices in INR (approx 2024-2025 showroom reference)
const MODEL_BENCHMARK_PRICES: Record<string, number> = {
  // Maruti Suzuki
  'alto k10': 480000,
  'alto': 420000,
  's-presso': 510000,
  'celerio': 620000,
  'wagon r': 680000,
  'ignis': 710000,
  'swift': 820000,
  'baleno': 890000,
  'dzire': 860000,
  'fronx': 1020000,
  'brezza': 1180000,
  'ertiga': 1140000,
  'xl6': 1360000,
  'jimny': 1420000,
  'grand vitara': 1580000,
  'ciaz': 1120000,
  'invicto': 2850000,
  'eeco': 560000,
  'evx': 2100000,

  // Hyundai
  'grand i10 nios': 720000,
  'grand i10': 660000,
  'aura': 820000,
  'i20': 940000,
  'i20 n line': 1160000,
  'exter': 880000,
  'venue': 1120000,
  'venue n line': 1360000,
  'verna': 1460000,
  'creta': 1580000,
  'creta n line': 1920000,
  'creta ev': 2150000,
  'alcazar': 1920000,
  'tucson': 3250000,
  'ioniq 5': 4600000,
  'kona electric': 2400000,

  // Tata
  'tiago': 640000,
  'tiago ev': 980000,
  'tigor': 780000,
  'tigor ev': 1250000,
  'altroz': 880000,
  'altroz racer': 1120000,
  'punch': 820000,
  'punch ev': 1280000,
  'nexon': 1220000,
  'nexon ev': 1680000,
  'curvv': 1450000,
  'curvv ev': 1950000,
  'harrier': 2150000,
  'safari': 2380000,
  'sierra ev': 2400000,
  'harrier ev': 2550000,

  // Mahindra
  'bolero': 1050000,
  'bolero neo': 1120000,
  'bolero neo plus': 1340000,
  'xuv300': 1150000,
  'xuv 3xo': 1180000,
  'xuv400 ev': 1750000,
  'thar': 1620000,
  'thar roxx': 1880000,
  'scorpio classic': 1650000,
  'scorpio-n': 1980000,
  'xuv700': 2280000,
  'be 6e': 2450000,
  'xev 9e': 2850000,

  // Toyota
  'glanza': 890000,
  'urban cruiser taisor': 1050000,
  'rumion': 1220000,
  'urban cruiser hyryder': 1620000,
  'innova crysta': 2350000,
  'innova hycross': 2680000,
  'fortuner': 3950000,
  'fortuner legender': 4680000,
  'hilux': 3450000,
  'camry': 4800000,
  'vellfire': 12800000,
  'land cruiser 300': 21500000,

  // Honda
  'amaze': 880000,
  'city': 1420000,
  'city e:hev': 2050000,
  'elevate': 1450000,
  'jazz': 860000,
  'wr-v': 1020000,

  // Kia
  'sonet': 1120000,
  'seltos': 1560000,
  'carens': 1380000,
  'carnival': 3650000,
  'ev6': 6450000,
  'ev9': 13000000,

  // Volkswagen & Skoda
  'polo': 850000,
  'vento': 1150000,
  'virtus': 1520000,
  'taigun': 1540000,
  'tiguan': 3850000,
  'slavia': 1520000,
  'kushaq': 1540000,
  'kylaq': 1080000,
  'kodiaq': 4200000,
  'superb': 3800000,
  'octavia': 3050000,

  // MG
  'comet ev': 820000,
  'astor': 1350000,
  'hector': 1780000,
  'hector plus': 2050000,
  'zs ev': 2250000,
  'windsor ev': 1650000,
  'gloster': 4150000,

  // Luxury Brands
  'bmw 3 series': 5400000,
  'bmw 5 series': 6800000,
  'bmw x1': 5100000,
  'bmw x3': 7100000,
  'bmw x5': 9800000,
  'mercedes-benz c-class': 6200000,
  'mercedes-benz e-class': 7600000,
  'mercedes-benz gla': 5200000,
  'mercedes-benz glc': 7600000,
  'audi a4': 5200000,
  'audi a6': 6500000,
  'audi q3': 5100000,
  'audi q5': 6900000,
  'jeep compass': 2450000,
  'jeep meridian': 3450000,
  'volvo xc40 recharge': 5800000,
  'volvo xc60': 7200000,
};

// State code mapping from Indian vehicle registration prefix
const STATE_RTO_MAP: Record<string, { state: string; defaultCity: string }> = {
  GJ: { state: 'Gujarat', defaultCity: 'Junagadh' },
  KA: { state: 'Karnataka', defaultCity: 'Bengaluru' },
  MH: { state: 'Maharashtra', defaultCity: 'Mumbai' },
  DL: { state: 'Delhi NCR', defaultCity: 'Delhi NCR' },
  TS: { state: 'Telangana', defaultCity: 'Hyderabad' },
  TN: { state: 'Tamil Nadu', defaultCity: 'Chennai' },
  HR: { state: 'Haryana', defaultCity: 'Gurugram' },
  UP: { state: 'Uttar Pradesh', defaultCity: 'Noida' },
  RJ: { state: 'Rajasthan', defaultCity: 'Jaipur' },
  MP: { state: 'Madhya Pradesh', defaultCity: 'Indore' },
  KL: { state: 'Kerala', defaultCity: 'Kochi' },
  WB: { state: 'West Bengal', defaultCity: 'Kolkata' },
  AP: { state: 'Andhra Pradesh', defaultCity: 'Visakhapatnam' },
  PB: { state: 'Punjab', defaultCity: 'Chandigarh' },
};

export function parseRegistration(regStr?: string): { state?: string; defaultCity?: string; code?: string } {
  if (!regStr) return {};
  const cleaned = regStr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length < 2) return {};
  const code = cleaned.slice(0, 2);
  const match = STATE_RTO_MAP[code];
  if (match) {
    return { state: match.state, defaultCity: match.defaultCity, code };
  }
  return { code };
}

export function estimateCarValuation(input: ValuationInput, liveMarketAverage?: number): ValuationResult {
  const currentYear = 2026;
  const year = Number(input.year) || 2023;
  const km = Math.max(0, Number(input.km ?? 32000));
  const owners = Math.max(1, Math.min(10, Number(input.owners || 1)));
  const condition = input.condition || 'Good';
  const fuel = (input.fuel || 'Petrol').toLowerCase();
  const transmission = (input.transmission || 'Manual').toLowerCase();
  const makeClean = (input.make || '').toLowerCase().trim();
  const modelClean = (input.model || '').toLowerCase().trim();

  // 1. Determine baseline benchmark ex-showroom price
  let benchmarkPrice = 1150000; // default medium car fallback

  // Exact lookup: "model" or "make model"
  if (MODEL_BENCHMARK_PRICES[modelClean]) {
    benchmarkPrice = MODEL_BENCHMARK_PRICES[modelClean];
  } else if (MODEL_BENCHMARK_PRICES[`${makeClean} ${modelClean}`]) {
    benchmarkPrice = MODEL_BENCHMARK_PRICES[`${makeClean} ${modelClean}`];
  } else {
    // Fuzzy matching against benchmark keys
    const matchKey = Object.keys(MODEL_BENCHMARK_PRICES).find(k =>
      modelClean.includes(k) || k.includes(modelClean)
    );
    if (matchKey) {
      benchmarkPrice = MODEL_BENCHMARK_PRICES[matchKey];
    } else {
      // Segment generic heuristic
      if (makeClean.includes('bmw') || makeClean.includes('mercedes') || makeClean.includes('audi') || makeClean.includes('volvo') || makeClean.includes('jaguar')) {
        benchmarkPrice = 5800000;
      } else if (modelClean.includes('suv') || modelClean.includes('harrier') || modelClean.includes('safari') || modelClean.includes('fortuner')) {
        benchmarkPrice = 2200000;
      } else if (modelClean.includes('sedan') || modelClean.includes('city') || modelClean.includes('verna')) {
        benchmarkPrice = 1400000;
      } else {
        benchmarkPrice = 950000;
      }
    }
  }

  // 2. Age-based depreciation schedule (Indian standard market retention curve)
  const age = Math.max(0, currentYear - year);
  let retentionFactor = 0.92; // 2026 new car floor

  if (age === 0) retentionFactor = 0.92;
  else if (age === 1) retentionFactor = 0.84;
  else if (age === 2) retentionFactor = 0.74;
  else if (age === 3) retentionFactor = 0.65;
  else if (age === 4) retentionFactor = 0.57;
  else if (age === 5) retentionFactor = 0.50;
  else if (age === 6) retentionFactor = 0.44;
  else if (age === 7) retentionFactor = 0.38;
  else if (age === 8) retentionFactor = 0.33;
  else if (age >= 9) retentionFactor = Math.max(0.20, 0.30 - (age - 9) * 0.025);

  const baseDepreciatedValue = benchmarkPrice * retentionFactor;
  const ageDepreciationAmount = benchmarkPrice - baseDepreciatedValue;
  const ageDepreciationPercent = Math.round((1 - retentionFactor) * 100);

  // 3. Kilometres driven adjustment
  // Standard benchmark: ~12,000 km per year of vehicle age
  const benchmarkKm = Math.max(8000, age * 12000);
  const kmDifference = km - benchmarkKm;
  let kmAdjustmentPercent = 0;

  if (kmDifference < 0) {
    // Low mileage bonus: +1.5% per 10,000 km below average (max +7.5%)
    kmAdjustmentPercent = Math.min(0.075, (Math.abs(kmDifference) / 10000) * 0.015);
  } else {
    // High mileage deduction: -2.5% per 10,000 km above average (max -25%)
    kmAdjustmentPercent = -Math.min(0.25, (kmDifference / 10000) * 0.025);
  }
  const kmAdjustmentAmount = Math.round(baseDepreciatedValue * kmAdjustmentPercent);

  // 4. Ownership impact (1st: 1.0, 2nd: -9%, 3rd: -18%, 4th+: -26%)
  let ownershipPercent = 0;
  if (owners === 2) ownershipPercent = -0.09;
  else if (owners === 3) ownershipPercent = -0.18;
  else if (owners >= 4) ownershipPercent = -0.26;
  const ownershipAdjustmentAmount = Math.round(baseDepreciatedValue * ownershipPercent);

  // 5. Condition multiplier
  let conditionPercent = 0;
  if (condition === 'Excellent') conditionPercent = 0.06;
  else if (condition === 'Very Good') conditionPercent = 0.02;
  else if (condition === 'Good') conditionPercent = 0.00;
  else if (condition === 'Fair') conditionPercent = -0.10;
  else if (condition === 'Poor') conditionPercent = -0.22;
  const conditionAdjustmentAmount = Math.round(baseDepreciatedValue * conditionPercent);

  // 6. Transmission impact
  let transmissionBonus = 0;
  if (transmission.includes('auto') || transmission === 'automatic' || transmission === 'at' || transmission === 'cvt' || transmission === 'dct') {
    transmissionBonus = Math.min(65000, Math.round(benchmarkPrice * 0.045));
  }

  // 7. Fuel multiplier
  let fuelBonus = 0;
  if (fuel.includes('hybrid') || fuel.includes('electric') || fuel === 'ev') {
    fuelBonus = Math.min(50000, Math.round(benchmarkPrice * 0.03));
  } else if (fuel.includes('diesel') && (input.city || '').toLowerCase().includes('delhi')) {
    // 10-year NGT rule in NCR
    fuelBonus = -Math.min(75000, Math.round(baseDepreciatedValue * 0.08));
  }

  // Compute calculated fair market value
  let calculatedMid = baseDepreciatedValue + kmAdjustmentAmount + ownershipAdjustmentAmount + conditionAdjustmentAmount + transmissionBonus + fuelBonus;

  // If live empirical DB average is provided, blend it with 40% weight
  if (liveMarketAverage && liveMarketAverage > 100000) {
    calculatedMid = Math.round(calculatedMid * 0.6 + liveMarketAverage * 0.4);
  }

  // Round to nearest 5,000 INR
  const fairMarketValue = Math.max(150000, Math.round(calculatedMid / 5000) * 5000);

  // Multi-tier prices
  // 1. Instant Cash Price (Cars21 Direct Dealer Instant Buyout): ~94% of FMV
  const instantCashPrice = Math.round((fairMarketValue * 0.94) / 5000) * 5000;
  // 2. Private Direct Buyer expected price: ~105% of FMV
  const privateSalePrice = Math.round((fairMarketValue * 1.05) / 5000) * 5000;
  // 3. Dealer Showroom / Certified Retail purchase price: ~110% of FMV
  const dealerShowroomPrice = Math.round((fairMarketValue * 1.10) / 5000) * 5000;

  // Market Range
  const lowRange = Math.round((fairMarketValue * 0.95) / 5000) * 5000;
  const highRange = Math.round((fairMarketValue * 1.05) / 5000) * 5000;

  // Future 6, 12, 24 months depreciation projection
  const futureMonth6 = Math.round((fairMarketValue * 0.95) / 5000) * 5000;
  const futureMonth12 = Math.round((fairMarketValue * 0.89) / 5000) * 5000;
  const futureMonth24 = Math.round((fairMarketValue * 0.79) / 5000) * 5000;

  // Registration parsing
  const parsedReg = parseRegistration(input.registration);

  // Confidence & Demand Index
  let confidenceScore = 95;
  if (liveMarketAverage) confidenceScore = 98;
  if (age > 8) confidenceScore -= 5;
  if (km > 120000) confidenceScore -= 4;

  let demandIndex: 'High' | 'Very High' | 'Moderate' | 'Steady' = 'High';
  if (modelClean.includes('creta') || modelClean.includes('swift') || modelClean.includes('brezza') || modelClean.includes('nexon') || modelClean.includes('thar') || modelClean.includes('fortuner')) {
    demandIndex = 'Very High';
  } else if (age > 8 || owners > 2) {
    demandIndex = 'Moderate';
  }

  return {
    fairMarketValue,
    instantCashPrice,
    privateSalePrice,
    dealerShowroomPrice,
    exShowroomEstimated: benchmarkPrice,
    marketRange: {
      low: lowRange,
      high: highRange
    },
    confidenceScore,
    demandIndex,
    rtoState: parsedReg.state,
    rtoCity: parsedReg.defaultCity,
    breakdown: {
      baseExShowroom: benchmarkPrice,
      ageDepreciationPercent,
      ageDepreciationAmount: Math.round(ageDepreciationAmount),
      kmAdjustmentAmount,
      ownershipAdjustmentAmount,
      conditionAdjustmentAmount,
      transmissionBonus,
      fuelBonus
    },
    futureForecast: {
      month6: futureMonth6,
      month12: futureMonth12,
      month24: futureMonth24
    }
  };
}

