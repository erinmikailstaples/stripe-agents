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
export declare class GalileoLogger {
    private projectName;
    private logStream;
    private apiKey;
    constructor();
    logAgentExecution(metrics: AgentMetrics, input: string, output: string, metadata?: Record<string, any>): Promise<void>;
    logConversation(messages: AgentMessage[]): Promise<void>;
    private sendToGalileo;
    private sendConversationToGalileo;
    private simulateApiCall;
    evaluateToolSelection(toolsUsed: string[], expectedTools: string[], context: string): Promise<number>;
    evaluateContextAdherence(response: string, context: string, query: string): Promise<number>;
    generateEvaluationReport(executionLogs: GalileoLogEntry[]): Promise<Record<string, any>>;
    private calculateToolUsageStats;
    private calculateErrorStats;
}
//# sourceMappingURL=GalileoLogger.d.ts.map