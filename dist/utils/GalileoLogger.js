"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GalileoAgentLogger = void 0;
const environment_1 = require("../config/environment");
const galileo_1 = require("galileo");
/**
 * Production-grade Galileo logging utility for agent executions and conversations.
 * Sends structured traces and spans to Galileo using the official SDK.
 */
class GalileoAgentLogger {
    logger;
    sessionId;
    constructor() {
        this.logger = new galileo_1.GalileoLogger({
            projectName: environment_1.env.galileo.projectName,
            logStreamName: environment_1.env.galileo.logStream,
        }); // <-- This bypasses the type check
    }
    /**
     * Start a session for grouping multiple traces
     * @param sessionName Optional name for the session
     * @returns Session ID
     */
    async startSession(sessionName) {
        // Generate a session ID with meaningful name
        const sessionPrefix = sessionName ? sessionName.replace(/\s+/g, '-').toLowerCase() : 'stripe-agent-session';
        this.sessionId = `${sessionPrefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        console.log(`📊 Generated session ID: ${this.sessionId} (${sessionName || 'Default Session'})`);
        return this.sessionId;
    }
    /**
     * Get the current session ID
     */
    getCurrentSessionId() {
        return this.sessionId;
    }
    /**
     * Generate a meaningful trace name from user input
     * @param input User input string
     * @returns Descriptive trace name
     */
    generateTraceNameFromInput(input) {
        // Clean and truncate input for trace name
        const cleanInput = input.replace(/[^\w\s]/g, '').trim();
        const words = cleanInput.split(/\s+/).slice(0, 4); // Take first 4 words
        const truncated = words.join(' ');
        if (truncated.length === 0) {
            return 'Stripe Agent - General Request';
        }
        return `Stripe Agent - ${truncated}`;
    }
    /**
     * Log a single agent execution to Galileo as a trace with spans for tool calls.
     * @param metrics Agent execution metrics
     * @param input User input
     * @param output Agent output
     * @param traceName Optional name for the trace
     * @param metadata Optional additional metadata
     */
    async logAgentExecution(metrics, input, output, traceName, metadata) {
        try {
            // Generate a meaningful trace name based on input
            const defaultTraceName = this.generateTraceNameFromInput(input);
            const finalTraceName = traceName || defaultTraceName;
            // Start a new trace for the agent execution
            const trace = this.logger.startTrace({
                input: this.safeStringify(input),
                output: this.safeStringify(output),
                name: finalTraceName,
                createdAt: Date.now() * 1000000, // nanoseconds
                metadata: metadata ? Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, this.safeStringify(v)])) : undefined,
                tags: ['agent', 'stripe'],
            });
            // Add a workflow span for the agent's overall workflow
            this.logger.addWorkflowSpan({
                input: this.safeStringify(input),
                output: this.safeStringify(output),
                name: `Stripe Agent Workflow - ${finalTraceName}`,
                createdAt: Date.now() * 1000000,
                metadata: Object.fromEntries(Object.entries({
                    ...(metadata || {}),
                    executionTime: String(metrics.executionTime),
                    toolsUsed: (metrics.toolsUsed || []).join(','),
                    success: String(metrics.success),
                    agentType: 'stripe-agent'
                }).map(([k, v]) => [k, this.safeStringify(v)])),
                tags: ['workflow', 'stripe-agent'],
            });
            // Add tool spans for each tool used
            if (metrics.toolsUsed && metrics.toolsUsed.length > 0) {
                metrics.toolsUsed.forEach((tool, index) => {
                    this.logger.addToolSpan({
                        input: this.safeStringify(`Stripe Agent Tool Call: ${tool}`),
                        output: this.safeStringify(`Stripe agent successfully executed ${tool} tool`),
                        name: `Stripe Agent - ${tool}`,
                        createdAt: Date.now() * 1000000,
                        metadata: {
                            toolName: this.safeStringify(tool),
                            stepNumber: String(index + 1),
                            agentType: 'stripe-agent',
                            toolType: this.safeStringify(tool),
                            spanType: 'tool'
                        },
                        tags: ['tool', 'stripe-agent', 'stripe'],
                    });
                });
            }
            // Add tool span for the Stripe agent's conversation processing
            this.logger.addToolSpan({
                input: this.safeStringify(`Stripe Agent Processing: ${input}`),
                output: this.safeStringify(`Stripe Agent Response: ${output}`),
                name: 'Stripe Agent - Conversation Processing',
                createdAt: Date.now() * 1000000,
                metadata: {
                    agentType: 'stripe-agent',
                    toolType: 'conversation-processing',
                    spanType: 'tool',
                    temperature: '0.1',
                    success: String(metrics.success),
                    errorType: this.safeStringify(metrics.errorType || 'none'),
                    executionTime: String(metrics.executionTime || 0)
                },
                tags: ['tool', 'stripe-agent', 'conversation'],
            });
            // Conclude the workflow span
            if (typeof this.logger.conclude === 'function') {
                try {
                    this.logger.conclude({
                        output: this.safeStringify(metrics.success ? 'Workflow completed successfully' : 'Workflow failed'),
                        durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
                        statusCode: metrics.success ? 200 : 500,
                    });
                }
                catch (error) {
                    console.warn('Failed to conclude workflow span:', error);
                }
            }
            // Conclude the trace to complete this agent execution
            if (typeof this.logger.conclude === 'function') {
                try {
                    this.logger.conclude({
                        output: this.safeStringify(output),
                        durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
                        statusCode: metrics.success ? 200 : 500,
                    });
                }
                catch (error) {
                    console.warn('Failed to conclude trace:', error);
                }
            }
            // Flush this individual trace
            await this.logger.flush();
        }
        catch (error) {
            console.error('Failed to log to Galileo:', error);
        }
    }
    /**
     * Helper function to safely convert any value to string for Galileo
     * @param value Any value to convert
     * @returns Safe string representation
     */
    safeStringify(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            }
            catch {
                return String(value);
            }
        }
        return String(value);
    }
    /**
     * Helper function to safely extract content from message
     * @param msg Message object
     * @returns Safe string content
     */
    extractMessageContent(msg) {
        if (!msg)
            return '';
        // Handle if content is already a string
        if (typeof msg.content === 'string') {
            return msg.content;
        }
        // Handle if content is an object (like from LangChain)
        if (msg.content && typeof msg.content === 'object') {
            // Try to extract text from common LangChain message formats
            if (msg.content.text) {
                return this.safeStringify(msg.content.text);
            }
            if (msg.content.content) {
                return this.safeStringify(msg.content.content);
            }
            // Fallback to stringifying the object
            return this.safeStringify(msg.content);
        }
        // Handle cases where msg itself might be the content
        if (typeof msg === 'string') {
            return msg;
        }
        // Final fallback
        return this.safeStringify(msg);
    }
    /**
     * Log session completion and create tool spans for conversation flow
     * @param messages Array of AgentMessage objects
     */
    async logConversation(messages) {
        try {
            console.log(`📊 Session completed with ${messages.length} total messages:`);
            // Filter and validate messages
            const validMessages = messages.filter(msg => msg && (msg.role || msg.content));
            // Create a trace for the conversation flow
            const conversationTrace = this.logger.startTrace({
                input: `Stripe Agent Conversation Session with ${validMessages.length} messages`,
                output: 'Conversation session completed',
                name: 'Stripe Agent - Conversation Session',
                createdAt: Date.now() * 1000000,
                metadata: {
                    messageCount: String(validMessages.length),
                    sessionId: this.sessionId || 'unknown',
                    agentType: 'stripe-agent'
                },
                tags: ['conversation', 'stripe-agent', 'session'],
            });
            // Add tool spans for each message exchange
            validMessages.forEach((msg, index) => {
                try {
                    const content = this.extractMessageContent(msg);
                    const role = msg.role || 'unknown';
                    this.logger.addToolSpan({
                        input: `[${role}] ${content}`,
                        output: `Message ${index + 1} processed`,
                        name: `Stripe Agent - Message ${index + 1} (${role})`,
                        createdAt: Date.now() * 1000000,
                        metadata: {
                            messageIndex: String(index + 1),
                            role: String(role),
                            agentType: 'stripe-agent',
                            toolType: 'message-processing',
                            spanType: 'tool',
                            messageLength: String(content.length)
                        },
                        tags: ['tool', 'stripe-agent', 'message', String(role)],
                    });
                    // Safe logging with proper content extraction
                    const displayContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
                    console.log(`  ${index + 1}. [${role}] ${displayContent}`);
                }
                catch (msgError) {
                    console.warn(`Failed to process message ${index + 1}:`, msgError);
                }
            });
            // Conclude the conversation trace
            if (typeof this.logger.conclude === 'function') {
                try {
                    this.logger.conclude({
                        output: this.safeStringify(`Conversation session with ${validMessages.length} messages completed successfully`),
                        durationNs: undefined,
                        statusCode: 200,
                    });
                }
                catch (error) {
                    console.warn('Failed to conclude conversation trace:', error);
                }
            }
            await this.logger.flush();
            console.log(`📋 All ${validMessages.length} interactions have been logged as tool spans to Galileo.`);
        }
        catch (error) {
            console.error('Failed to log conversation summary:', error);
        }
    }
    /**
     * Flush all pending traces to Galileo
     */
    async flushTraces() {
        try {
            console.log('Flushing traces...');
            await this.logger.flush();
            console.log('Successfully flushed traces.');
        }
        catch (error) {
            console.error('Failed to flush traces to Galileo:', error);
        }
    }
    /**
     * Terminate the current session and ensure all traces are flushed
     */
    async concludeSession() {
        try {
            console.log('📊 Concluding session and flushing any remaining traces...');
            // Just flush any remaining traces - individual traces are already concluded
            await this.flushTraces();
            // Clear the session
            this.sessionId = undefined;
            console.log('✅ Session concluded successfully');
        }
        catch (error) {
            console.error('Failed to conclude session:', error);
        }
    }
}
exports.GalileoAgentLogger = GalileoAgentLogger;
//# sourceMappingURL=GalileoLogger.js.map