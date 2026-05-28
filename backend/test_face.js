const fs = require('fs');
const faceService = require('./services/faceService');
const path = require('path');

async function test() {
    try {
        console.log("Loading face api...");
        await faceService.init();
        console.log("Face API loaded.");
        // Create a blank image to test canvas/tfjs init
        const { Canvas } = require('canvas');
        const canvas = new Canvas(200, 200);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0,0,200,200);
        
        console.log("Validating...");
        const res = await faceService.validateImageQuality(canvas.toBuffer('image/jpeg'));
        console.log("Result:", res);
        process.exit(0);
    } catch(e) {
        console.error("Test failed:", e);
        process.exit(1);
    }
}
test();
