import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Tabs, Tab } from 'react-bootstrap';
import Calculator from './components/Calculator';
import Maximizer from './components/Maximizer';
import ComprehensiveCalculator from './components/ComprehensiveCalculator'; // New import

function App() {
  return (
    <Container className="py-5">
      <Row className="justify-content-md-center">
        <Col md={8}>
          <h1 className="mb-4 text-center">로스트아크 융화재료 계산기</h1>
          <Tabs defaultActiveKey="cost-optimizer" id="main-tabs" className="mb-3" fill>
            <Tab eventKey="cost-optimizer" title="비용 최적화 계산기">
              <Calculator />
            </Tab>
            <Tab eventKey="max-producer" title="최대 생산량 계산기">
              <Maximizer />
            </Tab>
            <Tab eventKey="comprehensive-analyzer" title="종합 분석 계산기">
              <ComprehensiveCalculator />
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
