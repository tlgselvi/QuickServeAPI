import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  BarChart3,
  Settings
} from 'lucide-react';

interface RiskScenario {
  cash: number;
  score: number;
  formattedCash: string;
}

interface RiskAnalysisData {
  best: RiskScenario;
  base: RiskScenario;
  worst: RiskScenario;
  factors: {
    fx: string;
    rate: string;
    inflation: string;
    liquidity: string;
  };
  riskLevel: {
    level: string;
    color: string;
    description: string;
  };
  recommendations: string[];
  parameters: {
    fxDelta: number;
    rateDelta: number;
    inflationDelta: number;
    liquidityGap: number;
  };
}

interface RiskAnalysisProps {
  data?: RiskAnalysisData;
  isLoading?: boolean;
  onParameterChange?: (parameters: {
    fxDelta: number;
    rateDelta: number;
    inflationDelta: number;
    liquidityGap: number;
  }) => void;
}

export default function RiskAnalysis({ data, isLoading, onParameterChange }: RiskAnalysisProps) {
  const [showParameters, setShowParameters] = useState(false);
  const [parameters, setParameters] = useState({
    fxDelta: data?.parameters.fxDelta || 0,
    rateDelta: data?.parameters.rateDelta || 0,
    inflationDelta: data?.parameters.inflationDelta || 0,
    liquidityGap: data?.parameters.liquidityGap || 0
  });

  const handleParameterChange = (key: string, value: number) => {
    const newParameters = { ...parameters, [key]: value };
    setParameters(newParameters);
    onParameterChange?.(newParameters);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <TrendingUp className="w-4 h-4" />;
    if (score >= 40) return <AlertTriangle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Risk Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Level Alert */}
      {data?.riskLevel && (
        <Alert className={`border-${data.riskLevel.color}-200 bg-${data.riskLevel.color}-50`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Risk Seviyesi: {data.riskLevel.level}</strong>
                <p className="text-sm mt-1">{data.riskLevel.description}</p>
              </div>
              <Badge variant="outline" className={`text-${data.riskLevel.color}-600 border-${data.riskLevel.color}-300`}>
                {data.riskLevel.level}
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Best Case */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <TrendingUp className="w-5 h-5" />
              En İyi Senaryo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {data?.best.formattedCash}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getScoreColor(data?.best.score || 0)}>
                  {getScoreIcon(data?.best.score || 0)}
                  <span className="ml-1">Skor: {data?.best.score}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Base Case */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <BarChart3 className="w-5 h-5" />
              Temel Senaryo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {data?.base.formattedCash}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getScoreColor(data?.base.score || 0)}>
                  {getScoreIcon(data?.base.score || 0)}
                  <span className="ml-1">Skor: {data?.base.score}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worst Case */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <TrendingDown className="w-5 h-5" />
              En Kötü Senaryo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {data?.worst.formattedCash}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getScoreColor(data?.worst.score || 0)}>
                  {getScoreIcon(data?.worst.score || 0)}
                  <span className="ml-1">Skor: {data?.worst.score}</span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Risk Faktörleri
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowParameters(!showParameters)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Parametreler
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showParameters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
              <div>
                <Label htmlFor="fxDelta">Döviz Kuru (%)</Label>
                <Input
                  id="fxDelta"
                  type="number"
                  step="0.1"
                  value={parameters.fxDelta}
                  onChange={(e) => handleParameterChange('fxDelta', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="rateDelta">Faiz Oranı (%)</Label>
                <Input
                  id="rateDelta"
                  type="number"
                  step="0.1"
                  value={parameters.rateDelta}
                  onChange={(e) => handleParameterChange('rateDelta', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="inflationDelta">Enflasyon (%)</Label>
                <Input
                  id="inflationDelta"
                  type="number"
                  step="0.1"
                  value={parameters.inflationDelta}
                  onChange={(e) => handleParameterChange('inflationDelta', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="liquidityGap">Likidite Açığı (%)</Label>
                <Input
                  id="liquidityGap"
                  type="number"
                  step="0.1"
                  value={parameters.liquidityGap}
                  onChange={(e) => handleParameterChange('liquidityGap', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Döviz Kuru</div>
              <div className="text-lg font-semibold">{data?.factors.fx}</div>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Faiz Oranı</div>
              <div className="text-lg font-semibold">{data?.factors.rate}</div>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Enflasyon</div>
              <div className="text-lg font-semibold">{data?.factors.inflation}</div>
            </div>
            <div className="text-center p-3 bg-muted/20 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Likidite Açığı</div>
              <div className="text-lg font-semibold">{data?.factors.liquidity}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data?.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Önerileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
