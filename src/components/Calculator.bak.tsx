import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Card, Spinner, Alert } from 'react-bootstrap';
import { PURCHASABLE_MATERIALS, RECIPES } from '../logic/constants';
import { MaterialName, ProfitAnalysisResult, CraftableItem } from '../types/data'; // ItemPrice removed
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
  // New states for API fetching
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // useEffect to fetch prices on component mount
  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/.netlify/functions/getPrices');
        if (!response.ok) {
          throw new Error('서버에서 가격 정보를 가져오는 데 실패했습니다.');
        }
        const responseData = await response.json();
        console.log('API Raw Response Data:', responseData); // Log 1
        // Corrected type for apiData: it's a map of MaterialName to number, not ItemPrice object
        const apiData: Partial<Record<MaterialName, number>> = responseData.prices || {}; 
        console.log('API Parsed Data (apiData):', apiData); // Log 2
        
        const newMaterialPrices: Record<MaterialName, number> = {} as Record<MaterialName, number>;
        const newItemPrices: Record<CraftableItem, number> = {} as Record<CraftableItem, number>;

        // Populate materialPrices
        PURCHASABLE_MATERIALS.forEach(name => {
          if (apiData[name] !== undefined) { // Check if price exists
            newMaterialPrices[name] = apiData[name]!; // Directly assign the number price
          } else {
            newMaterialPrices[name] = 0; // Default to 0 if not found
          }
        });

        // Populate itemPrices (fusion materials)
        RECIPES.forEach(recipe => {
          const materialName = recipe.name as MaterialName; // Cast to MaterialName for apiData access
          if (apiData[materialName] !== undefined) { // Check if price exists
            newItemPrices[recipe.name] = apiData[materialName]!; // Directly assign the number price
          } else {
            newItemPrices[recipe.name] = 0; // Default to 0
          }
        });
        
        console.log('New Material Prices:', newMaterialPrices); // Log 3
        console.log('New Item Prices (Fusion Materials):', newItemPrices); // Log 4
        setMaterialPrices(newMaterialPrices);
        setItemPrices(newItemPrices);
        console.log('Last Updated Time:', responseData.lastUpdated); // Log 5
        setLastUpdated(responseData.lastUpdated); // Adjusted to use responseData.lastUpdated

      } catch (err: any) {
        setError(err.message);
        setMaterialPrices({} as Record<MaterialName, number>); // Reset on error
        setItemPrices({
          '상급 아비도스 융화 재료': 0,
          '아비도스 융화 재료': 0,
        }); // Reset on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, []); // Empty dependency array means this runs once on mount

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
              {/* New UI for loading/error/last updated */}
              {isLoading && <Spinner animation="border" size="sm" />}
              {error && <Alert variant="danger">오류: {error}</Alert>}
              {lastUpdated && !isLoading && !error && (
                <Alert variant="info" className="text-center py-2">
                  마지막 업데이트: {new Date(lastUpdated).toLocaleString()}
                </Alert>
              )}
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
                    <Form.Control
                      type="number"
                      value={itemPrices[recipe.name] || ''} // Use itemPrices
                      onChange={e => handleItemPriceChange(recipe.name, e.target.value)}
                      placeholder={isLoading ? "불러오는 중..." : "골드"} // Add placeholder
                      disabled={isLoading} // Disable while loading
                    />
                  </Form.Group>
                ))}
                <hr />
                {PURCHASABLE_MATERIALS.map(name => (
                  <Form.Group className="mb-2" key={name}>
                    <Form.Label style={getItemGradeStyle(name, theme)}>
                      <img src={getImagePath(name)} alt={name} width="24" height="24" className="me-2" style={getImageBackgroundStyle(name, theme)} />
                      {name} (100개당)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      value={materialPrices[name] || ''} // Use materialPrices
                      onChange={e => handlePriceChange(name, e.target.value)}
                      placeholder={isLoading ? "불러오는 중..." : "골드"} // Add placeholder
                      disabled={isLoading} // Disable while loading
                    />
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
