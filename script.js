// Model URLs
const MODEL_PATHS = {
    apple: {
        url: "models/apple_model/",
        name: "Apple"
    },
    tomato: {
        url: "models/tomato_model/",
        name: "Tomato"
    }
};

// Global variables
let model, webcam, labelContainer, maxPredictions;
let isRunning = false;
let currentModel = "apple";
let particles = [];
let canvas, ctx;
let animationId;
let videoDevices = [];
let currentDeviceIndex = 0;

// DOM Elements
document.addEventListener("DOMContentLoaded", function() {
    // Initialize canvas
    setupCanvas();
    
    // Set up event listeners
    document.getElementById("start-btn").addEventListener("click", toggleDetection);
    document.getElementById("apple-model").addEventListener("click", () => switchModel("apple"));
    document.getElementById("tomato-model").addEventListener("click", () => switchModel("tomato"));
    document.getElementById("switch-camera-btn").addEventListener("click", switchCamera);
    
    // Create initial particles
    createParticles("apple");
    
    // Start animation
    animateParticles();
    
    // Check for available cameras
    checkAvailableCameras();
});

// Check for available video devices (cameras)
async function checkAvailableCameras() {
    try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.log("MediaDevices API not supported in this browser");
            return;
        }
        
        // Get all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter for video input devices (cameras)
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Enable/disable camera switch button based on available cameras
        const switchCameraBtn = document.getElementById("switch-camera-btn");
        if (videoDevices.length > 1) {
            switchCameraBtn.disabled = false;
            switchCameraBtn.title = "Switch between available cameras";
        } else {
            switchCameraBtn.disabled = true;
            switchCameraBtn.title = "No additional cameras available";
        }
        
        console.log(`Found ${videoDevices.length} cameras`);
    } catch (error) {
        console.error("Error checking cameras:", error);
    }
}

// Switch to the next available camera
async function switchCamera() {
    if (videoDevices.length <= 1) {
        updateStatus("No additional cameras available");
        return;
    }
    
    // Move to the next camera in the list
    currentDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
    
    // If detection is running, restart it with the new camera
    if (isRunning) {
        // Stop current webcam
        if (webcam) {
            webcam.stop();
        }
        
        // Clear webcam container
        const webcamContainer = document.getElementById("webcam-container");
        webcamContainer.innerHTML = "";
        
        // Reinitialize with new camera
        updateStatus("Switching camera...");
        await initCamera();
        
        // Resume prediction loop
        window.requestAnimationFrame(loop);
    }
    
    updateStatus(`Switched to camera ${currentDeviceIndex + 1}/${videoDevices.length}`);
}

// Set up canvas
function setupCanvas() {
    canvas = document.getElementById("background-canvas");
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }
    
    ctx = canvas.getContext("2d");
    
    // Set canvas size
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener("resize", function() {
        resizeCanvas();
        particles = [];
        createParticles(currentModel);
    });
}

// Resize canvas to window size
function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Create particles
function createParticles(modelType) {
    particles = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 20 + 10,
            speed: Math.random() * 2 + 1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2,
            type: modelType,
            isLeaf: Math.random() > 0.7 // 30% chance to be a leaf
        });
    }
}

// Animate particles
function animateParticles() {
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
        // Update position
        particle.y += particle.speed;
        particle.rotation += particle.rotationSpeed;
        
        // Reset particle if it goes off screen
        if (particle.y > canvas.height) {
            particle.y = -particle.size;
            particle.x = Math.random() * canvas.width;
        }
        
        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation * Math.PI / 180);
        
        if (particle.isLeaf) {
            drawLeaf(ctx, 0, 0, particle.size, particle.type);
        } else {
            drawFruit(ctx, 0, 0, particle.size, particle.type);
        }
        
        ctx.restore();
    });
    
    // Continue animation loop
    animationId = requestAnimationFrame(animateParticles);
}

// Draw fruit
function drawFruit(ctx, x, y, size, type) {
    if (type === "apple") {
        // Draw apple
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Apple stem
        ctx.fillStyle = '#795548';
        ctx.fillRect(x - 1, y - size / 2 - 5, 2, 5);
    } else {
        // Draw tomato
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Tomato stem
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(x, y - size / 2 + 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw leaf
function drawLeaf(ctx, x, y, size, type) {
    if (type === "apple") {
        // Apple leaf
        ctx.fillStyle = '#2ecc71';
    } else {
        // Tomato leaf
        ctx.fillStyle = '#27ae60';
    }
    
    // Draw leaf shape
    ctx.beginPath();
    ctx.moveTo(x, y - size / 3);
    ctx.bezierCurveTo(
        x + size / 2, y - size / 2,
        x + size / 2, y + size / 2,
        x, y + size / 3
    );
    ctx.bezierCurveTo(
        x - size / 2, y + size / 2,
        x - size / 2, y - size / 2,
        x, y - size / 3
    );
    ctx.fill();
    
    // Leaf vein
    ctx.strokeStyle = type === "apple" ? '#27ae60' : '#219653';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 3);
    ctx.lineTo(x, y + size / 3);
    ctx.stroke();
}

// Switch between models
function switchModel(modelType) {
    if (isRunning) {
        stopDetection();
    }
    
    currentModel = modelType;
    document.getElementById("model-name").textContent = MODEL_PATHS[modelType].name;
    
    // Update active button
    document.getElementById("apple-model").classList.toggle("active", modelType === "apple");
    document.getElementById("tomato-model").classList.toggle("active", modelType === "tomato");
    
    // Update UI colors based on model
    document.documentElement.style.setProperty(
        "--primary-color", 
        modelType === "apple" ? "#e74c3c" : "#e67e22"
    );
    
    // Update background animation
    particles = [];
    createParticles(modelType);
    
    updateStatus("Model switched to " + MODEL_PATHS[modelType].name);
}

// Toggle detection on/off
function toggleDetection() {
    if (isRunning) {
        stopDetection();
    } else {
        startDetection();
    }
}

// Start detection
async function startDetection() {
    try {
        updateStatus("Starting...");
        document.getElementById("start-btn").disabled = true;
        
        await init();
        
        isRunning = true;
        document.getElementById("start-btn").querySelector(".btn-text").textContent = "Stop Detection";
        document.getElementById("start-btn").disabled = false;
        
        document.querySelector(".status-dot").classList.add("active");
        updateStatus("Running");
    } catch (error) {
        console.error("Error starting detection:", error);
        updateStatus("Error: " + error.message);
        document.getElementById("start-btn").disabled = false;
    }
}

// Stop detection
function stopDetection() {
    if (webcam) {
        webcam.stop();
    }
    
    // Clear webcam container
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = "";
    
    // Reset label container
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    
    isRunning = false;
    document.getElementById("start-btn").querySelector(".btn-text").textContent = "Start Detection";
    document.querySelector(".status-dot").classList.remove("active");
    updateStatus("Stopped");
}

// Update status message
function updateStatus(message) {
    document.getElementById("status-text").textContent = message;
}

// Initialize the model and webcam
async function init() {
    const modelURL = MODEL_PATHS[currentModel].url + "model.json";
    const metadataURL = MODEL_PATHS[currentModel].url + "metadata.json";

    // Load the model and metadata
    updateStatus("Loading model...");
    
    // Check if the teachablemachine library is available
    if (!window.tmImage) {
        // Try to access it through the global namespace
        if (typeof tmImage !== 'undefined') {
            window.tmImage = tmImage;
        } else {
            throw new Error("Teachable Machine library not found. Make sure the script is loaded correctly.");
        }
    }
    
    model = await window.tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Setup webcam with the selected camera
    await initCamera();
    
    // Create prediction elements
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    
    for (let i = 0; i < maxPredictions; i++) {
        const predictionItem = document.createElement("div");
        predictionItem.className = "prediction-item";
        
        const labelElement = document.createElement("div");
        labelElement.className = "prediction-label";
        
        const barContainer = document.createElement("div");
        barContainer.className = "prediction-bar";
        
        const barFill = document.createElement("div");
        barFill.className = "prediction-fill";
        barFill.style.width = "0%";
        
        const valueElement = document.createElement("div");
        valueElement.className = "prediction-value";
        
        barContainer.appendChild(barFill);
        predictionItem.appendChild(labelElement);
        predictionItem.appendChild(barContainer);
        predictionItem.appendChild(valueElement);
        
        labelContainer.appendChild(predictionItem);
    }
    
    // Start prediction loop
    window.requestAnimationFrame(loop);
}

// Initialize webcam with selected device
async function initCamera() {
    updateStatus("Setting up camera...");
    
    // Setup webcam options
    const flip = true; // whether to flip the webcam
    const size = 300;
    
    // Create webcam with specific device if available
    let cameraOptions = {};
    
    if (videoDevices.length > 0) {
        const deviceId = videoDevices[currentDeviceIndex].deviceId;
        cameraOptions = {
            deviceId: { exact: deviceId }
        };
    }
    
    webcam = new window.tmImage.Webcam(size, size, flip, cameraOptions);
    
    try {
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        
        // Append webcam element to the DOM
        const webcamContainer = document.getElementById("webcam-container");
        webcamContainer.innerHTML = "";
        webcamContainer.appendChild(webcam.canvas);
        
        return true;
    } catch (error) {
        console.error("Error setting up camera:", error);
        updateStatus("Camera error: " + error.message);
        throw error;
    }
}

// Animation loop
async function loop() {
    if (!isRunning) return;
    
    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}

// Make predictions
async function predict() {
    // Predict can take in an image, video or canvas html element
    const prediction = await model.predict(webcam.canvas);
    
    for (let i = 0; i < maxPredictions; i++) {
        const predictionItem = labelContainer.childNodes[i];
        const labelElement = predictionItem.querySelector(".prediction-label");
        const barFill = predictionItem.querySelector(".prediction-fill");
        const valueElement = predictionItem.querySelector(".prediction-value");
        
        const probability = prediction[i].probability.toFixed(2);
        const percentage = Math.round(probability * 100);
        
        labelElement.textContent = prediction[i].className;
        barFill.style.width = percentage + "%";
        valueElement.textContent = percentage + "%";
        
        // Highlight high confidence predictions
        if (percentage > 70) {
            barFill.style.backgroundColor = "#4cd137";
        } else if (percentage > 40) {
            barFill.style.backgroundColor = "#fbc531";
        } else {
            barFill.style.backgroundColor = "#dfe6e9";
        }
    }
}
