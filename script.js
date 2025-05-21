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
//
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
document.addEventListener("DOMContentLoaded", async function() {
    setupCanvas();
    
    document.getElementById("start-btn").addEventListener("click", toggleDetection);
    document.getElementById("apple-model").addEventListener("click", () => switchModel("apple"));
    document.getElementById("tomato-model").addEventListener("click", () => switchModel("tomato"));
    document.getElementById("switch-camera-btn").addEventListener("click", switchCamera);
    
    createParticles("apple");
    animateParticles();
    
    await checkAvailableCameras();
});

// Check for available cameras
async function checkAvailableCameras() {
    try {
        if (!navigator.mediaDevices?.enumerateDevices) {
            console.log("MediaDevices API not supported.");
            return;
        }
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log("Available cameras:", videoDevices);

        const switchBtn = document.getElementById("switch-camera-btn");
        switchBtn.disabled = videoDevices.length <= 1;
    } catch (error) {
        console.error("Camera check error:", error);
        updateStatus("Camera permission denied");
    }
}

// Switch to next camera kinda buggy - imma fix later
async function switchCamera() {
    if (videoDevices.length <= 1) return;
    currentDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
    updateStatus(`Switching to camera ${currentDeviceIndex + 1}`);
    
    if (isRunning) {
        await stopWebcam();
        await initCamera();
    }
}

// Setup canvas
function setupCanvas() {
    canvas = document.getElementById("background-canvas");
    if (!canvas) {
        console.error("Canvas not found");
        return;
    }
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", () => {
        resizeCanvas();
        createParticles(currentModel);
    });
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Create particles
function createParticles(type) {
    particles = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 20 + 10,
            speed: Math.random() * 2 + 1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2,
            type,
            isLeaf: Math.random() > 0.7
        });
    }
}

// Animate particles
function animateParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.y += p.speed;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height) {
            p.y = -p.size;
            p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        p.isLeaf ? drawLeaf(ctx, 0, 0, p.size, p.type) : drawFruit(ctx, 0, 0, p.size, p.type);
        ctx.restore();
    });
    animationId = requestAnimationFrame(animateParticles);
}

// Draw functions
function drawFruit(ctx, x, y, size, type) {
    ctx.fillStyle = type === "apple" ? "#e74c3c" : "#e67e22";
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawLeaf(ctx, x, y, size, type) {
    ctx.fillStyle = type === "apple" ? "#2ecc71" : "#27ae60";
    ctx.beginPath();
    ctx.moveTo(x, y - size/3);
    ctx.bezierCurveTo(x+size/2, y-size/2, x+size/2, y+size/2, x, y+size/3);
    ctx.bezierCurveTo(x-size/2, y+size/2, x-size/2, y-size/2, x, y-size/3);
    ctx.fill();
}

// Switch model
function switchModel(modelType) {
    if (isRunning) stopDetection();
    currentModel = modelType;
    document.getElementById("model-name").textContent = MODEL_PATHS[modelType].name;
    document.getElementById("apple-model").classList.toggle("active", modelType === "apple");
    document.getElementById("tomato-model").classList.toggle("active", modelType === "tomato");
    document.documentElement.style.setProperty("--primary-color", modelType === "apple" ? "#e74c3c" : "#e67e22");
    createParticles(modelType);
    updateStatus(`Switched to ${MODEL_PATHS[modelType].name}`);
}

// Toggle Detection
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
        document.querySelector(".status-dot").classList.add("active");
        updateStatus("Running");
    } catch (error) {
        console.error(error);
        updateStatus("Error: " + error.message);
    } finally {
        document.getElementById("start-btn").disabled = false;
    }
}

// Stop detection
async function stopDetection() {
    await stopWebcam();
    if (labelContainer) labelContainer.innerHTML = "";
    isRunning = false;
    document.getElementById("start-btn").querySelector(".btn-text").textContent = "Start Detection";
    document.querySelector(".status-dot").classList.remove("active");
    updateStatus("Stopped");
}

// Stop webcam safely
async function stopWebcam() {
    if (webcam) {
        await webcam.stop();
        webcam = null;
    }
    const webcamContainer = document.getElementById("webcam-container");
    if (webcamContainer) webcamContainer.innerHTML = "";
}

// Update status
function updateStatus(message) {
    document.getElementById("status-text").textContent = message;
    console.log("Status:", message);
}

// Init model and camera
async function init() {
    if (!window.tmImage) {
        throw new Error("Teachable Machine library not loaded.");
    }
    const modelURL = MODEL_PATHS[currentModel].url + "model.json";
    const metadataURL = MODEL_PATHS[currentModel].url + "metadata.json";
    model = await window.tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    await initCamera();
    setupLabelContainer();
    window.requestAnimationFrame(loop);
}

// Initialize webcam
async function initCamera() {
    const flip = false;
    const size = 300;
    webcam = new window.tmImage.Webcam(size, size, flip);
    const deviceId = videoDevices[currentDeviceIndex]?.deviceId;
    await webcam.setup({
        facingMode: "user",
        deviceId: deviceId ? { exact: deviceId } : undefined
    });
    await webcam.play();
    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
}

// Setup labels
function setupLabelContainer() {
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
        const predictionItem = document.createElement("div");
        predictionItem.className = "prediction-item";
        predictionItem.innerHTML = `
            <div class="prediction-label"></div>
            <div class="prediction-bar"><div class="prediction-fill" style="width:0%"></div></div>
            <div class="prediction-value"></div>`;
        labelContainer.appendChild(predictionItem);
    }
}

// Prediction loop
async function loop() {
    if (!isRunning) return;
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

// Predict
async function predict() {
    const prediction = await model.predict(webcam.canvas);
    for (let i = 0; i < maxPredictions; i++) {
        const pred = prediction[i];
        const predictionItem = labelContainer.childNodes[i];
        predictionItem.querySelector(".prediction-label").textContent = pred.className;
        const fill = predictionItem.querySelector(".prediction-fill");
        const value = predictionItem.querySelector(".prediction-value");
        const percentage = Math.round(pred.probability * 100);
        fill.style.width = percentage + "%";
        value.textContent = percentage + "%";
        fill.style.backgroundColor = percentage > 70 ? "#4cd137" : percentage > 40 ? "#fbc531" : "#dfe6e9";
    }
}
