import { MaterialName, CraftableItem, Inventory, ComprehensiveAnalysisResult } from '../types/data'; // Removed ItemPrice
import { MATERIAL_NAMES, PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { analyzeComprehensiveProfit } from '../logic/comprehensiveCalculator';
import { getItemGradeStyle, getImagePath, getImageBackgroundStyle } from '../logic/grades'; // Updated import
import { Row, Col, Form, Card, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';

type Prices = Partial<Record<MaterialName, number>>;

interface ComprehensiveCalculatorProps {
  apiData: Partial<Record<MaterialName, number>>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  craftFeeDiscount: number;
  onDiscountChange: (value: string) => void;
}

const ComprehensiveCalculator: React.FC<ComprehensiveCalculatorProps> = ({ apiData, isLoading, error, lastUpdated, craftFeeDiscount, onDiscountChange }) => {
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

  const handleFusionPriceChange = (name: CraftableItem, value: string) => {
    setFusionMaterialPrices({
      ...fusionMaterialPrices,
      [name]: parseFloat(value) || 0,
    });
  };

  const runAnalysis = useCallback(() => {
    const fullPrices = PURCHASABLE_MATERIALS.reduce((acc, name) => {
        acc[name] = prices[name] || 0;
        return acc;
    }, {} as Record<MaterialName, number>);

    const allResults: ComprehensiveAnalysisResult[] = RECIPES.map(recipe => {
      return analyzeComprehensiveProfit(
        inventory,
        fullPrices,
        craftFeeDiscount,
        fusionMaterialPrices[recipe.name] || 0,
        recipe.name
      );
    });
    setResults(allResults);
  }, [inventory, prices, craftFeeDiscount, fusionMaterialPrices]); // Dependencies for useCallback

  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      runAnalysis();
    }
  }, [runAnalysis, prices]); // Call runAnalysis whenever its dependencies change

  return (
    <Row> {/* Main Row for two-column layout */}
      <Col md={8}> {/* Left column for input form */}
        <Card>
          <Card.Body>
            <Form> {/* Removed onSubmit={handleSubmit} */}
              <h5 className="card-title text-center mb-4">1. 보유 재료 입력</h5>
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
                              마지막 시세 업데이트: {new Date(lastUpdated).toLocaleString()}
                            </Tooltip>
                          }
                        >
                          <span style={{ cursor: 'help' }}>⏰</span>
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
                          <Form.Control
                          type="number"
                          min="0"
                          step="any"
                          value={prices[name] || ''}
                          onChange={(e) => handlePriceChange(name, e.target.value)}
                          placeholder={isLoading ? "..." : "골드"}
                          disabled={isLoading}
                        />
                      </Form.Group>
                    </Col>
                  );
                })}
              </Row>

              <hr className="my-4" />

              <h5 className="card-title text-center mb-4">3. 추가 정보 입력</h5>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="craftFeeReduction">
                    <Form.Label>제작 수수료 감소율 (%)</Form.Label>
                    <Form.Control
                      type="number"
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
                    <Col md={6} key={`fusionPrice-${recipe.name}`}>
                      <Form.Group className="mb-3" controlId={`fusionPrice-${recipe.name}`}>
                        <Form.Label style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={getImagePath(recipe.name)} alt={recipe.name} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(recipe.name, theme) }} />
                          <span style={{ marginLeft: '8px', color: gradeStyle.color }}>{recipe.name} 시장 가격 (1개당)</span>
                        </Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="any"
                          value={fusionMaterialPrices[recipe.name] || ''}
                          onChange={(e) => handleFusionPriceChange(recipe.name, e.target.value)}
                          placeholder={isLoading ? "..." : "골드"}
                          disabled={isLoading}
                        />
                      </Form.Group>
                    </Col>
                  );
                })}
              </Row>

              </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}> {/* Right column for results */}
        {results && results.map((result, index) => {
          const recipeName = RECIPES[index].name;
          const titleGradeStyle = getItemGradeStyle(recipeName, theme);
          return (
            <div key={index} className="mt-4 p-3" style={{ backgroundColor: 'var(--component-bg)', borderColor: 'var(--border-color)', border: '1px solid' }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <img src={getImagePath(recipeName)} alt={recipeName} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(recipeName, theme) }} />
                <span style={{ marginLeft: '8px', color: titleGradeStyle.color, fontWeight: 'bold' }}>
                  {result.message === '선택된 제작 아이템을 찾을 수 없습니다.' ? '종합 분석 결과' : `${recipeName} 종합 분석 결과`}
                </span>
                {/* Removed recommendation badge */}
              </div>
              <hr />
              {result.recommendation === '오류' ? (
                <p>{result.message}</p>
              ) : (
                <>
                  <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                    <strong>최적 추천:</strong> <strong className="text-primary">{result.recommendation}</strong>
                  </p>
                  <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                    모든 재료 직접 판매 시 총 가치: <strong className="text-warning">{result.totalValueSellAll.toLocaleString()} 골드</strong>
                  </p>
                  <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                    최대 제작 후 판매 시 총 가치: <strong className="text-success">{result.totalValueCraftSell.toLocaleString()} 골드</strong>
                  </p>
                  <p className="mb-2" style={{ color: 'var(--text-color)' }}>
                    최대 제작 후 직접 사용 시 총 가치: <strong className="text-info">{result.totalValueCraftUse.toLocaleString()} 골드</strong>
                  </p>
                  <hr />
                  <p className="mb-0 small" style={{ color: 'var(--text-color)' }}>
                    * 최대 제작 가능 융화재료: {result.maxCraftsPossible / 10}회 ({result.maxCraftsPossible}개)
                  </p>
                  {result.craftSellExchangeSteps.length > 0 && (
                    <div className="mt-2">
                      <h6 className="small" style={{ color: 'var(--text-color)' }}>제작/판매 시 필요 교환:</h6>
                      <ul className="small text-muted">
                        {result.craftSellExchangeSteps.map((step, stepIndex) => (
                          <li key={stepIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                            <img src={getImagePath(step.fromMaterial)} alt={step.fromMaterial} style={{ width: '20px', height: '20px', ...getImageBackgroundStyle(step.fromMaterial, theme) }} />
                            <span style={{ marginLeft: '5px', color: getItemGradeStyle(step.fromMaterial, theme).color }}>{step.fromMaterial} x{step.fromAmount}</span>
                            <span style={{ margin: '0 5px' }}> → </span>
                            <img src={getImagePath(step.toMaterial)} alt={step.toMaterial} style={{ width: '20px', height: '20px', ...getImageBackgroundStyle(step.toMaterial, theme) }} />
                            <span style={{ marginLeft: '5px', color: getItemGradeStyle(step.toMaterial, theme).color }}>{step.toMaterial} x{step.toAmount}</span>
                            <span style={{ marginLeft: '5px', color: 'var(--text-color)' }}> (x{step.count}회)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </Col>
    </Row>
  );
};

export default ComprehensiveCalculator;
