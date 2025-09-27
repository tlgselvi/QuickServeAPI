import { Router } from "express";
import { investmentAdvisorService } from "../services/ai/investment-advisor";
import { simulationAgentService } from "../services/ai/simulation-agent";

const router = Router();

// ===================================
// INVESTMENT ADVISOR AGENT
// ===================================

// GET /api/ai-agents/investment-advisor/risk-assessment
router.get("/investment-advisor/risk-assessment", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Kullanıcı kimlik doğrulaması gerekli" });
    }

    const riskAssessment = await investmentAdvisorService.calculateRiskScore(userId);
    
    res.json({
      success: true,
      data: riskAssessment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Risk assessment error:", error);
    res.status(500).json({ 
      error: "Risk değerlendirmesi yapılırken hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    });
  }
});

// GET /api/ai-agents/investment-advisor/portfolio-recommendation
router.get("/investment-advisor/portfolio-recommendation", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { strategy } = req.query; // conservative, balanced, aggressive

    if (!userId) {
      return res.status(401).json({ error: "Kullanıcı kimlik doğrulaması gerekli" });
    }

    const recommendation = await investmentAdvisorService.generatePortfolioRecommendation(
      userId, 
      strategy as any
    );
    
    res.json({
      success: true,
      data: recommendation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Portfolio recommendation error:", error);
    res.status(500).json({ 
      error: "Portföy önerisi oluşturulurken hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    });
  }
});

// GET /api/ai-agents/investment-advisor/suggestions
router.get("/investment-advisor/suggestions", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Kullanıcı kimlik doğrulaması gerekli" });
    }

    const suggestions = await investmentAdvisorService.getInvestmentSuggestions(userId);
    
    res.json({
      success: true,
      data: suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Investment suggestions error:", error);
    res.status(500).json({ 
      error: "Yatırım önerileri alınırken hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    });
  }
});

// ===================================
// SIMULATION AGENT
// ===================================

// GET /api/ai-agents/simulation/parameters
router.get("/simulation/parameters", async (req, res) => {
  try {
    const parameters = simulationAgentService.getSimulationParameters();
    
    res.json({
      success: true,
      data: parameters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Simulation parameters error:", error);
    res.status(500).json({ 
      error: "Simülasyon parametreleri alınırken hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    });
  }
});

// POST /api/ai-agents/simulation/run
router.post("/simulation/run", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { param1, param2, timeHorizon = 12 } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Kullanıcı kimlik doğrulaması gerekli" });
    }

    if (!param1 || !param2) {
      return res.status(400).json({ 
        error: "İki parametre gereklidir",
        details: "param1 ve param2 alanları zorunludur"
      });
    }

    const simulationResult = await simulationAgentService.runSimulation(
      userId,
      param1,
      param2,
      timeHorizon
    );
    
    res.json({
      success: true,
      data: simulationResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Simulation run error:", error);
    res.status(500).json({ 
      error: "Simülasyon çalıştırılırken hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    });
  }
});

// ===================================
// COMBINED AI ANALYSIS
// ===================================

// GET /api/ai-agents/comprehensive-analysis
router.get("/comprehensive-analysis", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Kullanıcı kimlik doğrulaması gerekli" });
    }

    // Run all AI analyses in parallel
    const [riskAssessment, portfolioRecommendation, investmentSuggestions] = await Promise.all([
      investmentAdvisorService.calculateRiskScore(userId),
      investmentAdvisorService.generatePortfolioRecommendation(userId),
      investmentAdvisorService.getInvestmentSuggestions(userId)
    ]);

    // Get simulation parameters for quick access
    const simulationParameters = simulationAgentService.getSimulationParameters();

    const comprehensiveAnalysis = {
      riskAssessment,
      portfolioRecommendation,
      investmentSuggestions,
      simulationParameters,
      summary: {
        riskLevel: riskAssessment.riskLevel,
        recommendedStrategy: portfolioRecommendation.strategy,
        suggestedInvestments: investmentSuggestions.suggestions.length,
        lastUpdated: new Date().toISOString()
      }
    };
    
    res.json({
      success: true,
      data: comprehensiveAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Comprehensive analysis error:", error);
    res.status(500).json({ 
      error: "Kapsamlı analiz yapılırken hata oluştu",
      details: error instanceof Error ? error.message : "Bilinmeyen hata"
    });
  }
});

export default router;
