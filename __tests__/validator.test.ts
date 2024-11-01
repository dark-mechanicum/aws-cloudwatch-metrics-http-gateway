import { validate } from '../src/validator';
import type { PutMetricDataCommandInput, MetricDatum } from '@aws-sdk/client-cloudwatch';

describe('Validator', () => {
  // Helper function to create a valid base metric
  const createValidMetric = (): PutMetricDataCommandInput & { MetricData: MetricDatum[] } => ({
    Namespace: 'TestNamespace',
    MetricData: [
      {
        MetricName: 'TestMetric',
        Unit: 'Count',
        Value: 1,
      },
    ],
  });

  describe('Positive scenarios', () => {
    it('should validate a correct metric with minimal fields', () => {
      const metric = createValidMetric();
      const result = validate(metric);
      expect(result).toBe(true);
    });

    it('should validate a metric with all optional fields', () => {
      const metric: PutMetricDataCommandInput = {
        Namespace: 'TestNamespace',
        MetricData: [
          {
            MetricName: 'ComplexMetric',
            Unit: 'Milliseconds',
            Value: 100.5,
            Values: [1, 2, 3],
            Counts: [1, 1, 1],
            Dimensions: [
              { Name: 'Environment', Value: 'Production' },
              { Name: 'Region', Value: 'us-east-1' },
            ],
            StorageResolution: 1,
          },
        ],
      };
      const result = validate(metric);
      expect(result).toBe(true);
    });

    it('should validate a metric with array values instead of single value', () => {
      const metric = {
        Namespace: 'TestNamespace',
        MetricData: [
          {
            MetricName: 'ArrayMetric',
            Unit: 'Count',
            Values: [1, 2, 3],
            Counts: [1, 1, 1],
          },
        ],
      };
      const result = validate(metric);
      expect(result).toBe(true);
    });
  });

  describe('Negative scenarios - Namespace validation', () => {
    it('should reject empty namespace', () => {
      const metric = createValidMetric();
      metric.Namespace = '';
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringMin',
          field: 'Namespace',
        }),
      );
    });

    it('should reject namespace starting with colon', () => {
      const metric = createValidMetric();
      metric.Namespace = ':InvalidNamespace';
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringPattern',
          field: 'Namespace',
        }),
      );
    });

    it('should reject namespace longer than 255 characters', () => {
      const metric = createValidMetric();
      metric.Namespace = 'a'.repeat(256);
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringMax',
          field: 'Namespace',
        }),
      );
    });
  });

  describe('Negative scenarios - MetricData validation', () => {
    it('should reject empty MetricData array', () => {
      const metric = createValidMetric();
      metric.MetricData = [];
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'arrayMin',
          field: 'MetricData',
        }),
      );
    });

    it('should reject MetricData array with more than 1000 items', () => {
      const metric = createValidMetric();
      metric.MetricData = Array(1001).fill({
        MetricName: 'TestMetric',
        Unit: 'Count',
        Value: 1,
      });
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'arrayMax',
          field: 'MetricData',
        }),
      );
    });
  });

  describe('Negative scenarios - MetricName validation', () => {
    it('should reject empty MetricName', () => {
      const metric = createValidMetric();
      metric.MetricData[0].MetricName = '';
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringMin',
          field: 'MetricData[0].MetricName',
        }),
      );
    });

    it('should reject MetricName with special characters', () => {
      const metric = createValidMetric();
      metric.MetricData[0].MetricName = 'Invalid@Metric#Name';
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringPattern',
          field: 'MetricData[0].MetricName',
        }),
      );
    });
  });

  describe('Negative scenarios - Unit validation', () => {
    it('should reject invalid Unit value', () => {
      const metric = createValidMetric();
      (metric.MetricData[0] as { Unit: string }).Unit = 'InvalidUnit';
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'enumValue',
          field: 'MetricData[0].Unit',
        }),
      );
    });
  });

  describe('Negative scenarios - Dimensions validation', () => {
    it('should reject dimensions with empty name', () => {
      const metric = createValidMetric();
      metric.MetricData[0].Dimensions = [{ Name: '', Value: 'TestValue' }];
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringMin',
          field: 'MetricData[0].Dimensions[0].Name',
        }),
      );
    });

    it('should reject dimensions with special characters in value', () => {
      const metric = createValidMetric();
      metric.MetricData[0].Dimensions = [{ Name: 'TestName', Value: 'Test@Value#' }];
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'stringPattern',
          field: 'MetricData[0].Dimensions[0].Value',
        }),
      );
    });

    it('should reject more than 30 dimensions', () => {
      const metric = createValidMetric();
      metric.MetricData[0].Dimensions = Array(31).fill({
        Name: 'TestDimension',
        Value: 'TestValue',
      });
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'arrayMax',
          field: 'MetricData[0].Dimensions',
        }),
      );
    });
  });

  describe('Negative scenarios - StorageResolution validation', () => {
    it('should reject negative StorageResolution', () => {
      const metric = createValidMetric();
      metric.MetricData[0].StorageResolution = -1;
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'numberPositive',
          field: 'MetricData[0].StorageResolution',
        }),
      );
    });

    it('should reject zero StorageResolution', () => {
      const metric = createValidMetric();
      metric.MetricData[0].StorageResolution = 0;
      const result = validate(metric);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'numberPositive',
          field: 'MetricData[0].StorageResolution',
        }),
      );
    });
  });

  describe('Value and Values validation', () => {
    it('should allow metric with only Value', () => {
      const metric = createValidMetric();
      const result = validate(metric);
      expect(result).toBe(true);
    });

    it('should allow metric with Values and Counts arrays of same length', () => {
      const metric = createValidMetric();
      delete metric.MetricData[0].Value;
      metric.MetricData[0].Values = [1, 2, 3];
      metric.MetricData[0].Counts = [1, 1, 1];
      const result = validate(metric);
      expect(result).toBe(true);
    });
  });
});
