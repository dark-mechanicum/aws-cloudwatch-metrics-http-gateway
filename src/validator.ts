import Validator, { type ValidationSchema } from "fastest-validator";

enum MetricUnits {
  Seconds = "Seconds",
  Microseconds = "Microseconds",
  Milliseconds = "Milliseconds",
  Bytes = "Bytes",
  Kilobytes = "Kilobytes",
  Megabytes = "Megabytes",
  Gigabytes = "Gigabytes",
  Terabytes = "Terabytes",
  Bits = "Bits",
  Kilobits = "Kilobits",
  Megabits = "Megabits",
  Gigabits = "Gigabits",
  Terabits = "Terabits",
  Percent = "Percent",
  Count = "Count",
  BytesPerSecond = "Bytes/Second",
  KilobytesPerSecond = "Kilobytes/Second",
  MegabytesPerSecond = "Megabytes/Second",
  GigabytesPerSecond = "Gigabytes/Second",
  TerabytesPerSecond = "Terabytes/Second",
  BitsPerSecond = "Bits/Second",
  KilobitsPerSecond = "Kilobits/Second",
  MegabitsPerSecond = "Megabits/Second",
  GigabitsPerSecond = "Gigabits/Second",
  TerabitsPerSecond = "Terabits/Second",
  CountPerSecond = "Count/Second",
  None = "None"
}

const v = new Validator();

const metricDimensionSchema: ValidationSchema = {
  type: "object",
  props: {
    Name: { type: "string", min: 1, max: 255, pattern: /^[a-zA-Z0-9-_\/]+$/ },
    Value: { type: "string", min: 1, max: 255, pattern: /^[a-zA-Z0-9-_\/]+$/ }
  }
};

const metricDataSchema: ValidationSchema = {
  type: "object",
  props: {
    MetricName: { type: "string", min: 1, max: 255, pattern: /^[a-zA-Z0-9-_\/]+$/ },
    Unit: { type: "enum", values: Array.from(Object.values(MetricUnits)) },
    Value: { type: "number", optional: true },
    Values: { type: "array", items: "number", optional: true },
    Counts: { type: "array", items: "number", optional: true },
    Dimensions: { type: "array", items: metricDimensionSchema, optional: true, max: 30 },
    StorageResolution: { type: "number", optional: true, positive: true }
  }
};

const putMetricDataCommandSchema: ValidationSchema = {
  $$root: true,
  type: "object",
  props: {
    MetricData: { type: "array", items: metricDataSchema, max: 1000 },
    Namespace: { type: "string", pattern: "[^:].*", min: 1, max: 255 }
  }
};

const validate = v.compile(putMetricDataCommandSchema);

export {
  validate,
}
