// Cattle Breed Scanner App JavaScript
class CattleBreedScanner {
    constructor() {
        this.model = null;
        this.modelURL = "https://teachablemachine.withgoogle.com/models/7AHQ0KxaX/";
        this.history = [];
        this.currentState = 'initial';
        this.currentImage = null;
        this.currentResult = null;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadModel();
    }
    
    bindEvents() {
        // Button events
        document.getElementById('take-photo-btn').addEventListener('click', () => this.takePhoto());
        document.getElementById('upload-btn').addEventListener('click', () => this.uploadImage());
        document.getElementById('view-history-btn').addEventListener('click', () => this.showHistory());
        document.getElementById('save-result-btn').addEventListener('click', () => this.saveResult());
        document.getElementById('analyze-another-btn').addEventListener('click', () => this.analyzeAnother());
        document.getElementById('back-to-main-btn').addEventListener('click', () => this.backToMain());
        
        // File input events
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('gallery-input').addEventListener('change', (e) => this.handleFileSelect(e));
    }
    
    async loadModel() {
        try {
            console.log('Loading AI model...');
            const modelURL = this.modelURL + "model.json";
            const metadataURL = this.modelURL + "metadata.json";
            
            this.model = await tmImage.load(modelURL, metadataURL);
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Error loading model:', error);
            this.showError('Failed to load AI model. Please refresh and try again.');
        }
    }
    
    takePhoto() {
        // Trigger camera input (with capture attribute for camera)
        const fileInput = document.getElementById('file-input');
        fileInput.setAttribute('capture', 'environment');
        fileInput.click();
    }
    
    uploadImage() {
        // Trigger gallery input (without capture attribute)
        const galleryInput = document.getElementById('gallery-input');
        galleryInput.removeAttribute('capture');
        galleryInput.click();
    }
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file.');
            return;
        }
        
        // Show loading state
        this.setState('loading');
        
        try {
            // Create image element for processing
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = async () => {
                // Set canvas size to match image aspect ratio, max 400px
                const maxSize = 400;
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Store current image for display
                this.currentImage = canvas.toDataURL();
                
                // Predict breed
                await this.predictBreed(canvas);
            };
            
            img.onerror = () => {
                this.showError('Error loading image. Please try another image.');
                this.setState('initial');
            };
            
            // Create object URL for the image
            img.src = URL.createObjectURL(file);
            
        } catch (error) {
            console.error('Error processing image:', error);
            this.showError('Error processing image. Please try again.');
            this.setState('initial');
        }
        
        // Clear file input
        event.target.value = '';
    }
    
    async predictBreed(imageElement) {
        if (!this.model) {
            this.showError('AI model not loaded. Please refresh the page.');
            this.setState('initial');
            return;
        }
        
        try {
            const predictions = await this.model.predict(imageElement);
            
            // Find the prediction with highest probability
            let topPrediction = predictions[0];
            for (let i = 1; i < predictions.length; i++) {
                if (predictions[i].probability > topPrediction.probability) {
                    topPrediction = predictions[i];
                }
            }
            
            this.currentResult = {
                breed: topPrediction.className,
                confidence: Math.round(topPrediction.probability * 100),
                timestamp: new Date().toISOString()
            };
            
            this.showResults();
            
        } catch (error) {
            console.error('Error predicting breed:', error);
            this.showError('Error analyzing image. Please try again.');
            this.setState('initial');
        }
    }
    
    showResults() {
        this.setState('results');
        
        // Display the image
        const previewImg = document.getElementById('preview-image');
        previewImg.src = this.currentImage;
        
        // Display the results
        document.getElementById('breed-name').textContent = this.currentResult.breed;
        document.getElementById('confidence').textContent = `${this.currentResult.confidence}% confident`;
    }
    
    saveResult() {
        if (!this.currentResult) return;
        
        const historyItem = {
            ...this.currentResult,
            id: Date.now(),
            image: this.currentImage
        };
        
        this.history.unshift(historyItem);
        
        // Show success message
        this.showSuccess('Result saved to history!');
        
        // Update save button to show it's saved
        const saveBtn = document.getElementById('save-result-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
    }
    
    analyzeAnother() {
        this.currentImage = null;
        this.currentResult = null;
        this.setState('initial');
    }
    
    showHistory() {
        this.setState('history');
        this.renderHistory();
    }
    
    backToMain() {
        this.setState('initial');
    }
    
    renderHistory() {
        const historyList = document.getElementById('history-list');
        
        if (this.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <p>No scan history yet. Start by taking a photo or uploading an image!</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = this.history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-content">
                    <div class="history-breed">${item.breed}</div>
                    <div class="history-details">
                        <span class="history-confidence">${item.confidence}% confident</span>
                        <span class="history-date">${this.formatDate(item.timestamp)}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="app.deleteHistoryItem(${item.id})" title="Delete">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2,2h4a2,2,0,0,1,2,2V6"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }
    
    deleteHistoryItem(id) {
        this.history = this.history.filter(item => item.id !== id);
        this.renderHistory();
    }
    
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    setState(newState) {
        // Hide all sections
        const sections = ['initial-state', 'loading-state', 'results-state', 'history-state'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden');
            }
        });
        
        // Show the target section
        const targetSection = document.getElementById(`${newState}-state`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
        
        this.currentState = newState;
        
        // Clear any existing messages when changing state
        this.clearMessages();
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showMessage(message, type) {
        // Remove existing messages
        this.clearMessages();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        // Insert at the top of the current visible section
        const visibleSection = document.getElementById(`${this.currentState}-state`);
        if (visibleSection) {
            visibleSection.insertBefore(messageDiv, visibleSection.firstChild);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv && messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
    
    clearMessages() {
        const messages = document.querySelectorAll('.success-message, .error-message');
        messages.forEach(message => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        });
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CattleBreedScanner();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // We won't register a service worker since we don't have one
        // but this is where it would go for a full PWA
    });
}
