export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  zScore: number;
}

/**
 * Calculates if a given value is an outlier using z-score methodology.
 * Formula: z = (x - mean) / stdDev
 * 
 * @param value The value to test
 * @param historicalValues Array of historical numeric values to establish baseline
 * @param threshold The standard deviation limit (default is 3.0, representing 99.7% confidence)
 */
export function detectZScoreAnomaly(
  value: number,
  historicalValues: number[],
  threshold = 3.0
): AnomalyDetectionResult {
  const n = historicalValues.length;
  // Require at least 5 baseline points to avoid skewed outliers on small datasets
  if (n < 5) {
    return { isAnomaly: false, zScore: 0 };
  }

  const mean = historicalValues.reduce((a, b) => a + b, 0) / n;
  const variance = historicalValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { isAnomaly: false, zScore: 0 };
  }

  const zScore = (value - mean) / stdDev;
  return {
    isAnomaly: Math.abs(zScore) >= threshold,
    zScore,
  };
}
