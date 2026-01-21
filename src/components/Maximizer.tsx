import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { MaterialName, MaximizerResult, Inventory } from '../types/data';
import { MATERIAL_NAMES, RECIPES } from '../logic/constants';
import { calculateMaxCrafts } from '../logic/maximizer';

const getImagePath = (itemName: string): string => {
  // 파일명 규칙에 따라 공백을 언더스코어로 변경
  const fileName = itemName.replace(/ /g, '_');
  return `/${fileName}.png`;
};
import { MATERIAL_NAMES, RECIPES } from '../logic/constants';
import { calculateMaxCrafts } from '../logic/maximizer';

const Maximizer = () => {
  const [inventory, setInventory] = useState<Inventory>(
    MATERIAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Inventory)
  );
  const [results, setResults] = useState<MaximizerResult[] | null>(null); // Changed to array

  const handleInventoryChange = (name: MaterialName, value: string) => {
    setInventory({
      ...inventory,
      [name]: parseInt(value, 10) || 0,
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const allResults: MaximizerResult[] = RECIPES.map(recipe => {
      return calculateMaxCrafts(inventory, recipe.name);
    });
    setResults(allResults); // Set array of results
  };

  return (
    <Card>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <h5 className="card-title text-center mb-4">1. 보유 재료 입력</h5>
          <Row>
            {MATERIAL_NAMES.map((name) => (
              <Col md={6} key={name}>
                <Form.Group className="mb-3" controlId={`inventory-${name}`}>
                  <Form.Label>
                    <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', marginRight: '8px' }} />
                    {name}
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
          
          <div className="d-grid mt-4">
            <Button variant="primary" size="lg" type="submit">
              최대 생산량 계산
            </Button>
          </div>
        </Form>

        {results && results.map((result, index) => (
          <Alert key={index} variant="info" className="mt-4">
            <Alert.Heading>{RECIPES[index].name} 최대 생산량 계산 결과</Alert.Heading>
            <hr />
            <p className="mb-3 h4">
              <strong>최대 {result.maxCrafts / 10}회 ({result.maxCrafts}개) 제작 가능</strong>
            </p>
            {result.exchangeSteps.length > 0 && (
              <>
                <h6>필요 교환 목록:</h6>
                <ul>
                  {result.exchangeSteps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ul>
              </>
            )}
            <h6>남는 재료:</h6>
            <ul>
              {MATERIAL_NAMES.map(name => (
                <li key={`remaining-${name}`}>
                  <img src={getImagePath(name)} alt={name} style={{ width: '20px', height: '20px', marginRight: '5px' }} />
                  {name}: {Math.floor(result.remainingInventory[name]).toLocaleString()}개
                </li>
              ))}
            </ul>
          </Alert>
        ))}
      </Card.Body>
    </Card>
  );
};

export default Maximizer;
