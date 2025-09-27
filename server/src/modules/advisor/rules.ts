import { formatCurrency } from '../../../lib/utils/formatCurrency';

export type RiskProfile = 'low' | 'medium' | 'high';

export interface PortfolioAllocation {
  cash: number;           // Nakit
  deposits: number;       // Mevduat
  forex: number;          // Döviz
  stocks: number;         // Hisse senetleri
  bonds: number;          // Tahvil
  crypto: number;         // Kripto para
  commodities: number;    // Emtia
  realEstate: number;     // Gayrimenkul
}

export interface InvestmentTip {
  id: string;
  category: 'allocation' | 'risk' | 'diversification' | 'timing' | 'cost';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

export interface AdvisorResult {
  riskScore: number;
  tips: InvestmentTip[];
  targetAllocation: PortfolioAllocation;
  currentAllocation: PortfolioAllocation;
  recommendations: {
    rebalance: boolean;
    actionItems: string[];
    expectedReturn: number;
    riskLevel: RiskProfile;
  };
  chartData: {
    current: Array<{ name: string; value: number; color: string }>;
    target: Array<{ name: string; value: number; color: string }>;
  };
}

export interface PortfolioInput {
  portfolio: {
    cash: number;
    deposits: number;
    forex: number;
    stocks: number;
    bonds: number;
    crypto: number;
    commodities: number;
    realEstate: number;
  };
  riskProfile: RiskProfile;
  age?: number;
  investmentHorizon?: number; // years
}

/**
 * Yatırım Danışmanı Ajanı - Risk profiline göre portföy önerileri
 */
export class InvestmentAdvisor {
  
  /**
   * Ana analiz fonksiyonu
   */
  analyzePortfolio(input: PortfolioInput): AdvisorResult {
    const currentAllocation = this.normalizeAllocation(input.portfolio);
    const targetAllocation = this.getTargetAllocation(input.riskProfile);
    const riskScore = this.calculateRiskScore(currentAllocation, input.riskProfile);
    const tips = this.generateTips(currentAllocation, targetAllocation, input.riskProfile);
    const recommendations = this.generateRecommendations(currentAllocation, targetAllocation, input.riskProfile);
    const chartData = this.prepareChartData(currentAllocation, targetAllocation);

    return {
      riskScore,
      tips,
      targetAllocation,
      currentAllocation,
      recommendations,
      chartData
    };
  }

  /**
   * Portföy dağılımını normalize eder (toplam %100)
   */
  private normalizeAllocation(portfolio: PortfolioInput['portfolio']): PortfolioAllocation {
    const total = Object.values(portfolio).reduce((sum, value) => sum + value, 0);
    
    if (total === 0) {
      return {
        cash: 100,
        deposits: 0,
        forex: 0,
        stocks: 0,
        bonds: 0,
        crypto: 0,
        commodities: 0,
        realEstate: 0
      };
    }

    return {
      cash: (portfolio.cash / total) * 100,
      deposits: (portfolio.deposits / total) * 100,
      forex: (portfolio.forex / total) * 100,
      stocks: (portfolio.stocks / total) * 100,
      bonds: (portfolio.bonds / total) * 100,
      crypto: (portfolio.crypto / total) * 100,
      commodities: (portfolio.commodities / total) * 100,
      realEstate: (portfolio.realEstate / total) * 100
    };
  }

  /**
   * Risk profiline göre hedef dağılım belirler
   */
  private getTargetAllocation(riskProfile: RiskProfile): PortfolioAllocation {
    switch (riskProfile) {
      case 'low':
        return {
          cash: 20,
          deposits: 40,
          forex: 15,
          stocks: 15,
          bonds: 10,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        };
      
      case 'medium':
        return {
          cash: 15,
          deposits: 25,
          forex: 20,
          stocks: 25,
          bonds: 10,
          crypto: 3,
          commodities: 2,
          realEstate: 0
        };
      
      case 'high':
        return {
          cash: 10,
          deposits: 15,
          forex: 20,
          stocks: 35,
          bonds: 5,
          crypto: 10,
          commodities: 3,
          realEstate: 2
        };
      
      default:
        return this.getTargetAllocation('medium');
    }
  }

  /**
   * Risk skorunu hesaplar (0-100)
   */
  private calculateRiskScore(current: PortfolioAllocation, targetProfile: RiskProfile): number {
    // Risk ağırlıkları
    const riskWeights = {
      cash: 0,
      deposits: 1,
      forex: 3,
      stocks: 6,
      bonds: 2,
      crypto: 10,
      commodities: 7,
      realEstate: 4
    };

    // Mevcut portföy risk skoru
    const currentRisk = Object.entries(current).reduce((score, [key, value]) => {
      return score + (value * riskWeights[key as keyof PortfolioAllocation]);
    }, 0);

    // Hedef risk profili skoru
    const targetRisk = targetProfile === 'low' ? 25 : targetProfile === 'medium' ? 50 : 75;

    // Uyum skoru (100 - fark)
    const alignment = Math.max(0, 100 - Math.abs(currentRisk - targetRisk));
    
    return Math.round(alignment);
  }

  /**
   * Yatırım tavsiyeleri oluşturur
   */
  private generateTips(current: PortfolioAllocation, target: PortfolioAllocation, riskProfile: RiskProfile): InvestmentTip[] {
    const tips: InvestmentTip[] = [];

    // Dağılım analizi
    this.analyzeAllocation(current, target, tips);
    
    // Risk profili analizi
    this.analyzeRiskProfile(current, riskProfile, tips);
    
    // Çeşitlendirme analizi
    this.analyzeDiversification(current, tips);
    
    // Zamanlama tavsiyeleri
    this.analyzeTiming(riskProfile, tips);

    return tips.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Dağılım analizi yapar
   */
  private analyzeAllocation(current: PortfolioAllocation, target: PortfolioAllocation, tips: InvestmentTip[]) {
    const threshold = 5; // %5 fark eşiği

    Object.keys(current).forEach(key => {
      const currentValue = current[key as keyof PortfolioAllocation];
      const targetValue = target[key as keyof PortfolioAllocation];
      const difference = Math.abs(currentValue - targetValue);

      if (difference > threshold) {
        const assetName = this.getAssetName(key);
        
        if (currentValue > targetValue + threshold) {
          tips.push({
            id: `reduce-${key}`,
            category: 'allocation',
            title: `${assetName} pozisyonunu azaltın`,
            description: `Mevcut ${assetName} ağırlığınız %${currentValue.toFixed(1)}, hedef %${targetValue.toFixed(1)}. Fazla pozisyonu azaltarak riski düşürün.`,
            priority: difference > 15 ? 'high' : 'medium',
            action: `${assetName} pozisyonunu %${targetValue.toFixed(0)}'a düşürün`
          });
        } else if (currentValue < targetValue - threshold) {
          tips.push({
            id: `increase-${key}`,
            category: 'allocation',
            title: `${assetName} pozisyonunu artırın`,
            description: `Mevcut ${assetName} ağırlığınız %${currentValue.toFixed(1)}, hedef %${targetValue.toFixed(1)}. Bu varlık sınıfına daha fazla yatırım yaparak portföyü dengeleyin.`,
            priority: difference > 15 ? 'high' : 'medium',
            action: `${assetName} pozisyonunu %${targetValue.toFixed(0)}'a çıkarın`
          });
        }
      }
    });
  }

  /**
   * Risk profili analizi yapar
   */
  private analyzeRiskProfile(current: PortfolioAllocation, riskProfile: RiskProfile, tips: InvestmentTip[]) {
    const highRiskAssets = current.stocks + current.crypto + current.commodities;
    const lowRiskAssets = current.cash + current.deposits + current.bonds;

    if (riskProfile === 'low' && highRiskAssets > 30) {
      tips.push({
        id: 'reduce-risk',
        category: 'risk',
        title: 'Risk seviyesini düşürün',
        description: 'Düşük risk profili için yüksek riskli varlıklar (%30 üzeri) fazla. Nakit ve mevduat ağırlığını artırın.',
        priority: 'high',
        action: 'Yüksek riskli varlıkları %30\'un altına düşürün'
      });
    } else if (riskProfile === 'high' && lowRiskAssets > 50) {
      tips.push({
        id: 'increase-risk',
        category: 'risk',
        title: 'Risk seviyesini artırın',
        description: 'Yüksek risk profili için düşük riskli varlıklar (%50 üzeri) fazla. Hisse senedi ve kripto ağırlığını artırın.',
        priority: 'high',
        action: 'Yüksek getirili varlıklara daha fazla yatırım yapın'
      });
    }
  }

  /**
   * Çeşitlendirme analizi yapar
   */
  private analyzeDiversification(current: PortfolioAllocation, tips: InvestmentTip[]) {
    const nonZeroAssets = Object.values(current).filter(value => value > 0).length;

    if (nonZeroAssets < 3) {
      tips.push({
        id: 'diversify',
        category: 'diversification',
        title: 'Portföyü çeşitlendirin',
        description: `Sadece ${nonZeroAssets} varlık sınıfında yatırımınız var. Risk dağıtmak için daha fazla varlık sınıfına yatırım yapın.`,
        priority: 'high',
        action: 'En az 3-4 farklı varlık sınıfına yatırım yapın'
      });
    }

    // Tek varlık konsantrasyonu kontrolü
    const maxAllocation = Math.max(...Object.values(current));
    if (maxAllocation > 60) {
      const dominantAsset = Object.keys(current).find(key => current[key as keyof PortfolioAllocation] === maxAllocation);
      tips.push({
        id: 'concentration-risk',
        category: 'diversification',
        title: 'Konsantrasyon riski yüksek',
        description: `${this.getAssetName(dominantAsset!)} %${maxAllocation.toFixed(1)} ile portföyünüzde çok dominant. Risk dağıtımı için diğer varlıklara yatırım yapın.`,
        priority: 'high',
        action: 'En yüksek pozisyonu %50\'nin altına düşürün'
      });
    }
  }

  /**
   * Zamanlama tavsiyeleri verir
   */
  private analyzeTiming(riskProfile: RiskProfile, tips: InvestmentTip[]) {
    if (riskProfile === 'high') {
      tips.push({
        id: 'dca-strategy',
        category: 'timing',
        title: 'Dolar maliyet ortalaması uygulayın',
        description: 'Yüksek risk profili için volatil varlıklarda düzenli yatırım stratejisi riski azaltır.',
        priority: 'medium',
        action: 'Aylık düzenli yatırım planı oluşturun'
      });
    }

    tips.push({
      id: 'rebalance-schedule',
      category: 'timing',
      title: 'Düzenli yeniden dengeleme yapın',
      description: 'Portföy dağılımını korumak için 3-6 ayda bir yeniden dengeleme yapın.',
      priority: 'medium',
      action: 'Yılda 2-4 kez portföy yeniden dengelemesi yapın'
    });
  }

  /**
   * Öneriler oluşturur
   */
  private generateRecommendations(current: PortfolioAllocation, target: PortfolioAllocation, riskProfile: RiskProfile) {
    const rebalance = this.needsRebalancing(current, target);
    const actionItems = this.getActionItems(current, target);
    const expectedReturn = this.calculateExpectedReturn(target, riskProfile);

    return {
      rebalance,
      actionItems,
      expectedReturn,
      riskLevel: riskProfile
    };
  }

  /**
   * Yeniden dengeleme gereksinimini kontrol eder
   */
  private needsRebalancing(current: PortfolioAllocation, target: PortfolioAllocation): boolean {
    const threshold = 5;
    return Object.keys(current).some(key => {
      const difference = Math.abs(current[key as keyof PortfolioAllocation] - target[key as keyof PortfolioAllocation]);
      return difference > threshold;
    });
  }

  /**
   * Aksiyon öğeleri oluşturur
   */
  private getActionItems(current: PortfolioAllocation, target: PortfolioAllocation): string[] {
    const items: string[] = [];
    const threshold = 5;

    Object.keys(current).forEach(key => {
      const currentValue = current[key as keyof PortfolioAllocation];
      const targetValue = target[key as keyof PortfolioAllocation];
      const difference = targetValue - currentValue;

      if (Math.abs(difference) > threshold) {
        const assetName = this.getAssetName(key);
        if (difference > 0) {
          items.push(`${assetName} pozisyonunu %${difference.toFixed(1)} artırın`);
        } else {
          items.push(`${assetName} pozisyonunu %${Math.abs(difference).toFixed(1)} azaltın`);
        }
      }
    });

    return items;
  }

  /**
   * Beklenen getiri hesaplar
   */
  private calculateExpectedReturn(allocation: PortfolioAllocation, riskProfile: RiskProfile): number {
    // Varlık sınıflarına göre beklenen getiriler (% yıllık)
    const expectedReturns = {
      cash: 2,
      deposits: 4,
      forex: 6,
      stocks: 10,
      bonds: 5,
      crypto: 15,
      commodities: 8,
      realEstate: 7
    };

    const weightedReturn = Object.entries(allocation).reduce((total, [key, weight]) => {
      return total + (weight / 100) * expectedReturns[key as keyof PortfolioAllocation];
    }, 0);

    return Math.round(weightedReturn * 100) / 100;
  }

  /**
   * Grafik verisi hazırlar
   */
  private prepareChartData(current: PortfolioAllocation, target: PortfolioAllocation) {
    const colors = {
      cash: '#10B981',      // Yeşil
      deposits: '#3B82F6',  // Mavi
      forex: '#F59E0B',     // Turuncu
      stocks: '#EF4444',    // Kırmızı
      bonds: '#8B5CF6',     // Mor
      crypto: '#F97316',    // Turuncu-kırmızı
      commodities: '#06B6D4', // Cyan
      realEstate: '#84CC16'  // Lime
    };

    const currentData = Object.entries(current)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => ({
        name: this.getAssetName(key),
        value: Math.round(value * 10) / 10,
        color: colors[key as keyof typeof colors]
      }));

    const targetData = Object.entries(target)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => ({
        name: this.getAssetName(key),
        value: Math.round(value * 10) / 10,
        color: colors[key as keyof typeof colors]
      }));

    return {
      current: currentData,
      target: targetData
    };
  }

  /**
   * Varlık adını döndürür
   */
  private getAssetName(key: string): string {
    const names: Record<string, string> = {
      cash: 'Nakit',
      deposits: 'Mevduat',
      forex: 'Döviz',
      stocks: 'Hisse Senetleri',
      bonds: 'Tahvil',
      crypto: 'Kripto Para',
      commodities: 'Emtia',
      realEstate: 'Gayrimenkul'
    };
    return names[key] || key;
  }
}

/**
 * Portföy analizi çalıştırma fonksiyonu
 */
export function analyzePortfolio(input: PortfolioInput): AdvisorResult {
  const advisor = new InvestmentAdvisor();
  return advisor.analyzePortfolio(input);
}

/**
 * Portföy giriş verilerini doğrular
 */
export function validatePortfolioInput(input: any): {
  valid: boolean;
  errors: string[];
  normalized: PortfolioInput | null;
} {
  const errors: string[] = [];

  // Portfolio kontrolü
  if (!input.portfolio || typeof input.portfolio !== 'object') {
    errors.push('Portfolio verisi gereklidir');
  } else {
    const requiredFields = ['cash', 'deposits', 'forex', 'stocks', 'bonds', 'crypto', 'commodities', 'realEstate'];
    requiredFields.forEach(field => {
      if (typeof input.portfolio[field] !== 'number' || input.portfolio[field] < 0) {
        errors.push(`${field} alanı 0 veya pozitif sayı olmalıdır`);
      }
    });
  }

  // Risk profile kontrolü
  if (!['low', 'medium', 'high'].includes(input.riskProfile)) {
    errors.push('riskProfile "low", "medium" veya "high" olmalıdır');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      normalized: null
    };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      portfolio: input.portfolio,
      riskProfile: input.riskProfile,
      age: input.age,
      investmentHorizon: input.investmentHorizon
    }
  };
}
