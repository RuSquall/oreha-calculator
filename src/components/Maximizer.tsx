import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { MaterialName, MaximizerResult, Inventory } from '../types/data';
import { MATERIAL_NAMES, RECIPES } from '../logic/constants';
import { calculateMaxCrafts } from '../logic/maximizer';
import { getItemGradeStyle, getImagePath, getImageBackgroundStyle } from '../logic/grades'; // Updated import
import { useTheme } from '../context/ThemeContext';

const Maximizer = () => {
  const { theme } = useTheme();
  const defaultInventory: Inventory = MATERIAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Inventory);

  const initialResults: MaximizerResult[] = RECIPES.map(recipe => ({
    maxCrafts: 0,
    exchangeSteps: [],
    remainingInventory: defaultInventory,
  }));

  const [inventory, setInventory] = useState<Inventory>(defaultInventory);
  const [results, setResults] = useState<MaximizerResult[]>(initialResults);

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
    setResults(allResults);
  };

  return (
    <Row> {/* Main Row for two-column layout */}
      <Col md={5}> {/* Left column for input form */}
        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <h5 className="card-title text-center mb-4">1. 보유 재료 입력</h5>
              <Row>
                {MATERIAL_NAMES.map((name) => {
                  const gradeStyle = getItemGradeStyle(name, theme);
                  return (
                    <Col md={12} key={name}> {/* Changed to md={12} for single column */}
                      <Form.Group className="mb-3" controlId={`inventory-${name}`}>
                        <Form.Label style={{ display: 'flex', alignItems: 'center' }}>
                          <img src={getImagePath(name)} alt={name} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(name, theme) }} />
                          <span style={{ marginLeft: '8px', color: gradeStyle.color }}>{name}</span>
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
                  );
                })}
              </Row>
              
              <div className="d-grid mt-4">
                <Button variant="primary" size="lg" type="submit">
                  최대 생산량 계산
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col md={7}> {/* Right column for results */}
        {results.map((result, index) => { // results is now always an array
          const recipeName = RECIPES[index].name;
          const titleGradeStyle = getItemGradeStyle(recipeName, theme);
          return (
            <Alert
              key={index}
              className="mb-3"
              style={{ backgroundColor: 'var(--component-bg)', borderColor: 'var(--border-color)' }}
            >
              <Alert.Heading>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img src={getImagePath(recipeName)} alt={recipeName} style={{ width: '24px', height: '24px', ...getImageBackgroundStyle(recipeName, theme) }} />
                  <span style={{ marginLeft: '8px', color: titleGradeStyle.color }}>{recipeName} 최대 생산량 계산 결과</span>
                </div>
              </Alert.Heading>
              <hr />
              <p className="mb-3 h4">
                <strong style={{ color: 'var(--text-color)' }}>최대 {result.maxCrafts / 10}회 ({result.maxCrafts}개) 제작 가능</strong>
              </p>
              {result.exchangeSteps.length > 0 && (
                <>
                  <h6>필요 교환 목록:</h6>
                  <ul>
                    {result.exchangeSteps.map((step, stepIndex) => {
                      const fromGradeStyle = getItemGradeStyle(step.fromMaterial, theme);
                      const toGradeStyle = getItemGradeStyle(step.toMaterial, theme);
                      return (
                        <li key={stepIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                          <img src={getImagePath(step.fromMaterial)} alt={step.fromMaterial} style={{ width: '20px', height: '20px', ...getImageBackgroundStyle(step.fromMaterial, theme) }} />
                          <span style={{ marginLeft: '5px', color: fromGradeStyle.color }}>{step.fromMaterial} x{step.fromAmount}</span>
                          <span style={{ margin: '0 5px' }}> → </span>
                          <img src={getImagePath(step.toMaterial)} alt={step.toMaterial} style={{ width: '20px', height: '20px', ...getImageBackgroundStyle(step.toMaterial, theme) }} />
                          <span style={{ marginLeft: '5px', color: toGradeStyle.color }}>{step.toMaterial} x{step.toAmount}</span>
                          <span style={{ marginLeft: '5px' }}> (x{step.count}회)</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {/* Removed "남는 재료" section */}
            </Alert>
          );
        })}
      </Col>
    </Row>
  );
};

export default Maximizer;
