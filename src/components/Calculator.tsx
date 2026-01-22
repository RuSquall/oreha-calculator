import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Card, Spinner, Alert } from 'react-bootstrap';
import { PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { MaterialName, ProfitAnalysisResult, CraftableItem } from '../types/data';
import { analyzeCraftingProfit } from '../logic/calculator';
import { getImagePath, getItemGradeStyle, getImageBackgroundStyle } from '../logic/grades';
import { useTheme } from '../context/ThemeContext';

const Calculator: React.FC = () => {
  const { theme } = useTheme();
  const [materialPrices, setMaterialPrices] = useState<Record<MaterialName, number>>({} as Record<MaterialName, number>);
  const [craftFeeDiscount, setCraftFeeDiscount] = useState<number>(0);
  const [itemPrices, setItemPrices] = useState<Record<CraftableItem, number>>({
    '상급 아비도스 융화 재료': 0,
    '아비도스 융화 재료': 0,
  });
  const [results, setResults] = useState<Record<CraftableItem, ProfitAnalysisResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePriceChange = (name: MaterialName, value: string) => {
    setMaterialPrices(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleItemPriceChange = (name: CraftableItem, value: string) => {
    setItemPrices(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleDiscountChange = (value: string) => {
    setCraftFeeDiscount(Number(value));
  };

  const runAnalysis = useCallback(() => {
    try {
      const superiorResult = analyzeCraftingProfit(materialPrices, craftFeeDiscount, itemPrices['상급 아비도스 융화 재료'], '상급 아비도스 융화 재료');
      const normalResult = analyzeCraftingProfit(materialPrices, craftFeeDiscount, itemPrices['아비도스 융화 재료'], '아비도스 융화 재료');
      
      setResults({
        '상급 아비도스 융화 재료': superiorResult,
        '아비도스 융화 재료': normalResult,
      });
      setError(null);
    } catch (e: any) {
      setError(e.message || '분석 중 오류가 발생했습니다.');
      setResults(null);
    }
  }, [materialPrices, craftFeeDiscount, itemPrices]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const renderResultCard = (itemName: CraftableItem) => {
    const result = results?.[itemName];
    if (!result) return null;

    const isNotRecommended = result.recommendation === '제작 비추천';
    const isError = result.recommendation === '오류';

    return (
      <Col md={6} className="mb-3">
        <Card bg={theme} text={theme === 'dark' ? 'light' : 'dark'} className="h-100">
          <Card.Header as="h5" style={getItemGradeStyle(itemName, theme)} className="d-flex align-items-center">
            <img src={getImagePath(itemName)} alt={itemName} width="30" height="30" className="me-2" style={getImageBackgroundStyle(itemName, theme)} />
            {itemName}
          </Card.Header>
          <Card.Body>
            {isError ? (
              <Alert variant="danger">{result.message}</Alert>
            ) : (
              <>
                <Alert variant={isNotRecommended ? 'danger' : 'success'}>
                  <strong>최적 추천: {result.recommendation}</strong>
                </Alert>
                <p>
                  제작 후 판매 이득: <span className={result.profitFromCraftAndSell >= 0 ? 'text-success' : 'text-danger'}>{result.profitFromCraftAndSell.toLocaleString()}</span> 골드
                </p>
                <p>
                  제작 후 사용 이득: <span className={result.profitFromCraftAndUse >= 0 ? 'text-success' : 'text-danger'}>{result.profitFromCraftAndUse.toLocaleString()}</span> 골드
                </p>
                <hr />
                <small className="text-muted">
                  - 총 제작비: {result.totalCraftingCost.toLocaleString()} 골드<br />
                  - 재료 판매 가치: {result.valueFromSellingMaterials.toLocaleString()} 골드
                </small>
              </>
            )}
          </Card.Body>
        </Card>
      </Col>
    );
  };

  return (
    <Container fluid>
      <Row>
        {/* Inputs Column */}
        <Col md={4}>
          <h5>입력</h5>
          <Card bg={theme} text={theme === 'dark' ? 'light' : 'dark'}>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>제작 수수료 감소율 (%)</Form.Label>
                  <Form.Control type="number" value={craftFeeDiscount} onChange={e => handleDiscountChange(e.target.value)} />
                </Form.Group>
                <hr />
                {RECIPES.map(recipe => (
                  <Form.Group className="mb-3" key={recipe.name}>
                    <Form.Label style={getItemGradeStyle(recipe.name, theme)}>
                      <img src={getImagePath(recipe.name)} alt={recipe.name} width="24" height="24" className="me-2" style={getImageBackgroundStyle(recipe.name, theme)} />
                      {recipe.name} 시장 가격 (1개당)
                    </Form.Label>
                    <Form.Control type="number" value={itemPrices[recipe.name]} onChange={e => handleItemPriceChange(recipe.name, e.target.value)} />
                  </Form.Group>
                ))}
                <hr />
                {PURCHASABLE_MATERIALS.map(name => (
                  <Form.Group className="mb-2" key={name}>
                    <Form.Label style={getItemGradeStyle(name, theme)}>
                      <img src={getImagePath(name)} alt={name} width="24" height="24" className="me-2" style={getImageBackgroundStyle(name, theme)} />
                      {name} (100개당)
                    </Form.Label>
                    <Form.Control type="number" value={materialPrices[name] || ''} onChange={e => handlePriceChange(name, e.target.value)} />
                  </Form.Group>
                ))}
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Results Column */}
        <Col md={8}>
          <h5>분석 결과</h5>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row>
            {results ? (
              <>
                {renderResultCard('상급 아비도스 융화 재료')}
                {renderResultCard('아비도스 융화 재료')}
              </>
            ) : (
              <Col>
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </Col>
            )}
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default Calculator;


// export default Calculator;
