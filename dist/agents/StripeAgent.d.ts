import { AgentMessage, AgentResponse, PaymentLinkRequest, CustomerRequest } from '../types';
export declare class StripeAgent {
    private stripeToolkit;
    private llm;
    private agentExecutor;
    private conversationHistory;
    private galileoLogger;
    constructor();
    private initializeStripeToolkit;
    private initializeLLM;
    private initializeAgent;
    processMessage(userMessage: string): Promise<AgentResponse>;
    private extractToolsUsed;
    private enhanceResponseForPaymentLinks;
    private logMetrics;
    private generateTraceName;
    createPaymentLink(request: PaymentLinkRequest): Promise<AgentResponse>;
    createCustomer(request: CustomerRequest): Promise<AgentResponse>;
    getConversationHistory(): AgentMessage[];
    clearConversationHistory(): void;
}
//# sourceMappingURL=StripeAgent.d.ts.map