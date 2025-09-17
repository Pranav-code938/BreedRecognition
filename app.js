// Application state
let model = null;
let isModelLoaded = false;
let currentImage = null;
let currentPredictions = [];

// Model URL from your Teachable Machine
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/7AHQ0KxaX/";

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadModel();
    setupEventListeners();
    displayHistory();
});

// Load TensorFlow model
async function loadModel() {
    try {
        console.log('Loading model...');
        model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
        isModelLoaded = true;
        console.log('Model loaded successfully');
    } catch (error) {
        console.error('Error loading model:', error);
        showNotification('Error loading AI model. Please refresh the page.', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    const cameraBtn = document.getElementById('camera-btn');
    const galleryBtn = document.getElementById('gallery-btn');
    const cameraInput = document.getElementById('camera-input');
    const galleryInput = document.getElementById('gallery-input');
    const scanBtn = document.getElementById('scan-btn');
    const newScanBtn = document.getElementById('new-scan');
    const saveResultBtn = document.getElementById('save-result');
    const historyBtn = document.getElementById('history-btn');
    const closeHistoryBtn = document.getElementById('close-history');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Camera button - opens camera
    cameraBtn.addEventListener('click', () => {
        cameraInput.click();
    });

    // Gallery button - opens gallery
    galleryBtn.addEventListener('click', () => {
        galleryInput.click();
    });

    // Camera input change
    cameraInput.addEventListener('change', handleFileSelect);

    // Gallery input change  
    galleryInput.addEventListener('change', handleFileSelect);

    // Scan button
    scanBtn.addEventListener('click', scanImage);

    // New scan button
    newScanBtn.addEventListener('click', resetApp);

    // Save result button
    saveResultBtn.addEventListener('click', saveCurrentResult);

    // History button
    historyBtn.addEventListener('click', showHistory);

    // Close history
    closeHistoryBtn.addEventListener('click', hideHistory);

    // Clear history
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Close modal when clicking outside
    document.getElementById('history-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideHistory();
        }
    });
}

// Handle file selection (keep this function the same)
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

// Update resetApp function to clear both inputs
function resetApp() {
    currentImage = null;
    currentPredictions = [];
    
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('camera-input').value = '';
    document.getElementById('gallery-input').value = '';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.currentTarget.classList.remove('dragover');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processImageFile(files[0]);
    }
}

// Process image file
function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = e.target.result;
        showImagePreview(currentImage);
    };
    reader.readAsDataURL(file);
}

// Show image preview
function showImagePreview(imageSrc) {
    const previewSection = document.getElementById('preview-section');
    const previewImage = document.getElementById('preview-image');
    const uploadArea = document.getElementById('upload-area');
    
    previewImage.src = imageSrc;
    previewSection.style.display = 'block';
    uploadArea.style.display = 'none';
    
    // Hide results section
    document.getElementById('results-section').style.display = 'none';
}

// Scan image
async function scanImage() {
    if (!currentImage || !isModelLoaded) {
        showNotification('Please wait for the model to load or select an image.', 'error');
        return;
    }

    showLoading(true);

    try {
        // Create image element for prediction
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async function() {
            try {
                // Make prediction
                const predictions = await model.predict(img);
                
                // Sort predictions by probability (highest to lowest)
                const sortedPredictions = predictions
                    .sort((a, b) => b.probability - a.probability)
                    .slice(0, 3); // Get top 3
                
                currentPredictions = sortedPredictions;
                showResults(sortedPredictions);
                showLoading(false);
            } catch (error) {
                console.error('Error making prediction:', error);
                showNotification('Error analyzing image. Please try again.', 'error');
                showLoading(false);
            }
        };
        
        img.onerror = function() {
            showNotification('Error loading image. Please try again.', 'error');
            showLoading(false);
        };
        
        img.src = currentImage;
        
    } catch (error) {
        console.error('Error in scanImage:', error);
        showNotification('Error analyzing image. Please try again.', 'error');
        showLoading(false);
    }
}

// Show loading
function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
}

// Show results
function showResults(predictions) {
    const resultsSection = document.getElementById('results-section');
    const predictionsContainer = document.getElementById('predictions');
    
    // Clear previous results
    predictionsContainer.innerHTML = '';
    
    // Create prediction items
    predictions.forEach((prediction, index) => {
        const confidence = Math.round(prediction.probability * 100); // Convert to percentage
        const predictionItem = createPredictionItem(prediction.className, confidence, index + 1);
        predictionsContainer.appendChild(predictionItem);
    });
    
    resultsSection.style.display = 'block';
    
    // Scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Create prediction item
function createPredictionItem(breedName, confidence, rank) {
    const item = document.createElement('div');
    item.className = `prediction-item rank-${rank}`;
    
    item.innerHTML = `
        <div style="display: flex; align-items: center;">
            <div class="rank-badge">${rank}</div>
            <div class="breed-name">${breedName}</div>
        </div>
        <div class="confidence">${confidence}%</div>
    `;
    
    return item;
}

// Reset app
function resetApp() {
    currentImage = null;
    currentPredictions = [];
    
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('file-input').value = '';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Save current result
function saveCurrentResult() {
    if (currentPredictions.length === 0) {
        showNotification('No results to save.', 'error');
        return;
    }

    const result = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        predictions: currentPredictions.map(p => ({
            breed: p.className,
            confidence: Math.round(p.probability * 100)
        })),
        topBreed: currentPredictions[0].className,
        topConfidence: Math.round(currentPredictions[0].probability * 100)
    };

    // Get existing history
    let history = getHistory();
    history.unshift(result); // Add to beginning
    
    // Keep only last 50 results
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    // Save to localStorage
    localStorage.setItem('breedScanHistory', JSON.stringify(history));
    
    showNotification('Result saved to history!', 'success');
}

// Get history from localStorage
function getHistory() {
    try {
        const history = localStorage.getItem('breedScanHistory');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error reading history:', error);
        return [];
    }
}

// Show history modal
function showHistory() {
    const modal = document.getElementById('history-modal');
    displayHistory();
    modal.style.display = 'flex';
}

// Hide history modal
function hideHistory() {
    const modal = document.getElementById('history-modal');
    modal.style.display = 'none';
}

// Display history
function displayHistory() {
    const historyList = document.getElementById('history-list');
    const history = getHistory();
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No scan history yet.<br>Start scanning breeds to build your history!</div>';
        return;
    }
    
    historyList.innerHTML = '';
    
    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const date = new Date(item.timestamp).toLocaleString();
        
        historyItem.innerHTML = `
            <div class="history-breed">${item.topBreed}</div>
            <div class="history-confidence">${item.topConfidence}% confidence</div>
            <div class="history-date">${date}</div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// Clear history
function clearHistory() {
    if (confirm('Are you sure you want to clear all scan history?')) {
        localStorage.removeItem('breedScanHistory');
        displayHistory();
        showNotification('History cleared!', 'success');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#FF6B6B' : type === 'success' ? '#32CD32' : '#FFD700'};
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        z-index: 2000;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
