import { EventBus } from './EventBus.js';
import { PerformanceMetrics } from '../types/index.js';

interface MetricsSample {
  timestamp: number;
  parseTime: number;
  renderTime: number;
  frameTime: number;
  eventCount: number;
  revisionCount: number;
}

export class PerformanceMonitor {
  private eventBus: EventBus;
  private metrics: PerformanceMetrics = {
    parseTime: 0,
    renderTime: 0,
    totalEvents: 0,
    revisionCount: 0,
    frameTime: 0,
    bufferSize: 0,
  };
  private samples: MetricsSample[] = [];
  private maxSamples = 100;
  private parseStartTime = 0;
  private renderStartTime = 0;
  private destroyed = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupListeners();
  }

  private setupListeners(): void {
    // 监听缓冲区事件
    this.eventBus.on('buffer:flush', (data: { content: string }) => {
      this.metrics.bufferSize = data.content.length;
    });

    // 监听解析开始
    this.eventBus.on('parser:start', () => {
      this.parseStartTime = performance.now();
    });

    // 监听解析事件
    this.eventBus.on('parser:event', (event: any) => {
      this.metrics.totalEvents++;
      if (event.type === 'revision') {
        this.metrics.revisionCount++;
      }

      // 更新解析时间
      if (this.parseStartTime > 0) {
        this.metrics.parseTime = performance.now() - this.parseStartTime;
      }
    });

    // 监听渲染开始
    this.eventBus.on('scheduler:render', () => {
      this.renderStartTime = performance.now();
    });

    // 监听渲染完成
    this.eventBus.on('renderer:complete', (_data: { count: number }) => {
      if (this.renderStartTime > 0) {
        this.metrics.renderTime = performance.now() - this.renderStartTime;
      }
      this.recordSample();
    });

    // 监听调度器指标
    this.eventBus.on('scheduler:metrics', (data: any) => {
      this.metrics.frameTime = data.averageFrameTime;
    });
  }

  /**
   * 记录性能样本
   */
  private recordSample(): void {
    const sample: MetricsSample = {
      timestamp: Date.now(),
      parseTime: this.metrics.parseTime,
      renderTime: this.metrics.renderTime,
      frameTime: this.metrics.frameTime,
      eventCount: this.metrics.totalEvents,
      revisionCount: this.metrics.revisionCount,
    };

    this.samples.push(sample);

    // 限制样本数量
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // 发送性能报告
    this.emitReport();
  }

  /**
   * 发送性能报告
   */
  private emitReport(): void {
    const report = {
      current: { ...this.metrics },
      average: this.calculateAverages(),
      trends: this.calculateTrends(),
    };

    this.eventBus.emit('monitor:report', report);
  }

  /**
   * 计算平均值
   */
  private calculateAverages(): Partial<PerformanceMetrics> {
    if (this.samples.length === 0) {
      return {};
    }

    const sum = this.samples.reduce(
      (acc, sample) => ({
        parseTime: acc.parseTime + sample.parseTime,
        renderTime: acc.renderTime + sample.renderTime,
        frameTime: acc.frameTime + sample.frameTime,
        eventCount: acc.eventCount + sample.eventCount,
        revisionCount: acc.revisionCount + sample.revisionCount,
      }),
      {
        parseTime: 0,
        renderTime: 0,
        frameTime: 0,
        eventCount: 0,
        revisionCount: 0,
      }
    );

    const count = this.samples.length;

    return {
      parseTime: sum.parseTime / count,
      renderTime: sum.renderTime / count,
      frameTime: sum.frameTime / count,
      totalEvents: sum.eventCount / count,
      revisionCount: sum.revisionCount / count,
    };
  }

  /**
   * 计算趋势
   */
  private calculateTrends(): Record<string, 'improving' | 'stable' | 'degrading'> {
    if (this.samples.length < 10) {
      return {
        parseTime: 'stable',
        renderTime: 'stable',
        frameTime: 'stable',
      };
    }

    const recent = this.samples.slice(-5);
    const older = this.samples.slice(-10, -5);

    const recentAvg = {
      parseTime: recent.reduce((sum, s) => sum + s.parseTime, 0) / recent.length,
      renderTime: recent.reduce((sum, s) => sum + s.renderTime, 0) / recent.length,
      frameTime: recent.reduce((sum, s) => sum + s.frameTime, 0) / recent.length,
    };

    const olderAvg = {
      parseTime: older.reduce((sum, s) => sum + s.parseTime, 0) / older.length,
      renderTime: older.reduce((sum, s) => sum + s.renderTime, 0) / older.length,
      frameTime: older.reduce((sum, s) => sum + s.frameTime, 0) / older.length,
    };

    return {
      parseTime: this.getTrend(recentAvg.parseTime, olderAvg.parseTime),
      renderTime: this.getTrend(recentAvg.renderTime, olderAvg.renderTime),
      frameTime: this.getTrend(recentAvg.frameTime, olderAvg.frameTime),
    };
  }

  /**
   * 获取趋势
   */
  private getTrend(recent: number, older: number): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.1; // 10% 变化阈值
    const change = (recent - older) / older;

    if (change < -threshold) {
      return 'improving';
    } else if (change > threshold) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  /**
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能建议
   */
  getSuggestions(): string[] {
    const suggestions: string[] = [];

    // 解析时间建议
    if (this.metrics.parseTime > 50) {
      suggestions.push('考虑增大缓冲区超时时间以减少解析频率');
    }

    // 渲染时间建议
    if (this.metrics.renderTime > 16) {
      suggestions.push('考虑减小批处理大小以提高响应速度');
    }

    // 帧时间建议
    if (this.metrics.frameTime > 16.67) {
      suggestions.push('渲染性能不足，考虑启用虚拟滚动或减少复杂度');
    }

    // 修正率建议
    const revisionRate = this.metrics.revisionCount / this.metrics.totalEvents;
    if (revisionRate > 0.1) {
      suggestions.push('修正率较高，考虑优化歧义处理策略');
    }

    return suggestions;
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      parseTime: 0,
      renderTime: 0,
      totalEvents: 0,
      revisionCount: 0,
      frameTime: 0,
      bufferSize: 0,
    };
    this.samples = [];
    this.parseStartTime = 0;
    this.renderStartTime = 0;
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.destroyed = true;
    this.reset();
  }
}
