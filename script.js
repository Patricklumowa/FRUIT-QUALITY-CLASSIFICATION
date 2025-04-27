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
        
        // Request camera permission first to get accurate device list
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Get all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter for video input devices (cameras)
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        console.log("Available cameras:", videoDevices);
        
        // Enable/disable camera switch button based on available cameras
        const switchCameraBtn = document.getElementById("switch-camera-btn");
        if (videoDevices.length > 1) {
            switchCameraBtn.disabled = false;
            switchCameraBtn.title = `Switch between ${videoDevices.length} available cameras`;
        } else {
            switchCameraBtn.disabled = true;
            switchCameraBtn.title = "No additional cameras available";
        }
        
        console.log(`Found ${videoDevices.length} cameras`);
    } catch (error) {
        console.error("Error checking cameras:", error);
        updateStatus("Camera permission denied");
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
    
    updateStatus(`Switching to camera ${currentDeviceIndex + 1}/${videoDevices.length}...`);
    console.log(`Switching to camera index ${currentDeviceIndex}:`, videoDevices[currentDeviceIndex]);
    
    // If detection is running, restart it with the new camera
    if (isRunning) {
        // Stop current webcam
        if (webcam) {
            webcam.stop();
        }
        
        // Clear webcam container
        const webcamContainer = document.getElementById("webcam-container");
        webcamContainer.innerHTML = "";
        
        try {
            // Reinitialize with new camera
            await init();
            
            // Resume prediction loop
            window.requestAnimationFrame(loop);
            
            updateStatus(`Using camera ${currentDeviceIndex + 1}/${videoDevices.length}`);
        } catch (error) {
            console.error("Error switching camera:", error);
            updateStatus("Failed to switch camera");
            
            // Try to revert to previous camera
            currentDeviceIndex = (currentDeviceIndex - 1 + videoDevices.length) % videoDevices.length;
            await init();
            window.requestAnimationFrame(loop);
        }
    } else {
        updateStatus(`Selected camera ${currentDeviceIndex + 1}/${videoDevices.length}`);
    }
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
        document.getElementById("switch-camera-btn").disabled = true;
        
        await init(); // This is where the webcam and model are initialized
        
        isRunning = true;
        document.getElementById("start-btn").querySelector(".btn-text").textContent = "Stop Detection";
        document.getElementById("start-btn").disabled = false;
        document.getElementById("switch-camera-btn").disabled = false;
        
        updateStatus("Detection started.");
    } catch (error) {
        console.error("Error starting detection:", error);
        updateStatus("Error starting detection: " + error.message);
        
        document.getElementById("start-btn").disabled = false;
        document.getElementById("switch-camera-btn").disabled = false;
    }
}

// Stop detection
function stopDetection() {
    if (webcam) {
        webcam.stop();
    }
    isRunning = false;
    document.getElementById("start-btn").querySelector(".btn-text").textContent = "Start Detection";
    updateStatus("Detection stopped.");
}

// Update status text
function updateStatus(message) {
    const statusElement = document.getElementById("status");
    if (statusElement) {
        statusElement.textContent = message;
    }
}
