export const metricConfig = {
  heartRate: {
    label: "Heart Rate",
    unit: "BPM",
    tip: "A normal resting heart rate for adults ranges from 60 to 100 beats per minute.",
    criticalMax: 100,
    criticalMin: 60,
  },
  bloodPressure: {
    label: "Blood Pressure",
    unit: "mmHg",
    tip: "Consistent readings above 140/90 mmHg could indicate high blood pressure.",
    criticalMax: 140,
    criticalMin: 90,
  },
  steps: {
    label: "Daily Steps",
    unit: "Steps",
    tip: "Walking 8,000 to 10,000 steps daily helps maintain strong heart health.",
    criticalMax: 15000,
    criticalMin: 3000,
  },
  sleep: {
    label: "Total Sleep",
    unit: "Hrs",
    tip: "Getting 7 to 9 hours of restorative sleep supports daytime focus and energy.",
    criticalMax: 9,
    criticalMin: 6,
  },
  weight: {
    label: "Body Weight",
    unit: "kg",
    tip: "Track your weight trends weekly rather than daily to focus on long-term wellness.",
    criticalMax: 120,
    criticalMin: 50,
  },
} as const;

export type MetricType = keyof typeof metricConfig;

export interface BloodPressureValue {
  systolic: number;
  diastolic: number;
}

export interface HealthRecord {
  id: string;
  type: MetricType;
  date: string;
  value: number | BloodPressureValue;
}

export interface ChartDataPoint {
  date: string;
  displayValue: string;
  numericValue: number;
  originalRecord: HealthRecord;
}
