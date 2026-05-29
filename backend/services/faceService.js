const tf = require('@tensorflow/tfjs');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');

// Configure face-api to use nodejs canvas
const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

// In-memory cache for face embeddings
let embeddingCache = null;

// Normalization function (L2)
const normalizeL2 = (descriptor) => {
    let sum = 0;
    for (let i = 0; i < descriptor.length; i++) {
        sum += descriptor[i] * descriptor[i];
    }
    const norm = Math.sqrt(sum);
    if (norm === 0) return descriptor;
    const normalized = new Float32Array(descriptor.length);
    for (let i = 0; i < descriptor.length; i++) {
        normalized[i] = descriptor[i] / norm;
    }
    return normalized;
};

const init = async () => {
    if (modelsLoaded) return;
    const modelsPath = path.join(__dirname, '..', 'models');
    
    console.log('Loading Face API Models from:', modelsPath);
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
    ]);
    modelsLoaded = true;
    console.log('Face API Models Loaded!');
};

/**
 * Validate image quality
 * @param {Buffer} imageBuffer 
 * @returns {Object} { isValid: boolean, error?: string, detection?: any }
 */
const validateImageQuality = async (imageBuffer) => {
    if (!modelsLoaded) await init();

    const img = await loadImage(imageBuffer);

    // Deteksi dengan minConfidence 0.15 untuk gambar dari ESP32 (lebih longgar)
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.15 });
    const detections = await faceapi.detectAllFaces(img, options).withFaceLandmarks().withFaceDescriptors();

    if (detections.length === 0) {
        return { isValid: false, error: 'No face detected. Please ensure the face is clearly visible.' };
    }

    // if (detections.length > 1) {
    //     return { isValid: false, error: 'Multiple faces detected. Please ensure only one person is in the photo.' };
    // }

    const detection = detections[0];
    
    // Check detection score (as a proxy for quality/clarity)
    if (detection.detection.score < 0.5) {
        return { isValid: false, error: 'Low quality image. Please provide a clearer photo.' };
    }

    // Check face size relative to image
    const faceBox = detection.detection.box;
    const imgWidth = img.width;
    const imgHeight = img.height;
    const faceArea = faceBox.width * faceBox.height;
    const imgArea = imgWidth * imgHeight;
    
    // PERBAIKAN: Melonggarkan batas minimum area wajah dari 0.05 (5%) menjadi 0.01 (1%)
    // Langkah ini mencegah error "Face is too small" saat menggunakan kamera beresolusi besar
    if (faceArea < imgArea * 0.01) {
        return { isValid: false, error: 'Face is too small. Please move closer to the camera.' };
    }

    return { isValid: true, detection };
};

/**
 * Extract face descriptor from an image buffer with quality check
 * @param {Buffer} imageBuffer 
 * @returns {Float32Array|null} descriptor
 */
const encodeFace = async (imageBuffer) => {
    const quality = await validateImageQuality(imageBuffer);
    if (!quality.isValid) return null;
    return normalizeL2(quality.detection.descriptor);
};

/**
 * Calculate the average embedding from multiple descriptors
 * @param {Array<Float32Array>} descriptors 
 * @returns {Float32Array}
 */
const calculateAverageEmbedding = (descriptors) => {
    if (!descriptors || descriptors.length === 0) return null;
    
    const size = descriptors[0].length;
    const avg = new Float32Array(size).fill(0);
    
    for (const desc of descriptors) {
        for (let i = 0; i < size; i++) {
            avg[i] += desc[i];
        }
    }
    
    for (let i = 0; i < size; i++) {
        avg[i] /= descriptors.length;
    }
    
    return normalizeL2(avg);
};

const recognizeFace = async (imageBuffer, registeredProfiles) => {
    if (!modelsLoaded) await init();

    const img = await loadImage(imageBuffer);

    // Kembalikan minConfidence ke 0.45 agar AI tidak berhalusinasi menganggap bayangan/benda sebagai wajah (yang bikin ngaco)
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 });
    const detections = await faceapi.detectAllFaces(img, options).withFaceLandmarks().withFaceDescriptors();
    
    if (!detections || detections.length === 0) {
        return { success: false, message: 'No face detected in the image' };
    }

    if (registeredProfiles.length === 0) {
        return { success: false, message: 'No registered face profiles found' };
    }

    if (!embeddingCache || embeddingCache.length !== registeredProfiles.length) {
        console.log('[FaceService] Rebuilding embedding cache...');
        embeddingCache = registeredProfiles.map(profile => {
            try {
                const descriptorArray = JSON.parse(profile.embedding_data);
                return new faceapi.LabeledFaceDescriptors(
                    profile.user_id.toString(),
                    [normalizeL2(new Float32Array(descriptorArray))]
                );
            } catch (e) {
                console.error(`Error parsing embedding for user ${profile.user_id}:`, e);
                return null;
            }
        }).filter(ld => ld !== null);
    }

    if (embeddingCache.length === 0) {
        return { success: false, message: 'Invalid face profile data' };
    }

    // Set distance menjadi 0.50 (Ketatkan kembali agar tidak salah menebak orang lain)
    const faceMatcher = new faceapi.FaceMatcher(embeddingCache, 0.50);
    
    let matchedFaces = [];

    for (const detection of detections) {
        const normalizedQuery = normalizeL2(detection.descriptor);
        const bestMatch = faceMatcher.findBestMatch(normalizedQuery);

        if (bestMatch.label !== 'unknown') {
            matchedFaces.push({
                user_id: parseInt(bestMatch.label),
                distance: bestMatch.distance,
                confidence: 1 - bestMatch.distance
            });
        }
    }

    if (matchedFaces.length === 0) {
        return { success: false, message: 'Face(s) detected but none recognized', spoof: true, type: 'UNKNOWN_FACE' };
    }

    return {
        success: true,
        message: `${matchedFaces.length} face(s) recognized`,
        matches: matchedFaces
    };
};

const clearCache = () => {
    embeddingCache = null;
    console.log('[FaceService] Cache invalidated');
};

module.exports = {
    init,
    encodeFace,
    validateImageQuality,
    calculateAverageEmbedding,
    recognizeFace,
    clearCache
};