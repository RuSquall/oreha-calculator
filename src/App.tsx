import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Tabs, Tab, Button } from 'react-bootstrap';
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
            <hr/>
            <Calculator 
              apiData={apiData}
              isLoading={isLoading}
              error={error}
              lastUpdated={lastUpdated}
            />
            <hr className="mt-4"/>
          </div>

          <Tabs defaultActiveKey="comprehensive-analyzer" id="main-tabs" className="mb-3" fill>
            <Tab eventKey="comprehensive-analyzer" title="종합 분석 계산기">
              <ComprehensiveCalculator 
                apiData={apiData}
                isLoading={isLoading}
                error={error}
                lastUpdated={lastUpdated}
              />
            </Tab>
            <Tab eventKey="max-producer" title="최대 생산량 계산기">
              <Maximizer />
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
