// Technical Analysis Mock Data
// Generates realistic OHLCV data with technical indicators

export interface OHLCVItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  sma20: (number | null)[];
  sma50: (number | null)[];
  ema12: (number | null)[];
  ema26: (number | null)[];
  bollingerUpper: (number | null)[];
  bollingerMiddle: (number | null)[];
  bollingerLower: (number | null)[];
  rsi: (number | null)[];
  macdLine: (number | null)[];
  macdSignal: (number | null)[];
  macdHistogram: (number | null)[];
  stochK: (number | null)[];
  stochD: (number | null)[];
  atr: (number | null)[];
  obv: (number | null)[];
  williamsR: (number | null)[];
  cci: (number | null)[];
  adx: (number | null)[];
  ichimokuTenkan: (number | null)[];
  ichimokuKijun: (number | null)[];
  ichimokuSenkouA: (number | null)[];
  ichimokuSenkouB: (number | null)[];
}

export interface TechnicalSignal {
  indicator: string;
  value: string;
  signal: 'Mua' | 'Bán' | 'Trung lập';
  strength: 'Mạnh' | 'Trung bình' | 'Yếu';
}

export interface AnalysisSummaryData {
  overallSignal: 'Mua mạnh' | 'Mua' | 'Trung lập' | 'Bán' | 'Bán mạnh';
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  movingAverages: TechnicalSignal[];
  oscillators: TechnicalSignal[];
  pivotPoints: {
    type: string;
    s3: number;
    s2: number;
    s1: number;
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
  }[];
}

export interface StockAnalysisData {
  ticker: string;
  companyName: string;
  exchange: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  ohlcv: OHLCVItem[];
  indicators: IndicatorData;
  signals: TechnicalSignal[];
  summary: AnalysisSummaryData;
}

// ===== Helper Functions =====

function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(Math.round((sum / period) * 100) / 100);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(Math.round((sum / period) * 100) / 100);
    } else {
      const prev = result[i - 1]!;
      const ema = (data[i] - prev) * multiplier + prev;
      result.push(Math.round(ema * 100) / 100);
    }
  }
  return result;
}

function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    } else {
      const prevRSI = result[i - 1]!;
      const prevAvgGain = (100 / (100 - prevRSI) - 1) > 0
        ? gains[gains.length - 2] : 0;
      const currentGain = gains[gains.length - 1];
      const currentLoss = losses[losses.length - 1];
      const avgGain = (prevAvgGain * (period - 1) + currentGain) / period;
      const avgLoss = ((prevAvgGain > 0 ? prevAvgGain : losses.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period) * (period - 1) + currentLoss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    }
  }
  return result;
}

function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2) {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i]!;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(Math.round((mean + stdDev * std) * 100) / 100);
      lower.push(Math.round((mean - stdDev * std) * 100) / 100);
    }
  }
  return { upper, middle, lower };
}

function calculateMACD(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (ema12[i] === null || ema26[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(Math.round((ema12[i]! - ema26[i]!) * 100) / 100);
    }
  }

  const validMACD = macdLine.filter((v) => v !== null) as number[];
  const signalRaw = calculateEMA(validMACD, 9);
  const macdSignal: (number | null)[] = [];
  const macdHistogram: (number | null)[] = [];
  let signalIdx = 0;

  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] === null) {
      macdSignal.push(null);
      macdHistogram.push(null);
    } else {
      const sig = signalRaw[signalIdx] ?? null;
      macdSignal.push(sig);
      macdHistogram.push(sig !== null ? Math.round((macdLine[i]! - sig) * 100) / 100 : null);
      signalIdx++;
    }
  }

  return { macdLine, macdSignal, macdHistogram };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3) {
  const stochK: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      stochK.push(null);
    } else {
      const highSlice = highs.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);
      const k = highestHigh === lowestLow ? 50 : ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      stochK.push(Math.round(k * 100) / 100);
    }
  }

  const validK = stochK.filter((v) => v !== null) as number[];
  const dRaw = calculateSMA(validK, dPeriod);
  const stochD: (number | null)[] = [];
  let dIdx = 0;

  for (let i = 0; i < closes.length; i++) {
    if (stochK[i] === null) {
      stochD.push(null);
    } else {
      stochD.push(dRaw[dIdx] ?? null);
      dIdx++;
    }
  }

  return { stochK, stochD };
}

// ===== Generate OHLCV Data =====

function generateOHLCV(ticker: string, days: number = 365): OHLCVItem[] {
  const data: OHLCVItem[] = [];
  const baseDate = new Date('2025-02-18');
  
  const seedMap: Record<string, { basePrice: number; volatility: number; baseVol: number }> = {
    VIC: { basePrice: 42000, volatility: 0.025, baseVol: 5000000 },
    VNM: { basePrice: 72000, volatility: 0.018, baseVol: 3000000 },
    VHM: { basePrice: 38000, volatility: 0.028, baseVol: 8000000 },
    HPG: { basePrice: 25000, volatility: 0.03, baseVol: 15000000 },
    FPT: { basePrice: 135000, volatility: 0.022, baseVol: 4000000 },
    MSN: { basePrice: 67000, volatility: 0.02, baseVol: 2500000 },
    MWG: { basePrice: 55000, volatility: 0.025, baseVol: 3500000 },
    TCB: { basePrice: 24000, volatility: 0.022, baseVol: 7000000 },
    VCB: { basePrice: 88000, volatility: 0.015, baseVol: 3000000 },
    SSI: { basePrice: 28000, volatility: 0.03, baseVol: 6000000 },
  };

  const seed = seedMap[ticker.toUpperCase()] || { basePrice: 50000, volatility: 0.025, baseVol: 4000000 };
  let price = seed.basePrice;

  // Simple seeded random
  let rng = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const random = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  for (let i = days; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = (random() - 0.48) * seed.volatility * price;
    const open = Math.round(price / 100) * 100;
    price = price + change;
    price = Math.max(price * 0.3, price); // prevent negative
    const close = Math.round(price / 100) * 100;
    const high = Math.round((Math.max(open, close) + random() * seed.volatility * price * 0.5) / 100) * 100;
    const low = Math.round((Math.min(open, close) - random() * seed.volatility * price * 0.5) / 100) * 100;
    const volume = Math.round(seed.baseVol * (0.5 + random() * 1.5));

    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high: Math.max(high, Math.max(open, close)),
      low: Math.min(low, Math.min(open, close)),
      close,
      volume,
    });
  }

  return data;
}

// ===== Calculate All Indicators =====

function calculateIndicators(ohlcv: OHLCVItem[]): IndicatorData {
  const closes = ohlcv.map((d) => d.close);
  const highs = ohlcv.map((d) => d.high);
  const lows = ohlcv.map((d) => d.low);
  const volumes = ohlcv.map((d) => d.volume);

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const bollinger = calculateBollingerBands(closes, 20, 2);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const stoch = calculateStochastic(highs, lows, closes, 14, 3);

  // ATR (simplified)
  const atr: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 14) {
      atr.push(null);
    } else {
      const slice = ohlcv.slice(i - 13, i + 1);
      const trValues = slice.map((d, j) => {
        if (j === 0) return d.high - d.low;
        const prev = slice[j - 1];
        return Math.max(d.high - d.low, Math.abs(d.high - prev.close), Math.abs(d.low - prev.close));
      });
      atr.push(Math.round((trValues.reduce((a, b) => a + b, 0) / 14) * 100) / 100);
    }
  }

  // OBV
  const obv: (number | null)[] = [0];
  for (let i = 1; i < ohlcv.length; i++) {
    const prev = obv[i - 1]!;
    if (closes[i] > closes[i - 1]) obv.push(prev + volumes[i]);
    else if (closes[i] < closes[i - 1]) obv.push(prev - volumes[i]);
    else obv.push(prev);
  }

  // Williams %R
  const williamsR: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 13) {
      williamsR.push(null);
    } else {
      const hSlice = highs.slice(i - 13, i + 1);
      const lSlice = lows.slice(i - 13, i + 1);
      const hh = Math.max(...hSlice);
      const ll = Math.min(...lSlice);
      const wr = hh === ll ? -50 : ((hh - closes[i]) / (hh - ll)) * -100;
      williamsR.push(Math.round(wr * 100) / 100);
    }
  }

  // CCI (simplified)
  const cci: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 19) {
      cci.push(null);
    } else {
      const tpSlice: number[] = [];
      for (let j = i - 19; j <= i; j++) {
        tpSlice.push((highs[j] + lows[j] + closes[j]) / 3);
      }
      const mean = tpSlice.reduce((a, b) => a + b, 0) / 20;
      const meanDev = tpSlice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / 20;
      const tp = (highs[i] + lows[i] + closes[i]) / 3;
      const cciVal = meanDev === 0 ? 0 : (tp - mean) / (0.015 * meanDev);
      cci.push(Math.round(cciVal * 100) / 100);
    }
  }

  // ADX (simplified)
  const adx: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 28) {
      adx.push(null);
    } else {
      // Simplified ADX calculation
      const slice = ohlcv.slice(i - 27, i + 1);
      let sumDX = 0;
      for (let j = 1; j < slice.length; j++) {
        const plusDM = slice[j].high - slice[j - 1].high;
        const minusDM = slice[j - 1].low - slice[j].low;
        const tr = Math.max(
          slice[j].high - slice[j].low,
          Math.abs(slice[j].high - slice[j - 1].close),
          Math.abs(slice[j].low - slice[j - 1].close)
        );
        const di = tr === 0 ? 0 : Math.abs(plusDM - minusDM) / tr * 100;
        sumDX += di;
      }
      adx.push(Math.round((sumDX / 27) * 100) / 100);
    }
  }

  // Ichimoku (simplified)
  const ichimokuTenkan: (number | null)[] = [];
  const ichimokuKijun: (number | null)[] = [];
  const ichimokuSenkouA: (number | null)[] = [];
  const ichimokuSenkouB: (number | null)[] = [];
  for (let i = 0; i < ohlcv.length; i++) {
    if (i < 8) {
      ichimokuTenkan.push(null);
    } else {
      const hSlice = highs.slice(i - 8, i + 1);
      const lSlice = lows.slice(i - 8, i + 1);
      ichimokuTenkan.push(Math.round(((Math.max(...hSlice) + Math.min(...lSlice)) / 2) * 100) / 100);
    }
    if (i < 25) {
      ichimokuKijun.push(null);
      ichimokuSenkouA.push(null);
    } else {
      const hSlice = highs.slice(i - 25, i + 1);
      const lSlice = lows.slice(i - 25, i + 1);
      ichimokuKijun.push(Math.round(((Math.max(...hSlice) + Math.min(...lSlice)) / 2) * 100) / 100);
      if (ichimokuTenkan[i] !== null) {
        ichimokuSenkouA.push(Math.round(((ichimokuTenkan[i]! + ichimokuKijun[i]!) / 2) * 100) / 100);
      } else {
        ichimokuSenkouA.push(null);
      }
    }
    if (i < 51) {
      ichimokuSenkouB.push(null);
    } else {
      const hSlice = highs.slice(i - 51, i + 1);
      const lSlice = lows.slice(i - 51, i + 1);
      ichimokuSenkouB.push(Math.round(((Math.max(...hSlice) + Math.min(...lSlice)) / 2) * 100) / 100);
    }
  }

  return {
    sma20,
    sma50,
    ema12,
    ema26,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    rsi,
    macdLine: macd.macdLine,
    macdSignal: macd.macdSignal,
    macdHistogram: macd.macdHistogram,
    stochK: stoch.stochK,
    stochD: stoch.stochD,
    atr,
    obv,
    williamsR,
    cci,
    adx,
    ichimokuTenkan,
    ichimokuKijun,
    ichimokuSenkouA,
    ichimokuSenkouB,
  };
}

// ===== Generate Signals =====

function generateSignals(ohlcv: OHLCVItem[], indicators: IndicatorData): TechnicalSignal[] {
  const lastIdx = ohlcv.length - 1;
  const price = ohlcv[lastIdx].close;
  const signals: TechnicalSignal[] = [];

  // SMA signals
  const sma20Val = indicators.sma20[lastIdx];
  if (sma20Val !== null) {
    signals.push({
      indicator: 'SMA (20)',
      value: sma20Val.toLocaleString(),
      signal: price > sma20Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - sma20Val) / price > 0.03 ? 'Mạnh' : 'Trung bình',
    });
  }

  const sma50Val = indicators.sma50[lastIdx];
  if (sma50Val !== null) {
    signals.push({
      indicator: 'SMA (50)',
      value: sma50Val.toLocaleString(),
      signal: price > sma50Val ? 'Mua' : 'Bán',
      strength: Math.abs(price - sma50Val) / price > 0.05 ? 'Mạnh' : 'Trung bình',
    });
  }

  // EMA signals
  const ema12Val = indicators.ema12[lastIdx];
  if (ema12Val !== null) {
    signals.push({
      indicator: 'EMA (12)',
      value: ema12Val.toLocaleString(),
      signal: price > ema12Val ? 'Mua' : 'Bán',
      strength: 'Trung bình',
    });
  }

  const ema26Val = indicators.ema26[lastIdx];
  if (ema26Val !== null) {
    signals.push({
      indicator: 'EMA (26)',
      value: ema26Val.toLocaleString(),
      signal: price > ema26Val ? 'Mua' : 'Bán',
      strength: 'Trung bình',
    });
  }

  // RSI signal
  const rsiVal = indicators.rsi[lastIdx];
  if (rsiVal !== null) {
    signals.push({
      indicator: 'RSI (14)',
      value: rsiVal.toFixed(2),
      signal: rsiVal < 30 ? 'Mua' : rsiVal > 70 ? 'Bán' : 'Trung lập',
      strength: rsiVal < 20 || rsiVal > 80 ? 'Mạnh' : rsiVal < 30 || rsiVal > 70 ? 'Trung bình' : 'Yếu',
    });
  }

  // MACD signal
  const macdVal = indicators.macdLine[lastIdx];
  const macdSig = indicators.macdSignal[lastIdx];
  if (macdVal !== null && macdSig !== null) {
    signals.push({
      indicator: 'MACD (12,26,9)',
      value: macdVal.toFixed(2),
      signal: macdVal > macdSig ? 'Mua' : 'Bán',
      strength: Math.abs(macdVal - macdSig) > 500 ? 'Mạnh' : 'Trung bình',
    });
  }

  // Stochastic signal
  const stochKVal = indicators.stochK[lastIdx];
  if (stochKVal !== null) {
    signals.push({
      indicator: 'Stochastic (14,3)',
      value: stochKVal.toFixed(2),
      signal: stochKVal < 20 ? 'Mua' : stochKVal > 80 ? 'Bán' : 'Trung lập',
      strength: stochKVal < 10 || stochKVal > 90 ? 'Mạnh' : 'Trung bình',
    });
  }

  // Bollinger signal
  const bbUpper = indicators.bollingerUpper[lastIdx];
  const bbLower = indicators.bollingerLower[lastIdx];
  if (bbUpper !== null && bbLower !== null) {
    signals.push({
      indicator: 'Bollinger Bands (20,2)',
      value: `${bbLower.toLocaleString()} - ${bbUpper.toLocaleString()}`,
      signal: price < bbLower ? 'Mua' : price > bbUpper ? 'Bán' : 'Trung lập',
      strength: 'Trung bình',
    });
  }

  // Williams %R
  const wrVal = indicators.williamsR[lastIdx];
  if (wrVal !== null) {
    signals.push({
      indicator: 'Williams %R (14)',
      value: wrVal.toFixed(2),
      signal: wrVal < -80 ? 'Mua' : wrVal > -20 ? 'Bán' : 'Trung lập',
      strength: wrVal < -90 || wrVal > -10 ? 'Mạnh' : 'Trung bình',
    });
  }

  // CCI
  const cciVal = indicators.cci[lastIdx];
  if (cciVal !== null) {
    signals.push({
      indicator: 'CCI (20)',
      value: cciVal.toFixed(2),
      signal: cciVal < -100 ? 'Mua' : cciVal > 100 ? 'Bán' : 'Trung lập',
      strength: Math.abs(cciVal) > 200 ? 'Mạnh' : 'Trung bình',
    });
  }

  // ADX
  const adxVal = indicators.adx[lastIdx];
  if (adxVal !== null) {
    signals.push({
      indicator: 'ADX (14)',
      value: adxVal.toFixed(2),
      signal: adxVal > 25 ? (price > (indicators.sma20[lastIdx] ?? price) ? 'Mua' : 'Bán') : 'Trung lập',
      strength: adxVal > 50 ? 'Mạnh' : adxVal > 25 ? 'Trung bình' : 'Yếu',
    });
  }

  return signals;
}

// ===== Generate Summary =====

function generateSummary(signals: TechnicalSignal[], ohlcv: OHLCVItem[]): AnalysisSummaryData {
  const buyCount = signals.filter((s) => s.signal === 'Mua').length;
  const sellCount = signals.filter((s) => s.signal === 'Bán').length;
  const neutralCount = signals.filter((s) => s.signal === 'Trung lập').length;

  let overallSignal: AnalysisSummaryData['overallSignal'];
  const diff = buyCount - sellCount;
  if (diff >= 5) overallSignal = 'Mua mạnh';
  else if (diff >= 2) overallSignal = 'Mua';
  else if (diff <= -5) overallSignal = 'Bán mạnh';
  else if (diff <= -2) overallSignal = 'Bán';
  else overallSignal = 'Trung lập';

  const lastItem = ohlcv[ohlcv.length - 1];
  const pivot = (lastItem.high + lastItem.low + lastItem.close) / 3;
  const s1 = 2 * pivot - lastItem.high;
  const r1 = 2 * pivot - lastItem.low;
  const s2 = pivot - (lastItem.high - lastItem.low);
  const r2 = pivot + (lastItem.high - lastItem.low);
  const s3 = lastItem.low - 2 * (lastItem.high - pivot);
  const r3 = lastItem.high + 2 * (pivot - lastItem.low);

  return {
    overallSignal,
    buyCount,
    sellCount,
    neutralCount,
    movingAverages: signals.filter((s) =>
      s.indicator.includes('SMA') || s.indicator.includes('EMA')
    ),
    oscillators: signals.filter((s) =>
      !s.indicator.includes('SMA') && !s.indicator.includes('EMA')
    ),
    pivotPoints: [
      {
        type: 'Classic',
        s3: Math.round(s3),
        s2: Math.round(s2),
        s1: Math.round(s1),
        pivot: Math.round(pivot),
        r1: Math.round(r1),
        r2: Math.round(r2),
        r3: Math.round(r3),
      },
      {
        type: 'Fibonacci',
        s3: Math.round(pivot - 1.0 * (lastItem.high - lastItem.low)),
        s2: Math.round(pivot - 0.618 * (lastItem.high - lastItem.low)),
        s1: Math.round(pivot - 0.382 * (lastItem.high - lastItem.low)),
        pivot: Math.round(pivot),
        r1: Math.round(pivot + 0.382 * (lastItem.high - lastItem.low)),
        r2: Math.round(pivot + 0.618 * (lastItem.high - lastItem.low)),
        r3: Math.round(pivot + 1.0 * (lastItem.high - lastItem.low)),
      },
    ],
  };
}

// ===== Main Export =====

const stockNames: Record<string, { name: string; exchange: string }> = {
  VIC: { name: 'Tập đoàn Vingroup', exchange: 'HOSE' },
  VNM: { name: 'Vinamilk', exchange: 'HOSE' },
  VHM: { name: 'Vinhomes', exchange: 'HOSE' },
  HPG: { name: 'Hòa Phát', exchange: 'HOSE' },
  FPT: { name: 'FPT Corporation', exchange: 'HOSE' },
  MSN: { name: 'Masan Group', exchange: 'HOSE' },
  MWG: { name: 'Thế Giới Di Động', exchange: 'HOSE' },
  TCB: { name: 'Techcombank', exchange: 'HOSE' },
  VCB: { name: 'Vietcombank', exchange: 'HOSE' },
  SSI: { name: 'SSI Securities', exchange: 'HOSE' },
};

export function getAnalysisData(ticker: string): StockAnalysisData {
  const upperTicker = ticker.toUpperCase();
  const ohlcv = generateOHLCV(upperTicker, 365);
  const indicators = calculateIndicators(ohlcv);
  const signals = generateSignals(ohlcv, indicators);
  const summary = generateSummary(signals, ohlcv);

  const lastItem = ohlcv[ohlcv.length - 1];
  const prevItem = ohlcv[ohlcv.length - 2];
  const change = lastItem.close - prevItem.close;
  const changePct = (change / prevItem.close) * 100;

  const info = stockNames[upperTicker] || { name: upperTicker, exchange: 'HOSE' };

  return {
    ticker: upperTicker,
    companyName: info.name,
    exchange: info.exchange,
    currentPrice: lastItem.close,
    priceChange: change,
    priceChangePercent: Math.round(changePct * 100) / 100,
    ohlcv,
    indicators,
    signals,
    summary,
  };
}

export const popularTickers = [
  { ticker: 'VIC', name: 'Vingroup' },
  { ticker: 'VNM', name: 'Vinamilk' },
  { ticker: 'VHM', name: 'Vinhomes' },
  { ticker: 'HPG', name: 'Hòa Phát' },
  { ticker: 'FPT', name: 'FPT Corp' },
  { ticker: 'MSN', name: 'Masan' },
  { ticker: 'MWG', name: 'Thế Giới Di Động' },
  { ticker: 'TCB', name: 'Techcombank' },
  { ticker: 'VCB', name: 'Vietcombank' },
  { ticker: 'SSI', name: 'SSI Securities' },
];
