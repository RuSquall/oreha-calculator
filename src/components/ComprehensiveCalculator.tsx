import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { MaterialName, CraftableItem, Inventory, ComprehensiveAnalysisResult } from '../types/data';
import { MATERIAL_NAMES, PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { analyzeComprehensiveProfit } from '../logic/comprehensiveCalculator';
import { getItemGradeStyle } from '../logic/grades';

const getImagePath = (itemName: string): string => {
  // 파일명 규칙에 따라 공백을 언더스코어로 변경
  const fileName = itemName.replace(/ /g, '_');
  return `/${fileName}.png`;
};

type Prices = Partial<Record<MaterialName, number>>;

const ComprehensiveCalculator = () => {
  const [inventory, setInventory] = useState<Inventory>(
    MATERIAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Inventory)
  );
  
  const [prices, setPrices] = useState<Prices>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [craftFeeReduction, setCraftFeeReduction] = useState<number>(0);
  const [fusionMaterialPrices, setFusionMaterialPrices] = useState<Partial<Record<CraftableItem, number>>>(
    RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: 0 }), {} as Partial<Record<CraftableItem, number>>)
  );
  const [results, setResults] = useState<ComprehensiveAnalysisResult[] | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/.netlify/functions/getPrices');
        if (!response.ok) {
          throw new Error('서버에서 가격 정보를 가져오는 데 실패했습니다.');
        }
        const data = await response.json();
        setPrices(data.prices || {});
        setLastUpdated(data.lastUpdated);
        // Set initial fusion material prices from fetched data if available
        const initialFusionPrices: Partial<Record<CraftableItem, number>> = {};
        RECIPES.forEach(recipe => {
          if (data.prices[recipe.name]) {
            initialFusionPrices[recipe.name] = data.prices[recipe.name];
          } else {
            initialFusionPrices[recipe.name] = 0;
          }
        });
        setFusionMaterialPrices(initialFusionPrices);
      } catch (err: any) {
        setError(err.message);
        setPrices({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, []);

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullPrices = PURCHASABLE_MATERIALS.reduce((acc, name) => {
        acc[name] = prices[name] || 0;
        return acc;
    }, {} as Record<MaterialName, number>);

    const allResults: ComprehensiveAnalysisResult[] = RECIPES.map(recipe => {
      return analyzeComprehensiveProfit(
        inventory,
        fullPrices,
        craftFeeReduction,
        fusionMaterialPrices[recipe.name] || 0, // Pass specific fusion material price
        recipe.name // Iterate through all recipes
      );
    });
    setResults(allResults);
  };

  return (
    <Card>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <h5 className="card-title text-center mb-4">1. 보유 재료 입력</h5>
          <Row>
            {MATERIAL_NAMES.map((name) => (
              <Col md={6} key={`inv-${name}`}>
                  <Form.Group className="mb-3" controlId={`inventory-${name}`}>
                    <Form.Label>
                      <span style={getItemGradeStyle(name)}>
                        <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                        {name}
                      </span>
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
            ))}
          </Row>

          <hr className="my-4" />

          <div className="text-center mb-4">
            <h5 className="card-title d-inline-block me-2 mb-0">2. 재료 시세 입력 (100개당)</h5>
            {isLoading && <Spinner animation="border" size="sm" />}
          </div>

          {error && <Alert variant="danger">오류: {error}</Alert>}
          
          {lastUpdated && !isLoading && !error && (
            <Alert variant="info" className="text-center py-2">
              마지막 업데이트: {new Date(lastUpdated).toLocaleString()}
            </Alert>
          )}
          
          <Row>
              {PURCHASABLE_MATERIALS.map((name) => (
                <Col md={6} key={`price-${name}`}>
                  <Form.Group className="mb-3" controlId={`price-${name}`}>
                    <Form.Label>
                      <span style={getItemGradeStyle(name)}>
                        <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                        {name}
                      </span>
                    </Form.Label>
                    <Form.Control
                    type="number"
                    min="0"
                    step="any"
                    value={prices[name] || ''}
                    onChange={(e) => handlePriceChange(name, e.target.value)}
                    placeholder={isLoading ? "불러오는 중..." : "골드"}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
            ))}
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
                  value={craftFeeReduction === 0 ? '' : craftFeeReduction}
                  onChange={(e) => setCraftFeeReduction(parseFloat(e.target.value) || 0)}
                  placeholder="예: 15"
                />
              </Form.Group>
            </Col>
            {RECIPES.map(recipe => (
              <Col md={6} key={`fusionPrice-${recipe.name}`}>
                <Form.Group className="mb-3" controlId={`fusionPrice-${recipe.name}`}>
                  <Form.Label>
                    <span style={getItemGradeStyle(recipe.name)}>
                      <img src={getImagePath(recipe.name)} alt={recipe.name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                      {recipe.name} 시장 가격 (1개당)
                    </span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="any"
                    value={fusionMaterialPrices[recipe.name] || ''}
                    onChange={(e) => handleFusionPriceChange(recipe.name, e.target.value)}
                    placeholder="골드"
                  />
                </Form.Group>
              </Col>
            ))}
          </Row>

          <div className="d-grid mt-4">
            <Button variant="primary" size="lg" type="submit">
              종합 분석
            </Button>
          </div>
        </Form>

        {results && results.map((result, index) => (
          <Alert key={index} variant={result.recommendation === '오류' ? 'danger' : 'success'} className="mt-4">
            <Alert.Heading>{result.message === '선택된 제작 아이템을 찾을 수 없습니다.' ? '종합 분석 결과' : `${RECIPES[index].name} 종합 분석 결과`}</Alert.Heading>
            <hr />
            {result.recommendation === '오류' ? (
              <p>{result.message}</p>
            ) : (
              <>
                <h5 className="mb-3">**{RECIPES[index].name}**</h5>
                <p className="mb-2">
                  **최적 추천:** <strong className="text-primary">{result.recommendation}</strong>
                </p>
                <p className="mb-2">
                  모든 재료 직접 판매 시 총 가치: <strong className="text-warning">{result.totalValueSellAll.toLocaleString()} 골드</strong>
                </p>
                <p className="mb-2">
                  최대 제작 후 판매 시 총 가치: <strong className="text-success">{result.totalValueCraftSell.toLocaleString()} 골드</strong>
                </p>
                <p className="mb-2">
                  최대 제작 후 직접 사용 시 총 가치: <strong className="text-info">{result.totalValueCraftUse.toLocaleString()} 골드</strong>
                </p>
                <hr />
                <p className="mb-0 text-muted small">
                  * 최대 제작 가능 융화재료: {result.maxCraftsPossible / 10}회 ({result.maxCraftsPossible}개)
                </p>
                {result.craftSellExchangeSteps.length > 0 && (
                  <div className="mt-2">
                    <h6 className="text-muted small">제작/판매 시 필요 교환:</h6>
                    <ul className="small text-muted">
                      {result.craftSellExchangeSteps.map((step, stepIndex) => (
                        <li key={stepIndex}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Alert>
        ))}
      </Card.Body>
    </Card>
  );
};

export default ComprehensiveCalculator;
