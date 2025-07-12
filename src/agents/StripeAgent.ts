import { StripeAgentToolkit } from '@stripe/agent-toolkit/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createStructuredChatAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { pull } from 'langchain/hub';
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
    
    // Use the pre-built structured chat agent prompt from LangChain Hub
    const prompt = await pull('hwchase17/structured-chat-agent') as any;

    // @ts-ignore
    const agent = await createStructuredChatAgent({
      llm: this.llm,
      tools,
      prompt,
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

      // Process the message with the agent - let LangChain handle agent_scratchpad
      const result = await this.agentExecutor.invoke({
        input: userMessage,
      });

      // Enhance the response to make payment links more prominent
      const enhancedOutput = this.enhanceResponseForPaymentLinks(result.output, result);

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: enhancedOutput,
        timestamp: new Date(),
      });

      const executionTime = Date.now() - startTime;
      
      // Log metrics to Galileo
      await this.logMetrics({
        executionTime,
        success: true,
        toolsUsed: this.extractToolsUsed(result),
      }, userMessage, enhancedOutput);

      return {
        success: true,
        message: enhancedOutput,
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

  private enhanceResponseForPaymentLinks(output: string, result: any): string {
    // Check if a payment link was created by looking at intermediate steps
    let paymentLinkUrl: string | null = null;
    
    if (result.intermediateSteps) {
      for (const step of result.intermediateSteps) {
        if (step.action && step.action.tool === 'create_payment_link' && step.observation) {
          try {
            const observation = JSON.parse(step.observation);
            if (observation.url) {
              paymentLinkUrl = observation.url;
              break;
            }
          } catch (e) {
            // If parsing fails, try to extract URL with regex
            const urlMatch = step.observation.match(/https:\/\/buy\.stripe\.com\/[^\s"]+/);
            if (urlMatch) {
              paymentLinkUrl = urlMatch[0];
              break;
            }
          }
        }
      }
    }

    // If we found a payment link, enhance the response
    if (paymentLinkUrl) {
      const enhancedResponse = `🚀 ${output}

✅ **Payment Link Created Successfully!**
🔗 **Click here to purchase**: ${paymentLinkUrl}

🌟 Your customers can now click this link to complete their space adventure purchase!`;
      
      return enhancedResponse;
    }

    // For other responses, add space-themed enhancement
    const spaceEnhanced = output
      .replace(/customer/gi, '🚀 space explorer')
      .replace(/product/gi, '🌟 cosmic gadget')
      .replace(/created/gi, 'launched into orbit')
      .replace(/successfully/gi, '🛸 successfully');

    return spaceEnhanced;
  }

  private async logMetrics(metrics: AgentMetrics, input?: string, output?: string): Promise<void> {
    if (input && output) {
      // Generate a descriptive trace name based on the input
      const traceName = this.generateTraceName(input);
      await this.galileoLogger.logAgentExecution(metrics, input, output, traceName);
    }
  }

  private generateTraceName(input: string): string {
    // Generate space-themed trace names for Galileo's Gizmos
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('payment link')) {
      return "🚀 Galileo's Gizmos - Launch Payment Portal";
    } else if (lowerInput.includes('customer') && lowerInput.includes('create')) {
      return "👨‍🚀 Galileo's Gizmos - Register Space Explorer";
    } else if (lowerInput.includes('products') && (lowerInput.includes('list') || lowerInput.includes('show'))) {
      return "🌌 Galileo's Gizmos - Browse Cosmic Catalog";
    } else if (lowerInput.includes('subscription') && lowerInput.includes('create')) {
      return "📦 Galileo's Gizmos - Setup Stellar Subscription";
    } else if (lowerInput.includes('create') && lowerInput.includes('product')) {
      return "⭐ Galileo's Gizmos - Add New Space Gadget";
    } else if (lowerInput.includes('create') && lowerInput.includes('price')) {
      return "💫 Galileo's Gizmos - Set Cosmic Pricing";
    } else {
      return "🛸 Galileo's Gizmos - Customer Support";
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