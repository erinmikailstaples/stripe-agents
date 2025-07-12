import { StripeAgentToolkit } from '@stripe/agent-toolkit/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createStructuredChatAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { env } from '../config/environment';
import { GalileoAgentLogger } from '../utils/GalileoLogger';
import { 
  AgentMessage, 
  AgentResponse, 
  PaymentRequest, 
  PaymentLinkRequest, 
  CustomerRequest,
  AgentMetrics 
} from '../types';

export class StripeAgent {
  private stripeToolkit!: StripeAgentToolkit;
  private llm!: ChatOpenAI;
  private agentExecutor!: AgentExecutor;
  private conversationHistory: AgentMessage[] = [];
  private galileoLogger: GalileoAgentLogger;

  constructor() {
    this.galileoLogger = new GalileoAgentLogger();
    this.initializeStripeToolkit();
    this.initializeLLM();
    this.initializeAgent();
  }

  private initializeStripeToolkit(): void {
    this.stripeToolkit = new StripeAgentToolkit({
      secretKey: env.stripe.secretKey,
      configuration: {
        actions: {
          paymentLinks: {
            create: true,
          },
          customers: {
            create: true,
            read: true,
          },
          products: {
            create: true,
            read: true,
          },
          prices: {
            create: true,
            read: true,
          },
          invoices: {
            create: true,
            update: true,
          }, 
        },
      },
    });
  }

  private initializeLLM(): void {
    this.llm = new ChatOpenAI({
      openAIApiKey: env.openai.apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
    });
  }

  private async initializeAgent(): Promise<void> {
    const tools = this.stripeToolkit.getTools();
    
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are ${env.agent.name}, ${env.agent.description}.
You have access to the following tools: {tool_names}
{tools}

You help users with Stripe payment operations including:
- Creating payment links for products
- Managing customers
- Creating and managing products and prices
- Handling invoices

Always be helpful, accurate, and secure when handling payment information.
If you're unsure about something, ask for clarification rather than making assumptions.

When creating payment links or handling money amounts, always confirm the details with the user first.`],
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    // TypeScript's type system cannot handle the deep generics in createStructuredChatAgent, but this is safe at runtime.
    // @ts-ignore
    const agent = await createStructuredChatAgent({
      llm: this.llm,
      tools,
      prompt: prompt as any,
    });

    this.agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      maxIterations: 10,
    });
  }

  async processMessage(userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Process the message with the agent
      const result = await this.agentExecutor.invoke({
        input: userMessage,
        agent_scratchpad: [],
      });

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: result.output,
        timestamp: new Date(),
      });

      const executionTime = Date.now() - startTime;
      
      // Log metrics to Galileo
      await this.logMetrics({
        executionTime,
        success: true,
        toolsUsed: this.extractToolsUsed(result),
      }, userMessage, result.output);

      return {
        success: true,
        message: result.output,
        data: {
          executionTime,
          toolsUsed: this.extractToolsUsed(result),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error metrics to Galileo
      await this.logMetrics({
        executionTime,
        success: false,
        toolsUsed: [],
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      }, userMessage, errorMessage);

      return {
        success: false,
        message: 'I encountered an error while processing your request. Please try again.',
        error: errorMessage,
      };
    }
  }

  private extractToolsUsed(result: any): string[] {
    // Extract tool names from the agent execution result
    // This is a simplified implementation
    const toolsUsed: string[] = [];
    if (result.intermediateSteps) {
      for (const step of result.intermediateSteps) {
        if (step.action && step.action.tool) {
          toolsUsed.push(step.action.tool);
        }
      }
    }
    return toolsUsed;
  }

  private async logMetrics(metrics: AgentMetrics, input?: string, output?: string): Promise<void> {
    if (input && output) {
      await this.galileoLogger.logAgentExecution(metrics, input, output);
    }
  }

  // Convenience methods for common operations
  async createPaymentLink(request: PaymentLinkRequest): Promise<AgentResponse> {
    const message = `Create a payment link for "${request.productName}" with amount ${request.amount} ${request.currency.toUpperCase()}`;
    return this.processMessage(message);
  }

  async createCustomer(request: CustomerRequest): Promise<AgentResponse> {
    const message = `Create a new customer with email ${request.email}${request.name ? ` and name ${request.name}` : ''}`;
    return this.processMessage(message);
  }

  getConversationHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  clearConversationHistory(): void {
    this.conversationHistory = [];
  }
}