import 'reflect-metadata';
import { Metric } from '../models/Metric';

describe('Metric Model', () => {
  it('should create a valid metric instance', () => {
    const metric = new Metric();
    const now = new Date();
    
    metric.name = 'test_metric';
    metric.value = 42.5;
    metric.unit = 'points';
    metric.period = 'daily';
    metric.timestamp = now;
    metric.metadata = { test: true };

    expect(metric.name).toBe('test_metric');
    expect(metric.value).toBe(42.5);
    expect(metric.unit).toBe('points');
    expect(metric.period).toBe('daily');
    expect(metric.timestamp).toBe(now);
    expect(metric.metadata).toEqual({ test: true });
  });

  it('should handle all expected fields of a Metric entity', () => {
    const now = new Date();
    const metric = new Metric();

    // Asignar valores a todos los campos
    const testData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'test_metric',
      value: 100,
      unit: 'points',
      period: 'daily',
      timestamp: now,
      metadata: { test: true },
      createdAt: now
    };

    // Asignar todos los campos
    Object.assign(metric, testData);

    // Verificar que cada campo se puede asignar y leer correctamente
    expect(metric.id).toBe(testData.id);
    expect(metric.name).toBe(testData.name);
    expect(metric.value).toBe(testData.value);
    expect(metric.unit).toBe(testData.unit);
    expect(metric.period).toBe(testData.period);
    expect(metric.timestamp).toBe(testData.timestamp);
    expect(metric.metadata).toEqual(testData.metadata);
    expect(metric.createdAt).toBe(testData.createdAt);

    // Verificar que el objeto tiene todas las propiedades esperadas
    const expectedProperties = [
      'id', 'name', 'value', 'unit', 'period', 
      'timestamp', 'metadata', 'createdAt'
    ];
    
    expectedProperties.forEach(prop => {
      expect(Object.prototype.hasOwnProperty.call(metric, prop)).toBeTruthy();
    });
  });
});