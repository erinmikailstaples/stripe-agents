import { env } from '../config/environment';
import { AgentMetrics, AgentMessage } from '../types';

export interface GalileoLogEntry {
  projectName: string;
  logStream: string;
  timestamp: Date;
  executionTime: number;
  success: boolean;
  toolsUsed: string[];
  errorType?: string;
  cost?: number;
  input: string;
  output: string;
  metadata?: Record<string, any>;
}

export class GalileoLogger {
  private projectName: string;
  private logStream: string;
  private apiKey: string;

  constructor() {
    this.projectName = env.galileo.projectName;
    this.logStream = env.galileo.logStream;
    this.apiKey = env.galileo.apiKey;
  }

  async logAgentExecution(
    metrics: AgentMetrics,
    input: string,
    output: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: GalileoLogEntry = {
      projectName: this.projectName,
      logStream: this.logStream,
      timestamp: new Date(),
      executionTime: metrics.executionTime,
      success: metrics.success,
      toolsUsed: metrics.toolsUsed,
      errorType: metrics.errorType,
      cost: metrics.cost,
      input,
      output,
      metadata,
    };

    try {
      // In a real implementation, you would send this to Galileo's API
      // For now, we'll log to console and store locally
      await this.sendToGalileo(logEntry);
    } catch (error) {
      console.error('Failed to log to Galileo:', error);
    }
  }

  async logConversation(messages: AgentMessage[]): Promise<void> {
    try {
      const conversationData = {
        projectName: this.projectName,
        logStream: this.logStream,
        timestamp: new Date(),
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        messageCount: messages.length,
      };

      // Log conversation data
      await this.sendConversationToGalileo(conversationData);
    } catch (error) {
      console.error('Failed to log conversation to Galileo:', error);
    }
  }

  private async sendToGalileo(logEntry: GalileoLogEntry): Promise<void> {
    // This is a placeholder for the actual Galileo API integration
    // In a real implementation, you would use Galileo's SDK or API
    
    console.log('📊 Galileo Log Entry:', {
      project: logEntry.projectName,
      stream: logEntry.logStream,
      success: logEntry.success,
      executionTime: `${logEntry.executionTime}ms`,
      toolsUsed: logEntry.toolsUsed,
      errorType: logEntry.errorType,
      timestamp: logEntry.timestamp.toISOString(),
    });

    // Simulate API call
    await this.simulateApiCall();
  }

  private async sendConversationToGalileo(conversationData: any): Promise<void> {
    console.log('💬 Galileo Conversation Log:', {
      project: conversationData.projectName,
      stream: conversationData.logStream,
      messageCount: conversationData.messageCount,
      timestamp: conversationData.timestamp.toISOString(),
    });

    // Simulate API call
    await this.simulateApiCall();
  }

  private async simulateApiCall(): Promise<void> {
    // Simulate network delay
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  // Utility methods for different types of evaluations
  async evaluateToolSelection(
    toolsUsed: string[],
    expectedTools: string[],
    context: string
  ): Promise<number> {
    // Placeholder for tool selection quality evaluation
    // In a real implementation, this would use Galileo's evaluation metrics
    
    const correctTools = toolsUsed.filter(tool => expectedTools.includes(tool));
    const score = correctTools.length / Math.max(expectedTools.length, 1);
    
    console.log('🔧 Tool Selection Evaluation:', {
      toolsUsed,
      expectedTools,
      score: score.toFixed(2),
    });

    return score;
  }

  async evaluateContextAdherence(
    response: string,
    context: string,
    query: string
  ): Promise<number> {
    // Placeholder for context adherence evaluation
    // In a real implementation, this would use Galileo's LLM-as-a-judge metrics
    
    const contextWords = context.toLowerCase().split(' ');
    const responseWords = response.toLowerCase().split(' ');
    
    const overlap = contextWords.filter(word => 
      responseWords.includes(word) && word.length > 3
    ).length;
    
    const score = Math.min(overlap / Math.max(contextWords.length * 0.1, 1), 1);
    
    console.log('📝 Context Adherence Evaluation:', {
      contextLength: contextWords.length,
      responseLength: responseWords.length,
      overlap,
      score: score.toFixed(2),
    });

    return score;
  }

  async generateEvaluationReport(
    executionLogs: GalileoLogEntry[]
  ): Promise<Record<string, any>> {
    const totalExecutions = executionLogs.length;
    const successfulExecutions = executionLogs.filter(log => log.success).length;
    const averageExecutionTime = executionLogs.reduce(
      (sum, log) => sum + log.executionTime, 0
    ) / totalExecutions;
    
    const toolUsageStats = this.calculateToolUsageStats(executionLogs);
    const errorStats = this.calculateErrorStats(executionLogs);

    const report = {
      summary: {
        totalExecutions,
        successfulExecutions,
        successRate: (successfulExecutions / totalExecutions * 100).toFixed(2) + '%',
        averageExecutionTime: Math.round(averageExecutionTime) + 'ms',
      },
      toolUsage: toolUsageStats,
      errors: errorStats,
      generatedAt: new Date().toISOString(),
    };

    console.log('📈 Evaluation Report Generated:', report);
    return report;
  }

  private calculateToolUsageStats(logs: GalileoLogEntry[]): Record<string, number> {
    const toolCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      log.toolsUsed.forEach(tool => {
        toolCounts[tool] = (toolCounts[tool] || 0) + 1;
      });
    });

    return toolCounts;
  }

  private calculateErrorStats(logs: GalileoLogEntry[]): Record<string, number> {
    const errorCounts: Record<string, number> = {};
    
    logs.forEach(log => {
      if (!log.success && log.errorType) {
        errorCounts[log.errorType] = (errorCounts[log.errorType] || 0) + 1;
      }
    });

    return errorCounts;
  }
}