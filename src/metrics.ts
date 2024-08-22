import {
  CloudWatchClient,
  PutMetricDataCommand,
  PutMetricDataCommandInput,
} from "@aws-sdk/client-cloudwatch";

type MetricDatum = PutMetricDataCommandInput['MetricData'];

/**
 * Initialization of CloudWatch Agent
 */
const cloudwatchClient = new CloudWatchClient();

class MetricsBuffer {
  /**
   * Buffer of metrics that should be sent to the AWS CloudWatch
   */
  protected buffer: Map<string, Set<MetricDatum>> = new Map();

  /**
   * Initialized interval that flushing data to the AWS
   */
  protected interval: NodeJS.Timeout;

  /**
   * Constructs a new MetricsBuffer instance that periodically flushes metrics to AWS CloudWatch.
   * @param flushInterval - The interval in milliseconds at which the buffer should be flushed.
   */
  public constructor(flushInterval: number) {
    this.interval = setInterval(() => this.flush(), flushInterval);
  }

  /**
   * Cleans up the buffer and stops the automatic flushing of metrics.
   */
  public async destroy() {
    await this.flush();
    clearInterval(this.interval);
  }

  /**
   * Adds a new metric to the buffer to be sent to CloudWatch.
   * @param data - The metric data to be added, including the namespace and the metric data points.
   */
  public add(data: PutMetricDataCommandInput) {
    const { Namespace: namespace, MetricData: metricData } = data;
    const timestamp = new Date();

    if (!this.buffer.has(namespace as string)) {
      this.buffer.set(namespace as string, new Set());
    }

    if (Array.isArray(metricData)) {
      for (const metric of metricData) {
        this.buffer.get(namespace as string)?.add({
          ...metric,
          Timestamp: metric.Timestamp ? new Date(metric.Timestamp) : timestamp,
        } as MetricDatum);

        console.debug('Added metric to buffer:', metric);
      }
    }
  }

  /**
   * Flushes the buffered metrics to AWS CloudWatch in chunks of up to 1000 metrics.
   * This method is called automatically at the flush interval, and can also be called manually.
   * @protected
   */
  protected async flush() {
    const promises = [];

    for (const [namespace, metrics] of this.buffer) {
      for (let i = 0; i < metrics.size; i += 1000) {
        const chunk: MetricDatum[] = Array.from(metrics.values()).slice(i, i + 1000);
        const request = new PutMetricDataCommand({ Namespace: namespace, MetricData: chunk });

        promises.push(
          cloudwatchClient.send(request)
        );

        console.debug(`Sending ${chunk.length} metrics to CloudWatch under namespace: ${namespace}`);
      }

      this.buffer.clear();
    }

    await Promise.allSettled(promises).then((result) => {
      if (result.length === 0) return;

      console.debug(`Executed ${promises.length} requests to the AWS CloudWatch API`);

      result.forEach((r) => {
        if (r.status === 'rejected') {
          console.error(`Rejected request to the AWS CloudWatch API: ${r.reason.toString()}`);
        }
      });
    });
  }
}

const metricsFlushInterval = process.env.METRICS_FLUSH_INTERVAL && Number.parseInt(process.env.METRICS_FLUSH_INTERVAL);
export const metricsBuffer = new MetricsBuffer(metricsFlushInterval || 30000);
