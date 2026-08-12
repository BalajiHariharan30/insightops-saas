import { detectZScoreAnomaly } from '../utils/math';

describe('Z-Score Outlier Math Verification', () => {
  it('correctly tags normal observations within standard deviations limit', () => {
    // Values close to 100
    const dataset = [100, 105, 95, 102, 98];
    const result = detectZScoreAnomaly(100, dataset, 3.0);
    expect(result.isAnomaly).toBe(false);
  });

  it('detects values that represent standard deviations outliers', () => {
    // Standard deviation is very small (~1), 50 is a huge outlier
    const dataset = [10, 12, 11, 9, 10, 11];
    const result = detectZScoreAnomaly(50, dataset, 3.0);
    expect(result.isAnomaly).toBe(true);
    expect(result.zScore).toBeGreaterThan(3.0);
  });

  it('returns no anomaly if baseline dataset is too small', () => {
    const dataset = [10, 12]; // less than 5 records
    const result = detectZScoreAnomaly(50, dataset, 3.0);
    expect(result.isAnomaly).toBe(false);
  });
});
