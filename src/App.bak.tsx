import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Tabs, Tab, Button } from 'react-bootstrap';
import Calculator from './components/Calculator';
import Maximizer from './components/Maximizer';
import ComprehensiveCalculator from './components/ComprehensiveCalculator';
import { useTheme } from './context/ThemeContext';

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Container className="py-5">
      <Row className="justify-content-md-center">
        <Col md={12}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0 h2">로스트아크 융화재료 계산기</h1>
            <Button variant={theme === 'dark' ? 'outline-light' : 'outline-dark'} onClick={toggleTheme} size="sm">
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </Button>
          </div>
          <Tabs defaultActiveKey="cost-optimizer" id="main-tabs" className="mb-3" fill>
            <Tab eventKey="cost-optimizer" title="비용 최적화 계산기">
              <Calculator />
            </Tab>
            <Tab eventKey="comprehensive-analyzer" title="종합 분석 계산기">
              <ComprehensiveCalculator />
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
