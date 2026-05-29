#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "mbedtls/base64.h"

// =====================================================
// WIFI (UBAH BAGIAN INI SESUAI HOTSPOT ANDA)
// =====================================================
const char* ssid = "mk"; // Masukkan nama hotspot anda
const char* password = "martinkeonho"; // Masukkan password hotspot anda

// =====================================================
// BACKEND API (SUDAH DISESUAIKAN DENGAN IP LAPTOP ANDA)
// =====================================================
const char* serverUrl = "http://10.32.235.251:5000/api/iot/recognize";

// =====================================================
// DEVICE
// =====================================================
String deviceId = "ESP32CAM_01";

// =====================================================
// PIR SENSOR & FLASH
// =====================================================
#define PIR_PIN 13
#define FLASH_PIN 4

// =====================================================
// CAMERA MODEL AI THINKER
// =====================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// =====================================================
// BASE64 ENCODE
// =====================================================
String base64Encode(uint8_t *data, size_t len) {
  size_t outputLen;
  unsigned char *output = (unsigned char*) malloc(len * 2);
  mbedtls_base64_encode(output, len * 2, &outputLen, data, len);
  String result = String((char*)output);
  free(output);
  return result;
}

// =====================================================
// CAMERA INIT
// =====================================================
void startCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA; // DIKEMBALIKAN KE VGA (640x480) AGAR 2 WAJAH TETAP KELIHATAN
    config.jpeg_quality = 10;
    config.fb_count = 1;
  } else {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.println("❌ Camera Init Failed");
    return;
  }
  Serial.println("✅ Camera Ready");
}

// =====================================================
// SEND PHOTO TO SERVER
// =====================================================
void sendPhoto() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Failed capture");
    return;
  }
  Serial.println("📸 Image captured");

  String imageBase64 = base64Encode(fb->buf, fb->len);
  esp_camera_fb_return(fb);

  HTTPClient http;
  http.setTimeout(40000); // SET TIMEOUT 40 DETIK AGAR TIDAK -11 KARENA PROSES MULTI-FACE LEBIH BERAT
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"device_id\":\"" + deviceId + "\",";
  payload += "\"image\":\"" + imageBase64 + "\"";
  payload += "}";

  Serial.println("📡 Sending POST...");
  int httpCode = http.POST(payload);
  Serial.print("HTTP Code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("✅ Server Response:");
    Serial.println(response);
  } else {
    Serial.println("❌ POST FAILED");
  }
  http.end();
}

// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  
  // SETUP FLASH LED
  pinMode(FLASH_PIN, OUTPUT);
  digitalWrite(FLASH_PIN, LOW);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("✅ WiFi Connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  startCamera();
}

// =====================================================
// LOOP
// =====================================================
void loop() {
  int motion = digitalRead(PIR_PIN);

  if (motion == HIGH) {
    Serial.println("🔥 Motion Detected");
    
    // NYALAKAN FLASH DULUAN
    digitalWrite(FLASH_PIN, HIGH);
    
    // JEDA SANGAT SINGKAT (100ms) HANYA UNTUK MENUNGGU LAMPU FLASH TERANG MAKSIMAL
    delay(100);

    sendPhoto();
    
    // MATIKAN FLASH
    digitalWrite(FLASH_PIN, LOW);
    
    // TUNGGU SAMPAI SENSOR PIR KEMBALI NORMAL (LOW)
    // Dibatasi maksimal 10 detik agar tidak nyangkut (timeout)
    Serial.println("Menunggu pergerakan selesai...");
    int waitCount = 0;
    while (digitalRead(PIR_PIN) == HIGH && waitCount < 20) {
      delay(500);
      waitCount++;
    }
    Serial.println("Sensor kembali standby.");
    // BERIKAN JEDA TAMBAHAN (COOLDOWN) 8 DETIK AGAR TIDAK LANGSUNG NGULANG TERUS
    Serial.println("Jeda (cooldown) aktif selama 8 detik...");
    delay(8000); 
    Serial.println("Siap mendeteksi lagi.");
    
  } else {
    // Kurangi log spam saat standby
    // Serial.println("... standby"); 
  }
  delay(500);
}
