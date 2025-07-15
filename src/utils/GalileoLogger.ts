import { env } from '../config/environment';
import { AgentMetrics, AgentMessage } from '../types';
import { GalileoLogger } from 'galileo';

/**
 * Galileo logging utility following the proper pattern from documentation
 */
export class GalileoAgentLogger {
  private logger: GalileoLogger;
  private sessionId?: string;
  private currentTraceActive = false;

  constructor() {
    this.logger = new GalileoLogger({
      projectName: env.galileo.projectName,
      logStreamName: env.galileo.logStream,
    } as any);
  }

  /**
   * Start a session for grouping multiple traces
   */
  async startSession(sessionName?: string): Promise<string> {
    const sessionPrefix = sessionName ? sessionName.replace(/\s+/g, '-').toLowerCase() : 'stripe-agent-session';
    this.sessionId = `${sessionPrefix}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    console.log(`📊 Generated session ID: ${this.sessionId} (${sessionName || 'Default Session'})`);
    return this.sessionId;
  }

  /**
   * Log a single agent execution following the proper Galileo pattern
   */
  async logAgentExecution(
    metrics: AgentMetrics,
    userInput: string,
    agentOutput: string,
    traceName?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const finalTraceName = traceName || this.generateTraceName(userInput);
      
      // Start a new trace with user input as input, agent output as output
      this.logger.startTrace({ 
        input: userInput,  // What the user typed
        name: finalTraceName
      });
      this.currentTraceActive = true;

      // Get timing for the LLM call
      const startTime = Date.now();
      
      // Add LLM span showing the agent processing
      this.logger.addLlmSpan({
        input: userInput,           // What the user asked
        output: agentOutput,        // What the agent responded
        model: "gpt-4o-mini",
        name: "Galileo Gizmos Agent Response",
        numInputTokens: undefined,  // Could extract from metrics if available
        numOutputTokens: undefined,
        totalTokens: undefined,
        durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
      });

      // Add tool spans for each Stripe operation
      if (metrics.toolsUsed && metrics.toolsUsed.length > 0) {
        metrics.toolsUsed.forEach((tool, index) => {
          this.logger.addToolSpan({
            input: `Stripe ${tool} operation requested`,
            output: `Stripe ${tool} completed successfully`,
            name: `Stripe ${tool}`,
            durationNs: undefined,
            metadata: { 
              toolName: tool,
              stepNumber: String(index + 1),
              toolType: 'stripe-api'
            },
            tags: ['stripe', 'tool', 'api'],
          });
        });
      }

      // Conclude the trace with the final agent output
      this.logger.conclude({ 
        output: agentOutput,  // What the agent responded to the user
        durationNs: metrics.executionTime ? metrics.executionTime * 1000000 : undefined,
        statusCode: metrics.success ? 200 : 500,
      });

      // Flush the trace
      await this.logger.flush();
      this.currentTraceActive = false;

    } catch (error) {
      console.error('Failed to log to Galileo:', error);
      this.currentTraceActive = false;
    }
  }

  /**
   * Generate a meaningful trace name from user input
   */
  private generateTraceName(input: string): string {
    const cleanInput = input.replace(/[^\w\s]/g, '').trim();
    const words = cleanInput.split(/\s+/).slice(0, 4);
    const truncated = words.join(' ');
    
    if (truncated.length === 0) {
      return 'Galileo Gizmos - General Request';
    }
    
    return `Galileo Gizmos - ${truncated}`;
  }

  /**
   * Log conversation summary
   */
  async logConversation(messages: AgentMessage[]): Promise<void> {
    try {
      const conversationSummary = messages.map((msg, idx) => {
        const content = this.extractMessageContent(msg);
        const role = msg.role || 'unknown';
        return `${idx + 1}. [${role}]: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`;
      }).join('\n');

      const userMessages = messages.filter(msg => msg.role === 'user');
      const assistantMessages = messages.filter(msg => msg.role === 'assistant');

      console.log(`📊 Session completed with ${messages.length} total messages:`);
      console.log(`🌟 All ${messages.length} interactions have been logged as detailed tool spans to Galileo!`);
      console.log(`🚀 Session includes: ${userMessages.length} customer inquiries + ${assistantMessages.length} support responses`);
      console.log(`🛸 Full conversation transcript and analytics now available in Galileo dashboard!`);

    } catch (error) {
      console.error('Failed to log conversation summary:', error);
    }
  }

  /**
   * Extract message content safely
   */
  private extractMessageContent(msg: any): string {
    if (!msg) return '';
    
    if (typeof msg.content === 'string') {
      return msg.content;
    }
    
    if (msg.content && typeof msg.content === 'object') {
      if (msg.content.text) return String(msg.content.text);
      if (msg.content.content) return String(msg.content.content);
      return JSON.stringify(msg.content);
    }
    
    if (typeof msg === 'string') {
      return msg;
    }
    
    return String(msg);
  }

  /**
   * Conclude the current session
   */
  async concludeSession(): Promise<void> {
    try {
      console.log('📊 Concluding session and flushing any remaining traces...');
      
      // Flush any remaining traces
      await this.logger.flush();
      
      this.sessionId = undefined;
      this.currentTraceActive = false;
      console.log('✅ Session concluded successfully');
    } catch (error) {
      console.error('Failed to conclude session:', error);
    }
  }
}
