import { AgentMetrics, AgentMessage } from '../types';
/**
 * Galileo logging utility following the proper pattern from documentation
 */
export declare class GalileoAgentLogger {
    private logger;
    private sessionId?;
    private currentTraceActive;
    constructor();
    /**
     * Start a session for grouping multiple traces
     */
    startSession(sessionName?: string): Promise<string>;
    /**
     * Log a single agent execution following the proper Galileo pattern
     */
    logAgentExecution(metrics: AgentMetrics, userInput: string, agentOutput: string, traceName?: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Generate a meaningful trace name from user input
     */
    private generateTraceName;
    /**
     * Log conversation summary
     */
    logConversation(messages: AgentMessage[]): Promise<void>;
    /**
     * Extract message content safely
     */
    private extractMessageContent;
    /**
     * Conclude the current session
     */
    concludeSession(): Promise<void>;
}
//# sourceMappingURL=GalileoLogger.d.ts.map