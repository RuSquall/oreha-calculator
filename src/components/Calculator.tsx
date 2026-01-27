import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { MaterialName, ProfitAnalysisResult, CraftableItem } from '../types/data';
import { analyzeCraftingProfit } from '../logic/calculator';
import { getImagePath, getItemGradeStyle, getImageBackgroundStyle } from '../logic/grades';
import { useTheme } from '../context/ThemeContext';

interface CalculatorProps {
  apiData: Partial<Record<MaterialName, number>>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  craftFeeDiscount: number;
  onDiscountChange: (value: string) => void;
}

const Calculator: React.FC<CalculatorProps> = ({ apiData, isLoading, error, lastUpdated, craftFeeDiscount, onDiscountChange }) => {
  const { theme } = useTheme();
  const [materialPrices, setMaterialPrices] = useState<Record<MaterialName, number>>({} as Record<MaterialName, number>);
  const [itemPrices, setItemPrices] = useState<Record<CraftableItem, number>>({
    '상급 아비도스 융화 재료': 0,
    '아비도스 융화 재료': 0,
  });
  const [results, setResults] = useState<Record<CraftableItem, ProfitAnalysisResult> | null>(null);

  useEffect(() => {
    if (Object.keys(apiData).length > 0) {
      const newMaterialPrices: Record<MaterialName, number> = {} as Record<MaterialName, number>;
      const newItemPrices: Record<CraftableItem, number> = {} as Record<CraftableItem, number>;

      PURCHASABLE_MATERIALS.forEach(name => {
        newMaterialPrices[name] = apiData[name] !== undefined ? apiData[name]! : 0;
      });

      RECIPES.forEach(recipe => {
        const materialName = recipe.name as MaterialName;
        newItemPrices[recipe.name] = apiData[materialName] !== undefined ? apiData[materialName]! : 0;
      });
      
      setMaterialPrices(newMaterialPrices);
      setItemPrices(newItemPrices);
    }
  }, [apiData]);

  const handlePriceChange = (name: MaterialName, value: string) => {
    setMaterialPrices(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleItemPriceChange = (name: CraftableItem, value: string) => {
    setItemPrices(prev => ({ ...prev, [name]: Number(value) }));
  };

  const runAnalysis = useCallback(() => {
    try {
      const superiorResult = analyzeCraftingProfit(materialPrices, craftFeeDiscount, itemPrices['상급 아비도스 융화 재료'], '상급 아비도스 융화 재료');
      const normalResult = analyzeCraftingProfit(materialPrices, craftFeeDiscount, itemPrices['아비도스 융화 재료'], '아비도스 융화 재료');
      
      setResults({
        '상급 아비도스 융화 재료': superiorResult,
        '아비도스 융화 재료': normalResult,
      });
    } catch (e: any) {
      // setError(e.message || '분석 중 오류가 발생했습니다.');
      setResults(null);
    }
  }, [materialPrices, craftFeeDiscount, itemPrices]);

  useEffect(() => {
    // Don't run analysis if prices are not loaded yet
    if (Object.keys(materialPrices).length > 0 && Object.keys(itemPrices).length > 0) {
      runAnalysis();
    }
  }, [runAnalysis, materialPrices, itemPrices]);

  const formatProfit = (profit: number) => {
    const sign = profit > 0 ? '+' : '';
    return `${sign}${profit.toLocaleString()}`;
  };

  return (
    <Container fluid>
      {/* Row 1: Core Input & Results */}
      <Row className="align-items-center justify-content-center text-center mb-3">
        <Col md={3}>
          <Form.Group>
            <Form.Label style={{ color: 'var(--text-color)' }}>
              제작 수수료 감소율 (%)
              <span className="ms-2">
                {isLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  lastUpdated && (
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id="update-time-tooltip">
                          마지막 시세 업데이트: {new Date(lastUpdated).toLocaleString()}
                        </Tooltip>
                      }
                    >
                      <span style={{ cursor: 'help' }}>⏰</span>
                    </OverlayTrigger>
                  )
                )}
              </span>
            </Form.Label>
            <Form.Control type="number" value={craftFeeDiscount} onChange={e => onDiscountChange(e.target.value)} placeholder="예: 15" />
          </Form.Group>
        </Col>
        
        {RECIPES.map(({ name }) => {
          const result = results?.[name];
          return (
            <Col md={4} key={name} className="mt-3 mt-md-0">
              <div style={{...getItemGradeStyle(name, theme), display: 'block', padding: '0.5rem', border: `1px solid var(--border-color)`, borderRadius: '0.25rem'}}>
                <h6 className="mb-2 d-flex align-items-center justify-content-center">
                  <img src={getImagePath(name)} alt={name} width="24" height="24" className="me-2" style={getImageBackgroundStyle(name, theme)} />
                  {name}
                </h6>
                {result && !isLoading ? (
                  <>
                    <p className="mb-1 small">판매 이득: <strong className={result.profitFromCraftAndSell >= 0 ? 'text-success' : 'text-danger'}>{formatProfit(result.profitFromCraftAndSell)} G</strong></p>
                    <p className="mb-0 small">사용 이득: <strong className={result.profitFromCraftAndUse >= 0 ? 'text-success' : 'text-danger'}>{formatProfit(result.profitFromCraftAndUse)} G</strong></p>
                  </>
                ) : (
                  <Spinner animation="border" size="sm" />
                )}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* API Status (Error only) */}
      <Row className="justify-content-center my-2">
          <Col md={8}>
            {error && <Alert variant="danger" className="py-1 text-center">오류: {error}</Alert>}
          </Col>
      </Row>

      {/* Row 2: Price Inputs */}
      <Row className="g-2">
        {[...RECIPES.map(r => r.name), ...PURCHASABLE_MATERIALS].map(name => (
          <Col xs={6} sm={6} md={4} lg key={name}>
            <Form.Group>
              <Form.Label style={getItemGradeStyle(name, theme)} className="small w-100">
                <img src={getImagePath(name as MaterialName)} alt={name} width="16" height="16" className="me-1" style={getImageBackgroundStyle(name as MaterialName, theme)} />
                {name.replace(' 융화 재료', '')}
              </Form.Label>
              <Form.Control
                type="number"
                size="sm"
                value={
                  isLoading // 로딩 중일 때
                  ? '' // 값을 빈 문자열로 설정하여 플레이스홀더가 보이도록 함
                  : (itemPrices as Record<string, number>)[name] !== undefined 
                    ? (itemPrices as Record<string, number>)[name]
                    : (materialPrices as Record<string, number>)[name] || ''
                }
                onChange={e => {
                  if ((itemPrices as Record<string, number>)[name] !== undefined) {
                    handleItemPriceChange(name as CraftableItem, e.target.value)
                  } else {
                    handlePriceChange(name as MaterialName, e.target.value)
                  }
                }}
                placeholder={isLoading ? "..." : "골드"}
                disabled={isLoading}
              />
            </Form.Group>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default Calculator;
