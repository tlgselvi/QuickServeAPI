import { formatCurrency } from '../../../lib/utils/formatCurrency';

export interface RiskParameters {
  fxDelta: number;        // Döviz kuru değişimi (%)
  rateDelta: number;      // Faiz oranı değişimi (%)
  inflationDelta: number; // Enflasyon değişimi (%)
  liquidityGap: number;   // Likidite açığı (%)
}

export interface RiskScenario {
  cash: number;
  score: number;
  factors: {
    fxImpact: number;
    rateImpact: number;
    inflationImpact: number;
    liquidityImpact: number;
  };
}

export interface RiskAnalysisResult {
  best: RiskScenario;
  base: RiskScenario;
  worst: RiskScenario;
  factors: {
    fx: string;
    rate: string;
    inflation: string;
    liquidity: string;
  };
  parameters: RiskParameters;
}

/**
 * Risk faktörlerinin etkisini hesaplar
 */
function calculateRiskImpacts(parameters: RiskParameters) {
  const fxImpact = Math.abs(parameters.fxDelta) * 2;
  const rateImpact = Math.abs(parameters.rateDelta);
  const inflationImpact = Math.abs(parameters.inflationDelta) * 1.5;
  const liquidityImpact = parameters.liquidityGap * 2;

  return {
    fxImpact,
    rateImpact,
    inflationImpact,
    liquidityImpact
  };
}

/**
 * Risk skorunu hesaplar (0-100 arası, yüksek = düşük risk)
 */
function calculateRiskScore(parameters: RiskParameters): number {
  const impacts = calculateRiskImpacts(parameters);
  const totalImpact = impacts.fxImpact + impacts.rateImpact + impacts.inflationImpact + impacts.liquidityImpact;
  
  // Skor = 100 - toplam etki, 0-100 arasında sınırla
  const score = Math.max(0, Math.min(100, 100 - totalImpact));
  
  return Math.round(score * 100) / 100;
}

/**
 * Nakit akışını risk faktörlerine göre hesaplar
 */
function calculateCashFlow(baseCash: number, parameters: RiskParameters): number {
  // Döviz etkisi (döviz pozisyonu varsa)
  const fxEffect = baseCash * (parameters.fxDelta / 100) * 0.1; // %10 döviz pozisyonu varsayımı
  
  // Faiz etkisi
  const rateEffect = baseCash * (parameters.rateDelta / 100) * 0.2; // %20 faiz hassasiyeti
  
  // Enflasyon etkisi (satın alma gücü kaybı)
  const inflationEffect = -baseCash * (parameters.inflationDelta / 100);
  
  // Likidite açığı etkisi
  const liquidityEffect = -baseCash * (parameters.liquidityGap / 100);
  
  const adjustedCash = baseCash + fxEffect + rateEffect + inflationEffect + liquidityEffect;
  
  return Math.round(adjustedCash * 100) / 100;
}

/**
 * Risk analizi senaryolarını hesaplar
 */
export function analyzeRiskScenarios(
  baseCash: number,
  parameters: RiskParameters
): RiskAnalysisResult {
  const baseScore = calculateRiskScore(parameters);
  const baseImpacts = calculateRiskImpacts(parameters);
  
  // Base scenario
  const baseCashFlow = calculateCashFlow(baseCash, parameters);
  const base: RiskScenario = {
    cash: baseCashFlow,
    score: baseScore,
    factors: baseImpacts
  };

  // Best scenario (risk faktörleri %50 azalır)
  const bestParameters: RiskParameters = {
    fxDelta: parameters.fxDelta * 0.5,
    rateDelta: parameters.rateDelta * 0.5,
    inflationDelta: parameters.inflationDelta * 0.5,
    liquidityGap: parameters.liquidityGap * 0.5
  };
  const bestScore = calculateRiskScore(bestParameters);
  const bestCashFlow = calculateCashFlow(baseCash, bestParameters);
  const bestImpacts = calculateRiskImpacts(bestParameters);
  const best: RiskScenario = {
    cash: bestCashFlow,
    score: bestScore,
    factors: bestImpacts
  };

  // Worst scenario (risk faktörleri %150 artar)
  const worstParameters: RiskParameters = {
    fxDelta: parameters.fxDelta * 1.5,
    rateDelta: parameters.rateDelta * 1.5,
    inflationDelta: parameters.inflationDelta * 1.5,
    liquidityGap: parameters.liquidityGap * 1.5
  };
  const worstScore = calculateRiskScore(worstParameters);
  const worstCashFlow = calculateCashFlow(baseCash, worstParameters);
  const worstImpacts = calculateRiskImpacts(worstParameters);
  const worst: RiskScenario = {
    cash: worstCashFlow,
    score: worstScore,
    factors: worstImpacts
  };

  return {
    best,
    base,
    worst,
    factors: {
      fx: `${parameters.fxDelta >= 0 ? '+' : ''}${parameters.fxDelta}%`,
      rate: `${parameters.rateDelta >= 0 ? '+' : ''}${parameters.rateDelta}%`,
      inflation: `${parameters.inflationDelta >= 0 ? '+' : ''}${parameters.inflationDelta}%`,
      liquidity: `${parameters.liquidityGap}%`
    },
    parameters
  };
}

/**
 * Risk seviyesini metin olarak döndürür
 */
export function getRiskLevel(score: number): {
  level: string;
  color: string;
  description: string;
} {
  if (score >= 80) {
    return {
      level: 'Düşük',
      color: 'green',
      description: 'Risk seviyesi düşük, portföy güvenli'
    };
  } else if (score >= 60) {
    return {
      level: 'Orta',
      color: 'yellow',
      description: 'Risk seviyesi orta, dikkatli izleme gerekli'
    };
  } else if (score >= 40) {
    return {
      level: 'Yüksek',
      color: 'orange',
      description: 'Risk seviyesi yüksek, önlem alınmalı'
    };
  } else {
    return {
      level: 'Çok Yüksek',
      color: 'red',
      description: 'Risk seviyesi çok yüksek, acil müdahale gerekli'
    };
  }
}

/**
 * Risk önerilerini oluşturur
 */
export function generateRiskRecommendations(result: RiskAnalysisResult): string[] {
  const recommendations: string[] = [];
  
  // Skor bazlı öneriler
  if (result.base.score < 50) {
    recommendations.push('Risk seviyesi yüksek, portföy çeşitlendirmesi önerilir');
  }
  
  // Faktör bazlı öneriler
  if (Math.abs(result.parameters.fxDelta) > 10) {
    recommendations.push('Döviz kuru volatilitesi yüksek, hedge stratejileri değerlendirilmeli');
  }
  
  if (Math.abs(result.parameters.rateDelta) > 5) {
    recommendations.push('Faiz oranı değişimleri portföyü etkileyebilir, sabit getirili araçlar düşünülmeli');
  }
  
  if (result.parameters.inflationDelta > 5) {
    recommendations.push('Enflasyon yüksek, enflasyona karşı korumalı yatırımlar önerilir');
  }
  
  if (result.parameters.liquidityGap > 15) {
    recommendations.push('Likidite açığı yüksek, acil nakit ihtiyaçları için rezerv oluşturulmalı');
  }
  
  // Pozitif öneriler
  if (result.base.score >= 70) {
    recommendations.push('Portföy sağlıklı, mevcut strateji sürdürülebilir');
  }
  
  return recommendations;
}

/**
 * Risk analizi için varsayılan parametreler (tümü 0 - nötr)
 */
export const DEFAULT_RISK_PARAMETERS: RiskParameters = {
  fxDelta: 0,      // %0 döviz kuru değişimi
  rateDelta: 0,    // %0 faiz oranı değişimi
  inflationDelta: 0, // %0 enflasyon
  liquidityGap: 0  // %0 likidite açığı
};
