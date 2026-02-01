import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Tabs, Tab, Button, OverlayTrigger, Tooltip, Collapse } from 'react-bootstrap';
import Calculator from './components/Calculator';
import Maximizer from './components/Maximizer';
import ComprehensiveCalculator from './components/ComprehensiveCalculator';
import { useTheme } from './context/ThemeContext';
import { MaterialName } from './types/data';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [apiData, setApiData] = useState<Partial<Record<MaterialName, number>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(true); // 비용 최적화 계산기 접기/펴기 상태

  const [craftFeeDiscount, setCraftFeeDiscount] = useState<number>(() => {
    try {
      const savedDiscount = localStorage.getItem('craftFeeDiscount');
      return savedDiscount ? JSON.parse(savedDiscount) : 0;
    } catch (error) {
      console.error("Failed to parse craftFeeDiscount from localStorage", error);
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('craftFeeDiscount', JSON.stringify(craftFeeDiscount));
    } catch (error) {
      console.error("Failed to save craftFeeDiscount to localStorage", error);
    }
  }, [craftFeeDiscount]);

  const handleDiscountChange = (value: string) => {
    const numberValue = Number(value);
    if (numberValue >= 0 && numberValue <= 100) {
      setCraftFeeDiscount(numberValue);
    }
  };

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
        setApiData(responseData.prices || {});
        setLastUpdated(responseData.lastUpdated);
      } catch (err: any) {
        setError(err.message);
        setApiData({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, []);

  const comprehensiveTitle = (
    <span>
      종합 분석 계산기
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="comprehensive-tooltip">
            보유 재료 기반으로 '전부 판매', '최대 제작 후 판매', '최대 제작 후 사용' 시나리오 중 최적 행동을 추천합니다.
          </Tooltip>
        }
      >
        <span style={{ cursor: 'help' }} className="ms-1">❓</span>
      </OverlayTrigger>
    </span>
  );

  const maximizerTitle = (
    <span>
      최대 생산량 계산기
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="maximizer-tooltip">
            보유한 재료로 융화 재료를 최대 몇 개까지 만들 수 있는지 계산합니다.
          </Tooltip>
        }
      >
        <span style={{ cursor: 'help' }} className="ms-1">❓</span>
      </OverlayTrigger>
    </span>
  );

  return (
    <Container className="py-5">
      <Row className="justify-content-md-center">
        <Col md={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0 h2" style={{ color: 'var(--text-color)' }}>로스트아크 융화재료 계산기</h1>
            <Button variant={theme === 'dark' ? 'outline-light' : 'outline-dark'} onClick={toggleTheme} size="sm">
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Button>
          </div>

          {/* 비용 최적화 계산기 - 상단 고정 */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h4 mb-0" style={{ color: 'var(--text-color)' }}>비용 최적화 계산기</h2>
              <Button
                variant="outline-secondary"
                onClick={() => setShowCalculator(!showCalculator)}
                aria-controls="calculator-collapse"
                aria-expanded={showCalculator}
                size="sm"
              >
                {showCalculator ? '접기' : '펼치기'}
              </Button>
            </div>
            <Collapse in={showCalculator}>
              <div id="calculator-collapse">
                <hr/>
                <Calculator 
                  apiData={apiData}
                  isLoading={isLoading}
                  error={error}
                  lastUpdated={lastUpdated}
                  craftFeeDiscount={craftFeeDiscount}
                  onDiscountChange={handleDiscountChange}
                />
                <hr className="mt-4"/>
              </div>
            </Collapse>
          </div>

          <Tabs defaultActiveKey="comprehensive-analyzer" id="main-tabs" className="mb-3" fill>
            <Tab eventKey="comprehensive-analyzer" title={comprehensiveTitle}>
              <ComprehensiveCalculator 
                apiData={apiData}
                isLoading={isLoading}
                error={error}
                lastUpdated={lastUpdated}
                craftFeeDiscount={craftFeeDiscount}
                onDiscountChange={handleDiscountChange}
              />
            </Tab>
            <Tab eventKey="max-producer" title={maximizerTitle}>
              <Maximizer />
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
