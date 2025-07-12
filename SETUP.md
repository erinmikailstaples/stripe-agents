# Setup Guide: Stripe Agent with Galileo Integration

This guide will walk you through setting up the Stripe Agent with Galileo Agent Reliability step by step. This is designed for beginners - no prior experience with AI agents required!

## 🎯 Quick Start (5 minutes)

1. **Clone and install**
2. **Set up API keys**
3. **Run the demo**

Let's get you started!

## 📦 Step 1: Clone and Install Dependencies

```bash
# Clone this repository
git clone https://github.com/erinmikailstaples/stripe-agents.git
cd stripe-agents

# Install all dependencies
npm install
```

This installs all required packages including TypeScript, the Stripe Agent Toolkit, and Galileo monitoring tools.

## 🔑 Step 2: Set Up API Keys 

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Get your API keys (you'll need these three services):**

   ### 🔵 Stripe API Key (Required)
   
   - Go to the [Stripe Dashboard](https://dashboard.stripe.com/)
   - Navigate to **Developers > API keys**
   - Copy your **"Secret key"** (starts with `sk_test_` for test mode)
   - **Free account is sufficient for testing**

   ### 🤖 OpenAI API Key (Required)
   
   - Go to the [OpenAI Platform](https://platform.openai.com/)
   - Navigate to **API keys**
   - Create a new secret key
   - **Note**: You'll need credits in your OpenAI account (usually $5-10 is enough for testing)

   ### 📊 Galileo API Key (Required for monitoring)
   
   - Sign up at [Galileo](https://app.galileo.ai/) 
   - Get your API key from the dashboard
   - **Note**: Galileo is free for developers to get started with! 

3. **Update your `.env` file:**
   ```env
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_your_actual_stripe_key_here
   
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your_actual_openai_key_here
   
   # Galileo Configuration
   GALILEO_API_KEY=your_actual_galileo_key_here
   GALILEO_PROJECT=stripe-agent-demo
   GALILEO_LOG_STREAM=production
   
   # Agent Configuration
   AGENT_NAME=StripePaymentAgent
   AGENT_DESCRIPTION=An AI agent that helps with Stripe payment operations
   ```

## 🏃‍♂️ Step 3: Build and Run the Demo

1. **Build the project:**

   ```bash
   npm run build
   ```

2. **Run the demo:**

   ```bash
   npm run dev
   ```

   You should see output like this:

   ```text
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

## 🎉 Success! What Just Happened?

Your agent just:
- ✅ Processed natural language requests
- ✅ Made real Stripe API calls
- ✅ Created products and payment links
- ✅ Logged everything to Galileo for monitoring

## 🚀 What's Next?

### Try These Commands

Talk to your agent using natural language:

```text
"Create a payment link for my online course 'Web Development Basics' priced at $149"
"Add a new customer with email sarah@example.com"
"Show me all active subscriptions"
"Create an invoice for customer cus_1234 with amount $299"
```

### Customize Your Agent

1. **Add new Stripe operations** - Modify [`src/agents/StripeAgent.ts`](file:///Users/erinmikail/GitHub-Local/stripe-agents/src/agents/StripeAgent.ts)
2. **Change the AI model** - Update OpenAI settings in [`src/config/environment.ts`](file:///Users/erinmikail/GitHub-Local/stripe-agents/src/config/environment.ts)
3. **Customize monitoring** - Modify [`src/utils/GalileoLogger.ts`](file:///Users/erinmikail/GitHub-Local/stripe-agents/src/utils/GalileoLogger.ts)

## 🐛 Troubleshooting

### Common Issues

**❌ "Cannot find Stripe API key"**
- Double-check your `.env` file has `STRIPE_SECRET_KEY=sk_test_...`
- Make sure the key starts with `sk_test_` (not `pk_test_`)

**❌ "OpenAI API error"**
- Verify your OpenAI API key in `.env`
- Check you have credits in your OpenAI account at [platform.openai.com](https://platform.openai.com/account/usage)

**❌ "TypeScript compilation errors"**
- Run `npm install` again
- Try `npm run build` to see specific errors

**❌ "Galileo connection issues"**
- Galileo monitoring is optional for testing
- Check console output for logged metrics even if Galileo API fails

### Need Help?

1. Check error messages in the console
2. Verify all API keys are correct in `.env`
3. See the [Stripe documentation](https://stripe.com/docs/agents) 
4. Check [Galileo documentation](https://v2docs.galileo.ai/what-is-galileo) 

## 📚 Learn More

- **[Stripe Agent Toolkit](https://github.com/stripe/agent-toolkit)** - Official Stripe agent tools
- **[Stripe API Docs](https://stripe.com/docs/api)** - Complete Stripe API reference  
- **[OpenAI API Docs](https://platform.openai.com/docs)** - OpenAI API documentation
- **[LangChain Docs](https://js.langchain.com/)** - LangChain framework documentation

## 🔒 Security Note

**Never commit your API keys to git!** Your `.env` file is already in `.gitignore` to keep your keys safe.