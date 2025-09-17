import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle,
  CreditCard,
  TestTube,
  Clipboard,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Zap,
  BarChart3
} from 'lucide-react';
import { testCards, TestCard } from '@/utils/testCardNumbers';
import { developmentMockSystem } from '@/utils/developmentMockSystem';
import { toast } from '@/hooks/use-toast';

interface SimulationResult {
  success: boolean;
  scenario: string;
  duration: number;
  error?: string;
  data?: Record<string, unknown>;
}

export const PaymentSimulator: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<TestCard | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string>('success_fast');
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [customAmount, setCustomAmount] = useState('50.00');
  const [customEmail, setCustomEmail] = useState('test@example.com');

  const scenarios = developmentMockSystem.getScenarios();
  const mockStats = developmentMockSystem.getStats();

  useEffect(() => {
    // Set default card
    const defaultCards = testCards.getByCategory('basic');
    if (defaultCards.length > 0) {
      setSelectedCard(defaultCards[0]);
    }
  }, []);

  const handleCopyCardNumber = (cardNumber: string) => {
    navigator.clipboard.writeText(cardNumber);
    toast({
      title: "Copied!",
      description: "Card number copied to clipboard",
    });
  };

  const handleRunSimulation = async (scenario?: string, options?: { skipStateManagement?: boolean }) => {
    if (!selectedCard) return;

    const currentScenario = scenario || selectedScenario;
    const skipStateManagement = options?.skipStateManagement || false;
    
    if (!skipStateManagement && isRunning) return;
    
    if (!skipStateManagement) {
      setIsRunning(true);
    }
    const startTime = Date.now();

    try {
      // Create mock session data
      const sessionData = {
        lineItems: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Test Media Placement'
            },
            unit_amount: Math.round(parseFloat(customAmount) * 100)
          },
          quantity: 1
        }],
        customerId: 'cus_test_simulator',
        customerEmail: customEmail,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancel`,
        metadata: {
          simulator: 'true',
          card_brand: selectedCard.brand,
          test_scenario: currentScenario
        }
      };

      // Run mock payment
      const result = await developmentMockSystem.createSession(sessionData, currentScenario);
      const duration = Date.now() - startTime;

      // Record result
      const simulationResult: SimulationResult = {
        success: result.success,
        scenario: currentScenario,
        duration,
        error: result.error,
        data: result
      };

      setSimulationResults(prev => [simulationResult, ...prev.slice(0, 9)]); // Keep last 10

      // Record in mock system
      developmentMockSystem.recordAttempt(result);

      // Show toast
      toast({
        title: result.success ? "Simulation Successful" : "Simulation Failed",
        description: result.success ? 
          `Payment simulated successfully in ${duration}ms` : 
          result.error || 'Unknown error',
        variant: result.success ? "default" : "destructive",
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const simulationResult: SimulationResult = {
        success: false,
        scenario: currentScenario,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setSimulationResults(prev => [simulationResult, ...prev.slice(0, 9)]);

      toast({
        title: "Simulation Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      if (!skipStateManagement) {
        setIsRunning(false);
      }
    }
  };

  const handleRunMultipleTests = async () => {
    setIsRunning(true);
    
    const testScenarios = ['success_fast', 'card_declined', 'insufficient_funds', 'network_error'];
    
    for (const scenario of testScenarios) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay between tests
      await handleRunSimulation(scenario, { skipStateManagement: true });
    }
    
    setIsRunning(false);
    
    toast({
      title: "Batch Testing Complete",
      description: `Ran ${testScenarios.length} test scenarios`,
    });
  };

  const handleClearResults = () => {
    setSimulationResults([]);
    developmentMockSystem.clearStats();
  };

  const renderCardSelector = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Test Card</Label>
        <div className="space-y-2">
          {Object.entries(testCards.numbers).map(([category, cards]) => (
            <div key={category} className="space-y-2">
              <Label className="text-sm text-muted-foreground capitalize">
                {category.replace(/_/g, ' ')}
              </Label>
              <div className="grid gap-2">
                {cards.slice(0, 3).map((card, index) => (
                  <Button
                    key={index}
                    onClick={() => setSelectedCard(card)}
                    variant={selectedCard?.number === card.number ? "default" : "outline"}
                    className="justify-start text-left h-auto p-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-mono text-sm">
                          {testCards.formatNumber(card.number)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {card.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {card.brand.toUpperCase()}
                        </Badge>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCardNumber(card.number);
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScenarioSelector = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Payment Scenario</Label>
        <div className="grid gap-2">
          {Object.entries(scenarios).map(([id, scenario]) => (
            <Button
              key={id}
              onClick={() => setSelectedScenario(id)}
              variant={selectedScenario === id ? "default" : "outline"}
              className="justify-start text-left h-auto p-3"
            >
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {scenario.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {scenario.outcome === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {scenario.outcome === 'failure' && <XCircle className="h-4 w-4 text-red-600" />}
                  {scenario.outcome === 'network_error' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                  {scenario.outcome === 'timeout' && <Clock className="h-4 w-4 text-gray-600" />}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (EUR)</Label>
          <Input
            id="amount"
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="50.00"
            step="0.01"
            min="0.50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Customer Email</Label>
          <Input
            id="email"
            type="email"
            value={customEmail}
            onChange={(e) => setCustomEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Recent Simulations</h4>
        <Button
          onClick={handleClearResults}
          variant="ghost"
          size="sm"
          disabled={simulationResults.length === 0}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {simulationResults.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No simulations run yet</p>
          <p className="text-sm">Run a payment simulation to see results here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {simulationResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg ${
                result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium capitalize">
                    {result.scenario.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.duration}ms
                </div>
              </div>
              {result.error && (
                <div className="mt-2 text-sm text-red-700">
                  {result.error}
                </div>
              )}
              {result.data?.sessionId && (
                <div className="mt-2 text-xs font-mono text-muted-foreground">
                  Session: {result.data.sessionId.slice(0, 20)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-4">
      <h4 className="font-medium flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Test Statistics
      </h4>

      {mockStats.totalAttempts === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No test data yet</p>
          <p className="text-sm">Run some simulations to see statistics</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">
                {mockStats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-green-600">Success Rate</div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">
                {mockStats.failureRate.toFixed(1)}%
              </div>
              <div className="text-sm text-red-600">Failure Rate</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">
                {mockStats.averageDelay.toFixed(0)}ms
              </div>
              <div className="text-sm text-blue-600">Avg Duration</div>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700">
                {mockStats.totalAttempts}
              </div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
          </div>

          {Object.keys(mockStats.scenarioUsage).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scenario Usage</Label>
              <div className="space-y-1">
                {Object.entries(mockStats.scenarioUsage).map(([scenario, count]) => (
                  <div key={scenario} className="flex justify-between text-sm">
                    <span className="capitalize">{scenario.replace(/_/g, ' ')}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Payment Simulator
          <Badge variant="secondary">Development</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="simulate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simulate">Simulate</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="simulate" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Test Cards
                </h3>
                {renderCardSelector()}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Scenarios
                </h3>
                {renderScenarioSelector()}
              </div>
            </div>

            <Separator />

            <div className="flex gap-4">
              <Button
                onClick={handleRunSimulation}
                disabled={isRunning || !selectedCard}
                className="flex-1"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>

              <Button
                onClick={handleRunMultipleTests}
                disabled={isRunning}
                variant="outline"
                size="lg"
              >
                <Zap className="h-4 w-4 mr-2" />
                Batch Test
              </Button>
            </div>

            {selectedCard && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Selected Configuration</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Card:</span> {selectedCard.brand.toUpperCase()} •••• {selectedCard.number.slice(-4)}
                  </div>
                  <div>
                    <span className="text-blue-700">Scenario:</span> {scenarios[selectedScenario]?.name}
                  </div>
                  <div>
                    <span className="text-blue-700">Amount:</span> €{customAmount}
                  </div>
                  <div>
                    <span className="text-blue-700">Expected:</span> {scenarios[selectedScenario]?.outcome.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {renderResults()}
          </TabsContent>

          <TabsContent value="stats">
            {renderStatistics()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
