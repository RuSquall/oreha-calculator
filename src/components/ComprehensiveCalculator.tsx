import { MaterialName, CraftableItem, Inventory, ComprehensiveAnalysisResult } from '../types/data'; // Removed ItemPrice
import { MATERIAL_NAMES, PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { analyzeComprehensiveProfit } from '../logic/comprehensiveCalculator';
import { getItemGradeStyle, getImagePath, getImageBackgroundStyle } from '../logic/grades'; // Updated import
import { Row, Col, Form, Card, Spinner, Alert, OverlayTrigger, Tooltip, InputGroup, Button } from 'react-bootstrap';
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

type Prices = Partial<Record<MaterialName, number>>;

interface ComprehensiveCalculatorProps {
  apiData: Partial<Record<MaterialName, number>>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isCached?: boolean;
  craftFeeDiscount: number;
  onDiscountChange: (value: string) => void;
  onRefresh?: () => void;
}

const ComprehensiveCalculator: React.FC<ComprehensiveCalculatorProps> = ({ apiData, isLoading, error, lastUpdated, isCached, craftFeeDiscount, onDiscountChange, onRefresh }) => {
  const { theme } = useTheme();
  const [inventory, setInventory] = useState<Inventory>(
    MATERIAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Inventory)
  );
  
  const [prices, setPrices] = useState<Prices>({});
  
  const [fusionMaterialPrices, setFusionMaterialPrices] = useState<Partial<Record<CraftableItem, number>>>(
    RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: 0 }), {} as Partial<Record<CraftableItem, number>>)
  );
  const [results, setResults] = useState<ComprehensiveAnalysisResult[] | null>(null);

  useEffect(() => {
    if (Object.keys(apiData).length > 0) {
      const newPrices: Prices = {};
      for (const materialName in apiData) {
        if (apiData.hasOwnProperty(materialName)) {
          const typedMaterialName = materialName as MaterialName;
          if (apiData[typedMaterialName] !== undefined) {
            newPrices[typedMaterialName] = apiData[typedMaterialName]!;
          }
        }
      }
      setPrices(newPrices);

      const initialFusionPrices: Partial<Record<CraftableItem, number>> = {};
      RECIPES.forEach(recipe => {
        if (newPrices[recipe.name as MaterialName] !== undefined) {
          initialFusionPrices[recipe.name] = newPrices[recipe.name as MaterialName]!;
        } else {
          initialFusionPrices[recipe.name] = 0;
        }
      });
      setFusionMaterialPrices(initialFusionPrices);
    }
  }, [apiData]);

  const handleInventoryChange = (name: MaterialName, value: string) => {
    setInventory({
      ...inventory,
      [name]: parseInt(value, 10) || 0,
    });
  };

  const handlePriceChange = (name: MaterialName, value: string) => {
    setPrices({
      ...prices,
      [name]: parseFloat(value) || 0,
    });
  };

  const handleResetInventory = () => {
    setInventory(MATERIAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Inventory));
  };

  const handleFusionPriceChange = (name: CraftableItem, value: string) => {
    setFusionMaterialPrices({
      ...fusionMaterialPrices,
      [name]: parseFloat(value) || 0,
    });
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    // Simulate a small delay for better UX if it's too fast, 
    // and to prepare for future network calls.
    await new Promise(resolve => setTimeout(resolve, 300));

    const fullPrices = PURCHASABLE_MATERIALS.reduce((acc, name) => {
        acc[name] = prices[name] || 0;
        return acc;
    }, {} as Record<MaterialName, number>);

    const allResults: Promise<ComprehensiveAnalysisResult>[] = RECIPES.map(async recipe => {
      return analyzeComprehensiveProfit(
        inventory,
        fullPrices,
        craftFeeDiscount,
        fusionMaterialPrices[recipe.name] || 0,
        recipe.name
      );
    });
    setResults(await Promise.all(allResults));
    setIsAnalyzing(false);
  }, [inventory, prices, craftFeeDiscount, fusionMaterialPrices]);

  // Removed: Auto-run on price/inventory changes
  /*
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      runAnalysis();
    }
  }, [runAnalysis, prices]);
  */

  const resultTooltip = (
    <Tooltip id="result-calculation-tooltip" style={{ maxWidth: '1000px' }}>
      <div style={{ textAlign: 'left' }}>
        <strong>• 직접 판매:</strong> 보유 재료를 경매장에 모두 팔았을 때의 기대 수익 (수수료 5% 포함)<br/>
        <strong>• 제작 후 판매:</strong> 재료를 최적의 경로로 교환/제작하여 팔았을 때의 기대 수익 (수수료 5% 포함)<br/>
        <strong>• 제작 후 사용:</strong> 제작한 아이템을 직접 사용할 때, 경매장 구매 대비 절약되는 총 가치
      </div>
    </Tooltip>
  );

  return (
    <Row> {/* Main Row for two-column layout */}
      <Col md={8}> {/* Left column for input form */}
        <Card>
          <Card.Body>
            <Form> {/* Removed onSubmit={handleSubmit} */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div style={{ width: '60px' }}></div> {/* Spacer for symmetry */}
                <h5 className="card-title mb-0">1. 보유 재료 입력</h5>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handleResetInventory}
                  title="모든 보유 수량을 0으로 초기화합니다."
                  style={{ fontSize: '1rem', padding: '0.2rem 0.5rem' }}
                >
                  초기화
                </Button>
              </div>
              <Row>
                {MATERIAL_NAMES.map((name) => {
                  const gradeStyle = getItemGradeStyle(name, theme);
                  return (
                    <Col xs={6} sm={6} md={4} lg={3} key={`inv-${name}`}>
                        <Form.Group className="mb-3" controlId={`inventory-${name}`}>
                          <Form.Label style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(name, theme) }} />
                            <span style={{ marginLeft: '8px', color: gradeStyle.color }}>{name}</span>
                          </Form.Label>
                          <Form.Control
                          type="number"
                          min="0"
                          step="1"
                          value={inventory[name] === 0 ? '' : inventory[name]}
                          onChange={(e) => handleInventoryChange(name, e.target.value)}
                          placeholder="보유 수량"
                        />
                      </Form.Group>
                    </Col>
                  );
                })}
              </Row>

              <hr className="my-4" />

              <div className="text-center mb-4">
                <h5 className="card-title d-inline-block me-2 mb-0">
                  2. 재료 시세 입력 (100개당)
                  <span className="ms-2">
                    {isLoading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      lastUpdated && (
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id="update-time-tooltip-comprehensive">
                          <div style={{ textAlign: 'left' }}>
                            <div>마지막 시세 업데이트: {new Date(lastUpdated).toLocaleString()}</div>
                            {isCached && <div style={{ marginTop: '4px', color: '#ffeb3b', fontWeight: 'bold' }}>⚠️ 캐시된 시세를 표시 중입니다</div>}
                            <div style={{ marginTop: '4px', fontSize: '0.8em', opacity: 0.8 }}>아이콘을 클릭하여 시세를 새로고침합니다.</div>
                          </div>
                        </Tooltip>
                      }
                    >
                      <span 
                        onClick={onRefresh}
                        style={{
                          cursor: onRefresh ? 'pointer' : 'help',
                          background: isCached ? 'linear-gradient(135deg,#8b4513,#a0522d)' : 'linear-gradient(135deg,#261331,#480d5d)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          verticalAlign: 'middle',
                          borderRadius: '4px'
                        }}
                      >
                        <img src="/시간.png" alt="업데이트 시간" style={{ width: '100%', height: '100%' }} />
                      </span>
                    </OverlayTrigger>
                  )
                )}
                  </span>
                </h5>
              </div>

              {error && <Alert variant="danger">오류: {error}</Alert>}
              
              <Row>
                  {PURCHASABLE_MATERIALS.map((name) => {
                    const gradeStyle = getItemGradeStyle(name, theme);
                    return (
                      <Col xs={6} sm={6} md={4} lg={3} key={`price-${name}`}>
                        <Form.Group className="mb-3" controlId={`price-${name}`}>
                          <Form.Label style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(name, theme) }} />
                            <span style={{ marginLeft: '8px', color: gradeStyle.color }}>{name}</span>
                          </Form.Label>
                          <InputGroup size="sm">
                            <Form.Control
                              type="number"
                              min="0"
                              step="any"
                              value={prices[name] || ''}
                              onChange={(e) => handlePriceChange(name, e.target.value)}
                              placeholder={isLoading ? "..." : "골드"}
                              disabled={isLoading}
                            />
                            <InputGroup.Text style={{ backgroundColor: 'var(--component-bg)', borderColor: 'var(--border-color)' }}>
                              <img src="/gold.png" alt="골드" style={{ width: '16px', height: '16px', marginLeft: '4px' }} />
                            </InputGroup.Text>
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    );
                  })}
              </Row>

              <hr className="my-4" />

              <h5 className="card-title text-center mb-4">3. 추가 정보 입력</h5>
              <Row>
                <Col xs={6} sm={6} md={4}> {/* Changed from md={6} */}
                  <Form.Group className="mb-3" controlId="craftFeeReduction">
                    <Form.Label>제작 수수료 감소율 (%)</Form.Label>
                    <Form.Control
                      type="number"
                      size="sm" // Added size="sm"
                      min="0"
                      max="100"
                      step="any"
                      value={craftFeeDiscount === 0 ? '' : craftFeeDiscount}
                      onChange={(e) => onDiscountChange(e.target.value)}
                      placeholder="예: 15"
                    />
                  </Form.Group>
                </Col>
                {RECIPES.map(recipe => {
                  const gradeStyle = getItemGradeStyle(recipe.name, theme);
                  return (
                    <Col xs={6} sm={6} md={4} key={`fusionPrice-${recipe.name}`}> {/* Changed from md={6} */}
                      <Form.Group className="mb-3" controlId={`fusionPrice-${recipe.name}`}>
                        <Form.Label style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={getImagePath(recipe.name)} alt={recipe.name} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(recipe.name, theme) }} />
                          <span style={{ marginLeft: '8px', color: gradeStyle.color }}>{recipe.name}</span>
                        </Form.Label>
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            min="0"
                            step="any"
                            value={fusionMaterialPrices[recipe.name] || ''}
                            onChange={(e) => handleFusionPriceChange(recipe.name, e.target.value)}
                            placeholder="골드"
                          />
                          <InputGroup.Text style={{ backgroundColor: 'var(--component-bg)', borderColor: 'var(--border-color)' }}>
                            <img src="/gold.png" alt="골드" style={{ width: '16px', height: '16px', marginLeft: '4px' }} />
                          </InputGroup.Text>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  );
                })}
              </Row>

              <div className="d-grid mt-4">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={runAnalysis}
                  disabled={isAnalyzing || isLoading}
                >
                  {isAnalyzing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      분석 중...
                    </>
                  ) : '종합 분석 실행'}
                </Button>
              </div>

              </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}> {/* Right column for results */}
        {results && results.map((result, index) => {
          const recipeName = RECIPES[index].name;
          const titleGradeStyle = getItemGradeStyle(recipeName, theme);
          return (
            <Card key={index} className={index > 0 ? 'mt-3' : ''}>
              <Card.Body>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <img src={getImagePath(recipeName)} alt={recipeName} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(recipeName, theme) }} />
                  <span style={{ marginLeft: '8px', color: titleGradeStyle.color, fontWeight: 'bold' }}>
                    {result.message === '선택된 제작 아이템을 찾을 수 없습니다.' ? '종합 분석 결과' : `${recipeName} 종합 분석 결과`}
                  </span>
                  <OverlayTrigger placement="top" overlay={resultTooltip}>
                    <img 
                      src="/qm_1b1.png" 
                      alt="산출 방식 도움말" 
                      style={{ width: '18px', height: '18px', cursor: 'help', verticalAlign: 'middle', marginBottom: '3px' }} 
                      className="ms-1" 
                    />
                  </OverlayTrigger>
                </div>
                <hr />
                {result.recommendation === '오류' ? (
                  <p>{result.message}</p>
                ) : (
                  <>
                    <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                      <strong>직접 판매:</strong> <strong className="text-warning">{result.totalValueSellAll.toLocaleString()} G</strong>
                    </p>
                    <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                      <strong>제작 후 판매:</strong> <strong className="text-success">{result.totalValueCraftSell.toLocaleString()} G</strong>
                      <span className="ms-2 small" style={{ color: result.totalValueCraftSell >= result.totalValueSellAll ? '#28a745' : '#dc3545' }}>
                        ({(result.totalValueCraftSell - result.totalValueSellAll) > 0 ? '+' : ''}{(result.totalValueCraftSell - result.totalValueSellAll).toLocaleString()} G,  {' '}
                        {result.totalValueSellAll > 0 ? (((result.totalValueCraftSell - result.totalValueSellAll) / result.totalValueSellAll) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </p>
                    <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                      <strong>제작 후 사용:</strong> <strong className="text-info">{result.totalValueCraftUse.toLocaleString()} G</strong>
                      <span className="ms-2 small" style={{ color: result.totalValueCraftUse >= result.totalValueSellAll ? '#17a2b8' : '#dc3545' }}>
                        ({(result.totalValueCraftUse - result.totalValueSellAll) > 0 ? '+' : ''}{(result.totalValueCraftUse - result.totalValueSellAll).toLocaleString()} G,  {' '}
                        {result.totalValueSellAll > 0 ? (((result.totalValueCraftUse - result.totalValueSellAll) / result.totalValueSellAll) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </p>
                    <hr />
                    <p className="mb-0 small" style={{ color: 'var(--text-color)' }}>
                      최대 제작 시 {result.maxCraftsPossible / 10}회({result.maxCraftsPossible}개)
                    </p>
                    {result.craftSellExchangeSteps.length > 0 && (
                      <div className="mt-2">
                        <ul className="small text-muted" style={{ paddingLeft: '0', listStyleType: 'none' }}>
                          {result.craftSellExchangeSteps.map((step, stepIndex) => (
                            <li key={stepIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', fontSize: '1.1rem' }}>
                              {/* From Material Group */}
                              <div style={{ display: 'flex', alignItems: 'center', width: '85px' }}>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip id={`tooltip-from-${stepIndex}`}>{step.fromMaterial}</Tooltip>}
                                >
                                  <img src={getImagePath(step.fromMaterial)} alt={step.fromMaterial} style={{ width: '32px', height: '32px', ...getImageBackgroundStyle(step.fromMaterial, theme) }} />
                                </OverlayTrigger>
                                <span style={{ marginLeft: '6px', color: getItemGradeStyle(step.fromMaterial, theme).color, fontWeight: 'bold', flex: 1 }}>x{step.fromAmount}</span>
                              </div>

                              {/* Strong Arrow */}
                              <span style={{ margin: '0 12px', color: '#ffc107', fontWeight: '900', fontSize: '1.4rem' }}> → </span>

                              {/* To Material Group */}
                              <div style={{ display: 'flex', alignItems: 'center', width: '80px' }}>
                                <OverlayTrigger
                                  placement="top"
                                  overlay={<Tooltip id={`tooltip-to-${stepIndex}`}>{step.toMaterial}</Tooltip>}
                                >
                                  <img src={getImagePath(step.toMaterial)} alt={step.toMaterial} style={{ width: '32px', height: '32px', ...getImageBackgroundStyle(step.toMaterial, theme) }} />
                                </OverlayTrigger>
                                <span style={{ marginLeft: '6px', color: getItemGradeStyle(step.toMaterial, theme).color, fontWeight: 'bold', flex: 1 }}>x{step.toAmount}</span>
                              </div>

                              {/* Count Info */}
                              <span style={{ 
                                marginLeft: '12px', 
                                color: 'var(--text-color)', 
                                fontSize: '1rem', 
                                fontWeight: 'bold',
                                backgroundColor: 'var(--component-bg)', 
                                padding: '3px 10px', 
                                borderRadius: '12px', 
                                border: '1px solid #ffc107',
                                boxShadow: '0 0 5px rgba(255, 193, 7, 0.2)'
                              }}>
                                {step.count}회
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </Col>
    </Row>
  );
};

export default ComprehensiveCalculator;
