# Setup Guide: Stripe Agent with Galileo Integration

This guide will walk you through setting up the Stripe Agent with Galileo monitoring step by step.

## 🎯 Quick Start

If you want to get started immediately, follow these steps:

1. **Install dependencies** (we'll handle the linter errors after installation)
2. **Set up environment variables**
3. **Run the demo**

## 📦 Step 1: Install Dependencies

Since we have some TypeScript configuration issues to resolve, let's install the dependencies first:

```bash
npm install
```

This will install all the required packages including the missing type definitions.

## 🔧 Step 2: Fix TypeScript Configuration

The current TypeScript configuration needs some adjustments. Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
```

## 🔑 Step 3: Set Up Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Get your API keys:**

   ### Stripe API Key
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Navigate to Developers > API keys
   - Copy your "Secret key" (starts with `sk_test_` for test mode)

   ### OpenAI API Key
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Navigate to API keys
   - Create a new secret key

   ### Galileo API Key
   - Sign up at [Galileo](https://galileo.ai/)
   - Get your API key from the dashboard

3. **Update your `.env` file:**
   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_actual_stripe_key_here
   
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your_actual_openai_key_here
   
   # Galileo Configuration
   GALILEO_API_KEY=your_actual_galileo_key_here
   GALILEO_PROJECT_NAME=stripe-agent-demo
   GALILEO_LOG_STREAM=production
   
   # Agent Configuration
   AGENT_NAME=StripePaymentAgent
   AGENT_DESCRIPTION=An AI agent that helps with Stripe payment operations
   ```

## 🚀 Step 4: Install Missing Dependencies

The current package.json may need some updates. Run:

```bash
# Install the actual Stripe agent toolkit
npm install @stripe/agent-toolkit

# Install LangChain dependencies
npm install langchain @langchain/core langchain-openai

# Install OpenAI SDK
npm install openai

# Install other dependencies
npm install dotenv zod

# Install TypeScript and development dependencies
npm install --save-dev typescript @types/node ts-node

# Install a placeholder for galileo-sdk (since it might not be publicly available yet)
# You may need to replace this with the actual Galileo SDK when available
npm install axios  # For HTTP requests to Galileo API
```

## 🔨 Step 5: Update Package.json Dependencies

Update your `package.json` with the correct dependencies:

```json
{
  "name": "stripe-galileo-agent",
  "version": "1.0.0",
  "description": "A TypeScript agent using Stripe Agent Toolkit with Galileo monitoring",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  },
  "keywords": ["stripe", "agent", "galileo", "typescript", "ai"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@stripe/agent-toolkit": "^1.0.0",
    "langchain": "^0.3.0",
    "langchain-openai": "^0.3.0",
    "@langchain/core": "^0.3.0",
    "openai": "^4.0.0",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0"
  }
}
```

## 🔧 Step 6: Handle Galileo SDK Integration

Since the Galileo SDK might not be publicly available yet, you have a few options:

### Option A: Use HTTP Requests (Recommended for now)

Update the `GalileoLogger.ts` to use HTTP requests instead of a non-existent SDK:

```typescript
// Replace the import in src/utils/GalileoLogger.ts
import axios from 'axios';

// Update the sendToGalileo method to make actual HTTP requests
private async sendToGalileo(logEntry: GalileoLogEntry): Promise<void> {
  try {
    // Replace with actual Galileo API endpoint when available
    const response = await axios.post('https://api.galileo.ai/logs', logEntry, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Logged to Galileo successfully');
  } catch (error) {
    console.log('📊 Galileo Log Entry (simulated):', {
      project: logEntry.projectName,
      stream: logEntry.logStream,
      success: logEntry.success,
      executionTime: `${logEntry.executionTime}ms`,
      toolsUsed: logEntry.toolsUsed,
      errorType: logEntry.errorType,
      timestamp: logEntry.timestamp.toISOString(),
    });
  }
}
```

### Option B: Remove Galileo Integration Temporarily

Comment out Galileo-related code until the SDK is available.

## 🏃‍♂️ Step 7: Build and Run

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Run the demo:**
   ```bash
   npm run dev
   ```

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript Errors:**
   - Make sure all dependencies are installed
   - Check that your `tsconfig.json` is correct
   - Run `npm install @types/node` if you see Node.js type errors

2. **Stripe API Errors:**
   - Verify your Stripe API key is correct
   - Make sure you're using the test key (starts with `sk_test_`)
   - Check that your Stripe account is active

3. **OpenAI API Errors:**
   - Verify your OpenAI API key
   - Check your OpenAI account has credits
   - Make sure the API key has the correct permissions

4. **Galileo Integration Issues:**
   - For now, the Galileo integration is simulated
   - Check the console output for logged metrics
   - Real integration will require the actual Galileo SDK

### Getting Help

If you encounter issues:

1. Check the error messages carefully
2. Verify all environment variables are set
3. Make sure all dependencies are installed
4. Check the TypeScript compilation output
5. Review the console logs for detailed error information

## 🎉 Success!

If everything is set up correctly, you should see:

```
🚀 Starting Stripe Agent with Galileo Integration...
📊 Project: stripe-agent-demo
📈 Log Stream: production
---
🤖 Running example interactions...

📝 Example 1: Create a payment link for a digital product
💬 User: Create a payment link for a digital course called 'TypeScript Mastery' priced at $99 USD
✅ Agent: [Agent response with payment link details]
⏱️  Execution time: 1234ms
🔧 Tools used: create_payment_link, create_product
```

## 🔄 Next Steps

After successful setup:

1. **Customize the agent** for your specific use case
2. **Add more Stripe operations** as needed
3. **Integrate with real Galileo API** when available
4. **Add proper error handling** for production use
5. **Implement user authentication** if needed
6. **Add rate limiting** for production deployment
7. **Set up proper logging** for production monitoring

## 📚 Additional Resources

- [Stripe Agent Toolkit GitHub](https://github.com/stripe/agent-toolkit)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LangChain Documentation](https://js.langchain.com/)
- [Galileo Documentation](https://docs.galileo.ai/)

Remember to never commit your API keys to version control!