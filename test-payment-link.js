const { StripeAgent } = require('./dist/agents/StripeAgent');

async function testPaymentLink() {
  console.log('🚀 Testing payment link creation...');
  
  const agent = new StripeAgent();
  
  const result = await agent.processMessage(
    "Create a payment link for the Jupiter Moon Base Kit for $799"
  );
  
  console.log('✅ Result:', result.message);
  console.log('🔧 Tools used:', result.data?.toolsUsed || 'None');
}

testPaymentLink().catch(console.error);
