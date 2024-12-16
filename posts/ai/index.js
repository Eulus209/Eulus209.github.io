class ChatBot {
    constructor() {
        // 获取DOM元素
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.modelSelect = document.getElementById('modelSelect');
        this.bgSelect = document.getElementById('bgSelect');
        this.currentBgIndex = 0;
        this.messageHistory = [];  // 添加消息历史数组
        this.maxTurns = 5;  // 设置最大对话轮数
        
        this.backgrounds = [
            { path: 'img/bg1.jpg', name: '碧蓝档案' },
            { path: 'img/bg2.jpg', name: '贞德' },
            { path: 'img/bg3.jpg', name: '阿尔托莉雅' },
            { path: 'img/bg4.jpg', name: 'Saber' },
            { path: 'img/bg5.jpg', name: '时崎狂三' }
        ];
        
        // 添加背景切换事件监听
        this.bgSelect.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            if (selectedValue === 'auto') {
                this.startBackgroundRotation();
            } else {
                if (this.rotationInterval) {
                    clearInterval(this.rotationInterval);
                }
                this.changeBackground(selectedValue);
            }
        });

        // 如果默认是自动模式，立即开始轮播
        if (this.bgSelect.value === 'auto') {
            this.startBackgroundRotation();
        }

        // 添加markdown解析器
        this.md = window.markdownit({
            breaks: true,
            linkify: true,
            typographer: true
        });

        // 初始化事件监听
        this.init();
        this.typingSpeed = 1; // 打字速度（毫秒/字符）

        // 修改模型选择的监听器
        this.modelSelect.addEventListener('change', () => {
            this.showTempNotification(`已切换到 ${this.modelSelect.options[this.modelSelect.selectedIndex].text}`);
        });

        this.initBackgroundContainer();

        this.clearButton = document.getElementById('clearButton');
        
        // 添加清空按钮事件监听
        this.clearButton.addEventListener('click', () => this.clearChat());
    }

    init() {
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // 回车发送消息
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async callAPI(message, retryCount = 0) {
        const maxRetries = 3;
        const models = ['gpt-4o-2024-08-06','gpt-4o','claude-3.5-sonnet-20241022', 'gpt-4o-mini'];
        let modelIndex = models.indexOf(this.modelSelect.value);

        const apiKey = 'sk-65794a68624763694f694a49557a49314e694a392e65794a755957316c496a6f695257786861573568587a55314e6a6730587a55314e6a67304969776961574630496a6f784e7a4d304d7a49324e444d7a4c434a6c654841694f6a45334d7a51354d7a45794d7a4e392e5036416852665a6436434d2d79685163737759366356655a50504f742d783355313062674d367455756f67';

        // 构建包含历史的消息数组
        const messages = [
            {
                role: "system",
                content: "You are a helpful assistant."
            },
            ...this.messageHistory,
            {
                role: "user",
                content: message
            }
        ];

        while (modelIndex < models.length) {
            try {
                const response = await fetch('https://api.4chat.me/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        model: models[modelIndex],
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 2000,
                        top_p: 1,
                        frequency_penalty: 0,
                        presence_penalty: 0,
                        stream: false
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API错误响应:', errorText);

                    if ((response.status === 504 || response.status === 400) && retryCount < maxRetries) {
                        console.log(`第 ${retryCount + 1} 次重试...`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                        return this.callAPI(message, retryCount + 1);
                    }

                    throw new Error(`服务暂时不可用 (${response.status})，请稍后再试或切换其他模型`);
                }

                const data = await response.json();

                if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
                    throw new Error('API响应格式不正确，请重试');
                }

                return data.choices[0].message.content;

            } catch (error) {
                console.error('API调用错误:', error);
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('网络连接失败，请检查网络后重试');
                }

                modelIndex++;
                if (modelIndex < models.length) {
                    this.showTempNotification(`切换到模型: ${models[modelIndex]}`);
                } else {
                    throw error;
                }
            }
        }
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // 添加用户消息到历史
        this.messageHistory.push({
            role: "user",
            content: message
        });

        // 添加用户消息到界面
        this.addMessage(message, 'user');
        this.userInput.value = '';

        const loadingIndicator = this.addLoadingIndicator();

        try {
            const response = await this.callAPI(message);
            
            // 添加助手回复到历史
            this.messageHistory.push({
                role: "assistant",
                content: response
            });

            // 保持最近5轮对话
            if (this.messageHistory.length > this.maxTurns * 2) {
                this.messageHistory = this.messageHistory.slice(-this.maxTurns * 2);
            }

            loadingIndicator.remove();
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot-message';
            
            const content = document.createElement('div');
            content.className = 'message-content';
            messageDiv.appendChild(content);
            
            this.chatMessages.appendChild(messageDiv);
            
            await this.typeWriter(content, response);
            content.innerHTML = this.md.render(response);

            this.showModelUsed();

        } catch (error) {
            loadingIndicator.remove();
            this.addMessage(`错误: ${error.message}\n请尝试切换其他模型或稍后重试`, 'bot');
        }
    }

    // 其他辅助方法保持不变
    addLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message';
        loadingDiv.innerHTML = `
            <div class="message-content loading-message">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>`;
        this.chatMessages.appendChild(loadingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        return loadingDiv;
    }

    async typeWriter(element, text) {
        let index = 0;
        const plainText = text.replace(/```[\s\S]*?```/g, code => {
            return `[码块]${code}[/代码块]`;
        });
        
        return new Promise(resolve => {
            const type = () => {
                if (index < plainText.length) {
                    if (plainText.slice(index).startsWith('[代码块]')) {
                        const endIndex = plainText.indexOf('[/代码块]', index);
                        if (endIndex !== -1) {
                            element.textContent = plainText.slice(0, endIndex + 9);
                            index = endIndex + 9;
                        }
                    } else {
                        element.textContent += plainText.charAt(index);
                        index++;
                    }
                    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                    setTimeout(type, this.typingSpeed);
                } else {
                    resolve();
                }
            };
            type();
        });
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const processedText = text.trim().replace(/\n{3,}/g, '\n\n');
        
        if (sender === 'bot') {
            content.innerHTML = this.md.render(processedText);
        } else {
            content.innerHTML = processedText.replace(/\n/g, '<br>');
        }
        
        messageDiv.appendChild(content);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showModelUsed() {
        const modelName = this.modelSelect.options[this.modelSelect.selectedIndex].text;
        const modelInfo = document.createElement('div');
        modelInfo.className = 'model-info';
        modelInfo.textContent = `使用的模型: ${modelName}`;
        
        const separator = document.createElement('div');
        separator.className = 'separator';

        this.chatMessages.appendChild(modelInfo);
        this.chatMessages.appendChild(separator);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChat() {
        this.chatMessages.innerHTML = '';
        this.messageHistory = [];  // 清空消息历史
        this.showTempNotification('聊天记录已清空');
    }

    // 背景相关方法保持不变
    changeBackground(bgPath) {
        if (bgPath === 'default') {
            this.bgContainer.style.opacity = '0';
            setTimeout(() => {
                this.bgContainer.style.backgroundImage = 'none';
                this.bgContainer.style.opacity = '1';
            }, 300);
        } else {
            const img = new Image();
            img.onload = () => {
                this.bgContainer.style.opacity = '0';
                setTimeout(() => {
                    this.bgContainer.style.backgroundImage = `url('${bgPath}')`;
                    this.bgContainer.style.opacity = '1';
                }, 300);
            };
            img.src = bgPath;
        }
    }

    startBackgroundRotation() {
        this.changeBackground(this.backgrounds[this.currentBgIndex].path);
        
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }
        
        this.rotationInterval = setInterval(() => {
            if (this.bgSelect.value === 'auto') {
                this.currentBgIndex = (this.currentBgIndex + 1) % this.backgrounds.length;
                this.changeBackground(this.backgrounds[this.currentBgIndex].path);
            }
        }, 5000);
    }

    showTempNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'temp-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    initBackgroundContainer() {
        this.bgContainer = document.createElement('div');
        this.bgContainer.className = 'background-container';
        document.body.insertBefore(this.bgContainer, document.body.firstChild);
    }
}

// 初始化聊天机器人
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});