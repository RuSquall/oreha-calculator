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
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInventoryChange = (name: MaterialName, value: string) => {
    setInventory({
      ...inventory,
      [name]: parseInt(value, 10) || 0,
    });
  };

  const handleResetInventory = () => {
    setInventory(MATERIAL_NAMES.reduce((acc, name) => ({ ...acc, [name]: 0 }), {} as Inventory));
    setResults(initialResults); // 결과도 함께 초기화
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCalculating(true);
    try {
      const allResults: MaximizerResult[] = await Promise.all(
        RECIPES.map(recipe => calculateMaxCrafts(inventory, recipe.name))
      );
      setResults(allResults);
    } catch (error) {
      console.error('Calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Row> {/* Main Row for two-column layout */}
      <Col md={5}> {/* Left column for input form */}
        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div style={{ width: '60px' }}></div> {/* Spacer for symmetry */}
                <h5 className="card-title mb-0">1. 보유 재료 입력</h5>
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  onClick={handleResetInventory}
                  title="모든 보유 수량을 0으로 초기화합니다."
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  초기화
                </Button>
              </div>
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
                <Button variant="primary" size="lg" type="submit" disabled={isCalculating}>
                  {isCalculating ? '계산 중...' : '최대 생산량 계산'}
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
                  <span style={{ marginLeft: '8px', color: titleGradeStyle.color, fontWeight: 'bold' }}>{recipeName} 최대 생산량 계산 결과</span>
                </div>
              </Alert.Heading>
              <hr />
              {result.maxCrafts > 0 ? (
                <>
                  <p className="mb-3 h4">
                    <strong style={{ color: 'var(--text-color)' }}>최대 {result.maxCrafts / 10}회 ({result.maxCrafts}개) 제작 가능</strong>
                  </p>
                  {result.exchangeSteps.length > 0 ? (
                    <>
                      <h6 style={{ color: 'var(--text-color)' }}>필요 교환 목록:</h6>
                      <ul style={{ paddingLeft: '0', listStyleType: 'none' }}>
                        {result.exchangeSteps.map((step, stepIndex) => {
                          const fromGradeStyle = getItemGradeStyle(step.fromMaterial, theme);
                          const toGradeStyle = getItemGradeStyle(step.toMaterial, theme);
                          return (
                            <li key={stepIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: '1.1rem' }}>
                              {/* From Material Group */}
                              <div style={{ display: 'flex', alignItems: 'center', width: '220px' }}> {/* Increased width to accommodate name */}
                                <img src={getImagePath(step.fromMaterial)} alt={step.fromMaterial} style={{ width: '32px', height: '32px', ...getImageBackgroundStyle(step.fromMaterial, theme) }} />
                                <span style={{ marginLeft: '8px', color: fromGradeStyle.color, fontWeight: 'bold' }}>{step.fromMaterial}</span>
                                <span style={{ marginLeft: 'auto', color: fromGradeStyle.color, fontWeight: 'bold' }}>x{step.fromAmount}</span>
                              </div>

                              {/* Strong Arrow */}
                              <span style={{ margin: '0 15px', color: '#ffc107', fontWeight: '900', fontSize: '1.5rem' }}> → </span>

                              {/* To Material Group */}
                              <div style={{ display: 'flex', alignItems: 'center', width: '210px' }}> {/* Increased width to accommodate name */}
                                <img src={getImagePath(step.toMaterial)} alt={step.toMaterial} style={{ width: '32px', height: '32px', ...getImageBackgroundStyle(step.toMaterial, theme) }} />
                                <span style={{ marginLeft: '8px', color: toGradeStyle.color, fontWeight: 'bold' }}>{step.toMaterial}</span>
                                <span style={{ marginLeft: 'auto', color: toGradeStyle.color, fontWeight: 'bold' }}>x{step.toAmount}</span>
                              </div>

                              {/* Count Info */}
                              <span style={{ 
                                marginLeft: '15px', 
                                color: 'var(--text-color)', 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold',
                                backgroundColor: 'var(--component-bg)', 
                                padding: '4px 12px', 
                                borderRadius: '12px', 
                                border: '1px solid #ffc107',
                                boxShadow: '0 0 5px rgba(255, 193, 7, 0.2)'
                              }}>
                                {step.count}회
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                    </>
                  ) : (
                    <p className="text-success mb-0">
                      <i className="bi bi-check-circle-fill me-2"></i>
                      추가적인 재료 교환 없이 바로 제작할 수 있습니다.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-3">
                  <p className="h5 mb-0" style={{ color: '#fff' }}>
                    현재 보유한 재료로는 제작이 불가능합니다.
                  </p>
                </div>
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
