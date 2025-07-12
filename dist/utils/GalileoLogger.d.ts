import { AgentMetrics, AgentMessage } from '../types';
/**
 * Production-grade Galileo logging utility for agent executions and conversations.
 * Sends structured traces and spans to Galileo using the official SDK.
 */
export declare class GalileoAgentLogger {
    private logger;
    constructor();
    /**
     * Log a single agent execution to Galileo, including workflow and LLM spans.
     * @param metrics Agent execution metrics
     * @param input User input
     * @param output Agent output
     * @param metadata Optional additional metadata
     */
    logAgentExecution(metrics: AgentMetrics, input: string, output: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Log a full conversation to Galileo as a trace with workflow spans for each message.
     * @param messages Array of AgentMessage objects
     */
    logConversation(messages: AgentMessage[]): Promise<void>;
}
//# sourceMappingURL=GalileoLogger.d.ts.map