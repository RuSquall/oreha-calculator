import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { MaterialName, CraftableItem, ProfitAnalysisResult } from '../types/data';
import { PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { analyzeCraftingProfit } from '../logic/calculator';

const getImagePath = (itemName: string): string => {
  // 파일명 규칙에 따라 공백을 언더스코어로 변경
  const fileName = itemName.replace(/ /g, '_');
  return `/${fileName}.png`;
};

type Prices = Partial<Record<MaterialName, number>>;

const Calculator = () => {
  const [prices, setPrices] = useState<Prices>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [craftFeeReduction, setCraftFeeReduction] = useState<number>(0);
  const [fusionMaterialPrices, setFusionMaterialPrices] = useState<Partial<Record<CraftableItem, number>>>(
    RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: 0 }), {} as Partial<Record<CraftableItem, number>>)
  );
  const [results, setResults] = useState<ProfitAnalysisResult[] | null>(null);

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
        setPrices({}); // 에러 발생 시 가격 정보 초기화
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, []); // 컴포넌트 마운트 시 1회만 실행

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
    // Ensure all purchasable materials have a price, even if it's 0
    const fullPrices = PURCHASABLE_MATERIALS.reduce((acc, name) => {
        acc[name] = prices[name] || 0;
        return acc;
    }, {} as Record<MaterialName, number>);

    const allResults: ProfitAnalysisResult[] = RECIPES.map(recipe => {
      return analyzeCraftingProfit(
        fullPrices,
        craftFeeReduction,
        fusionMaterialPrices[recipe.name] || 0, // Pass specific fusion material price
        recipe.name // Iterate through all recipes
      );
    });
    setResults(allResults); // Set array of results
  };

  return (
    <>
      <Card>
        <Card.Body>
          <div className="text-center mb-4">
            <Card.Title as="h3" className="d-inline-block me-2 mb-0">1. 재료 시세 입력 (100개당)</Card.Title>
            {isLoading && <Spinner animation="border" size="sm" />}
          </div>

          {error && <Alert variant="danger">오류: {error}</Alert>}
          
          {lastUpdated && !isLoading && !error && (
            <Alert variant="info" className="text-center py-2">
              마지막 업데이트: {new Date(lastUpdated).toLocaleString()}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Row>
              {PURCHASABLE_MATERIALS.map((name) => (
                <Col md={6} key={name}>
                  <Form.Group className="mb-3" controlId={`price-${name}`}>
                    <Form.Label>
                      <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                      {name}
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

            <Card.Title as="h3" className="text-center mb-4">2. 추가 정보 입력</Card.Title>
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
                      <img src={getImagePath(recipe.name)} alt={recipe.name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                      {recipe.name} 시장 가격 (1개당)
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
                수익성 분석
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {results && results.map((result, index) => (
        <Alert key={index} variant={result.recommendation === '오류' ? 'danger' : 'success'} className="mt-4">
          <Alert.Heading>{result.message === '선택된 제작 아이템을 찾을 수 없습니다.' ? '분석 결과' : `${result.message || result.recommendation} 분석 결과`}</Alert.Heading>
          <hr />
          {result.recommendation === '오류' ? (
            <p>{result.message}</p>
          ) : (
            <>
              <h5 className="mb-3">**{RECIPES[index].name}**</h5>
              <p className="mb-2">
                **추천:** <strong className="text-primary">{result.recommendation}</strong>
              </p>
              <p className="mb-2">
                제작 후 판매 시 예상 수익: <strong className="text-success">{result.profitFromCraftAndSell.toLocaleString()} 골드</strong> (10개 제작 기준)
              </p>
              <p className="mb-2">
                직접 사용 시 절약 비용: <strong className="text-info">{result.savingsFromCraftAndUse.toLocaleString()} 골드</strong> (10개 제작 기준)
              </p>
              <p className="mb-2">
                재료 직접 판매 시 가치: <strong className="text-warning">{result.valueFromSellingMaterials.toLocaleString()} 골드</strong> (10개 제작에 필요한 재료 기준)
              </p>
              <hr />
              <p className="mb-0 text-muted small">
                * 제작 비용: {result.totalCraftingCost.toLocaleString()} 골드 (재료비 + 수수료)
              </p>
              <h6 className="mt-3">재료별 최적 수급 방법 (10개 제작 기준):</h6>
              <ul>
                {result.materialCostBreakdown?.map((item, matIndex) => (
                  <li key={matIndex} className="small text-muted">
                    <img src={getImagePath(item.name)} alt={item.name} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                    {item.name}: {item.requiredAmount}개 (단가: {item.unitCost.toLocaleString()} 골드, 총: {item.totalCost.toLocaleString()} 골드) - {item.source}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Alert>
      ))}
    </>
  );
};

export default Calculator;
