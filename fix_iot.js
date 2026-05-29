const fs = require('fs');
let c = fs.readFileSync('src/screens/IoTSensorValidationScreen.tsx', 'utf8');

c = c.replace(
  /<BlurView intensity=\{15\} tint="dark" style=\{styles\.logCard\}>/g,
  `<View style={[styles.logCard, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>`
);

c = c.replace(
  /<BlurView intensity=\{20\} tint=\{isLightTheme \? 'light' : 'dark'\} style=\{\[styles\.deviceCard, \{ backgroundColor: tokens\.cardBg, borderColor: tokens\.borderColor \}\]\}>/g,
  `<View style={[styles.deviceCard, { backgroundColor: isLightTheme ? '#F8FAFC' : '#1E293B', borderColor: tokens.borderColor }]}>`
);

c = c.replace(
  /<BlurView intensity=\{30\} tint=\{isLightTheme \? 'light' : 'dark'\} style=\{\[styles\.warningBanner, \{ backgroundColor: tokens\.cardBg, borderColor: tokens\.borderColor \}\]\}>/g,
  `<View style={[styles.warningBanner, { backgroundColor: isLightTheme ? '#DBEAFE' : 'rgba(59,130,246,0.15)', borderColor: '#3B82F6' }]}>`
);

// We don't replace ALL </BlurView> because the modal might still use it if we didn't target it.
// Actually, let's just replace all </BlurView> and also replace the modal <BlurView> with <View>

c = c.replace(
  /<BlurView intensity=\{80\} tint=\{isLightTheme \? 'light' : 'dark'\} style=\{\[styles\.modalContent, \{ backgroundColor: tokens\.cardBg, borderColor: tokens\.borderColor \}\]\}>/g,
  `<View style={[styles.modalContent, { backgroundColor: isLightTheme ? '#FFFFFF' : '#161D31', borderColor: tokens.borderColor }]}>`
);

c = c.replace(/<\/BlurView>/g, '</View>');

fs.writeFileSync('src/screens/IoTSensorValidationScreen.tsx', c);
console.log('Fixed IoT Sensor Cards');
