class GalileoGizmosChat {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.loading = document.getElementById('loading');
        this.floatingGizmo = document.getElementById('floatingGizmo');
        
        this.isProcessing = false;
        this.conversation = [];
        this.sessionId = null;
        
        this.initializeEventListeners();
        this.generateStars();
        this.initializeWebSocket();
    }

    initializeEventListeners() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Tool buttons
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.addEventListener('click', () => this.handleToolClick(btn.dataset.tool));
        });
        
        // Example buttons
        document.querySelectorAll('.example-item').forEach(item => {
            item.addEventListener('click', () => this.sendExampleMessage(item.dataset.example));
        });
        
        // Floating gizmo easter egg
        this.floatingGizmo.addEventListener('click', () => this.showGizmoMessage());
    }

    generateStars() {
        const stars = document.getElementById('stars');
        const numStars = 100;
        
        for (let i = 0; i < numStars; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.width = Math.random() * 3 + 1 + 'px';
            star.style.height = star.style.width;
            star.style.animationDelay = Math.random() * 3 + 's';
            stars.appendChild(star);
        }
    }

    initializeWebSocket() {
        // For now, we'll use HTTP requests
        // In a real deployment, you might want WebSocket for real-time updates
        console.log('🚀 Galileo\'s Gizmos Chat Interface Initialized');
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;
        
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.setProcessing(true);
        
        try {
            const response = await this.callAgent(message);
            this.addMessage('assistant', response.message, response.data);
        } catch (error) {
            this.addMessage('assistant', `🚨 Houston, we have a problem! ${error.message}`, null, true);
        } finally {
            this.setProcessing(false);
        }
    }

    async callAgent(message) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message,
                    sessionId: this.sessionId 
                })
            });

            if (!response.ok) {
                throw new Error('Failed to communicate with Gizmo');
            }

            const data = await response.json();
            
            // Store session ID for future requests
            if (data.sessionId) {
                this.sessionId = data.sessionId;
            }
            
            return data;
        } catch (error) {
            // Fallback to mock if backend is not available
            console.warn('Backend not available, using mock responses');
            return await this.getMockResponse(message);
        }
    }

    addMessage(role, content, data = null, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        if (isError) {
            messageDiv.style.borderColor = 'var(--space-red)';
            messageDiv.style.background = 'rgba(239, 68, 68, 0.2)';
        }
        
        const timestamp = new Date().toLocaleTimeString();
        
        let messageHTML = `
            <div class="message-content">${this.formatMessage(content, role)}</div>
            <div class="message-meta">
                ${role === 'user' ? '🚀 You' : '🛸 Gizmo'} • ${timestamp}
            </div>
        `;
        
        if (data && data.toolsUsed && data.toolsUsed.length > 0) {
            messageHTML += `
                <div class="tool-usage">
                    🔧 Tools Used: ${data.toolsUsed.join(', ')} • ⏱️ ${data.executionTime}ms
                </div>
            `;
        }
        
        messageDiv.innerHTML = messageHTML;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Add to conversation history
        this.conversation.push({ role, content, timestamp: new Date(), data });
    }

    formatMessage(content, role) {
        if (role === 'assistant') {
            // Enhanced formatting for assistant messages
            let formatted = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--space-cyan); text-decoration: underline;">$1</a>')
                .replace(/✅/g, '<span style="color: var(--space-green);">✅</span>')
                .replace(/❌/g, '<span style="color: var(--space-red);">❌</span>')
                .replace(/🔗/g, '<span style="color: var(--space-cyan);">🔗</span>');
            
            return formatted;
        }
        
        return content;
    }

    sendExampleMessage(example) {
        this.messageInput.value = example;
        this.sendMessage();
    }

    handleToolClick(tool) {
        const prompts = {
            'payment-link': 'Create a payment link for a space product',
            'customer': 'Add a new customer to our space registry',
            'product': 'Create a new space product',
            'list-products': 'Show me our current space product catalog',
            'invoice': 'Create an invoice for a space mission'
        };
        
        const prompt = prompts[tool];
        if (prompt) {
            this.messageInput.value = prompt;
            this.messageInput.focus();
        }
    }

    showGizmoMessage() {
        const messages = [
            "🛸 *Beep boop* Gizmo here! Ready for space commerce!",
            "🌌 The cosmos are infinite, and so are your sales possibilities!",
            "🚀 *Whirrs excitedly* Another satisfied space customer!",
            "⭐ Did someone say interstellar transactions?",
            "🎯 *Calculates trajectory* Your business is going to the moon!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        this.addMessage('system', randomMessage);
    }

    setProcessing(processing) {
        this.isProcessing = processing;
        this.sendBtn.disabled = processing;
        this.loading.classList.toggle('active', processing);
        
        if (processing) {
            this.sendBtn.textContent = '🔄 Processing...';
        } else {
            this.sendBtn.textContent = '🚀 Launch';
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async getMockResponse(message) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Mock responses based on message content
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('payment link')) {
            return {
                success: true,
                message: `🚀 Payment link created successfully! I've set up your space commerce portal:

✅ **Payment Link Created Successfully!**
🔗 **Click here to purchase**: https://buy.stripe.com/test_mock_${Date.now()}

🌟 Your customers can now click this link to complete their space adventure purchase!`,
                data: {
                    executionTime: 1500 + Math.random() * 1000,
                    toolsUsed: ['create_product', 'create_price', 'create_payment_link']
                }
            };
        } else if (lowerMessage.includes('customer')) {
            return {
                success: true,
                message: `👨‍🚀 Space explorer added to our cosmic registry!

✅ **Customer Created Successfully!**
🆔 Customer ID: cus_mock_${Date.now()}
📧 Email: Registered in our space database
🌟 Status: Ready for interstellar missions!`,
                data: {
                    executionTime: 800 + Math.random() * 500,
                    toolsUsed: ['create_customer']
                }
            };
        } else if (lowerMessage.includes('product')) {
            return {
                success: true,
                message: `🌟 Cosmic gadget launched into our product catalog!

✅ **Product Created Successfully!**
🛸 Product ID: prod_mock_${Date.now()}
🚀 Status: Ready for space commerce
🌌 Now available in Galileo's Gizmos store!`,
                data: {
                    executionTime: 1200 + Math.random() * 800,
                    toolsUsed: ['create_product']
                }
            };
        } else if (lowerMessage.includes('catalog') || lowerMessage.includes('list')) {
            return {
                success: true,
                message: `📦 Here's your cosmic product catalog:

🔭 **Quantum Telescope Kit** - $299.99
🚀 **Mars Explorer Package** - $1,999.99
🌟 **Nebula Navigation System** - $599.99
🛸 **Zero-G Training Module** - $799.99
⭐ **Cosmic Discovery Box** - $49.99/month

🌌 All products are ready for interstellar shipping!`,
                data: {
                    executionTime: 600 + Math.random() * 400,
                    toolsUsed: ['list_products']
                }
            };
        } else {
            return {
                success: true,
                message: `🛸 I'm Gizmo, your space commerce assistant! I can help you with:

💳 **Payment Links** - Create checkout links for space products
👨‍🚀 **Customer Management** - Add space explorers to your registry  
🌟 **Product Catalog** - Manage your cosmic inventory
📄 **Invoicing** - Generate bills for space missions
🔄 **Subscriptions** - Set up recurring space deliveries

🚀 Try asking me something like "Create a payment link for the Mars Explorer Kit"!`,
                data: {
                    executionTime: 400 + Math.random() * 200,
                    toolsUsed: []
                }
            };
        }
    }
}

// Initialize the chat interface
document.addEventListener('DOMContentLoaded', () => {
    // Use the main chat interface (with backend fallback to mock)
    const chat = new GalileoGizmosChat();
    
    // Add some startup animation
    setTimeout(() => {
        chat.addMessage('system', '🌟 Galileo\'s Gizmos systems online! All space commerce tools ready.');
    }, 1000);
});

// Add some cosmic ambiance
setInterval(() => {
    const colors = ['#06b6d4', '#6b46c1', '#10b981', '#f59e0b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.documentElement.style.setProperty('--current-glow', randomColor);
}, 5000);
