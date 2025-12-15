# 🚀 Quick Start - Running Your App on Your Phone

## ✅ Setup Complete!

Your app has been successfully configured with API integration. The development server is **already running**!

## 📱 Run on Your Phone Now

### Step 1: Install Expo Go
- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Step 2: Scan the QR Code
Look at your terminal/PowerShell window - there's a QR code displayed!

**On Android:**
- Open Expo Go
- Tap "Scan QR code"
- Scan the QR code from your terminal

**On iOS:**
- Open the Camera app
- Point at the QR code
- Tap the notification to open in Expo Go

### Step 3: Done! 🎉
Your app will load on your phone.

---

## 🔄 What's New

### API Integration
- **Points API**: Fetches all orienteering points
- **Paths API**: Fetches route configurations
- **Offline Mode**: Data cached automatically - works without internet!
- **Refresh Button**: On Routes List screen (bottom) - manually fetch fresh data

### Configuration
API URLs can be changed in: `app/config/api.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: "https://inzynierka-web-production.up.railway.app",
  // Change URLs here if needed
};
```

---

## 🛠️ Development Commands

The server is already running, but for future reference:

```powershell
# Start development server
npm start

# Start with cache clear
npx expo start -c

# Install packages
npm install
```

---

## 📦 Only ONE New Package Added

- `@react-native-async-storage/async-storage` - For offline data storage

No other external dependencies were added - all other features use built-in React Native capabilities!

---

## 🎯 Key Features

1. **Data Fetching**: App loads data from API on first launch
2. **Offline Storage**: Data cached in AsyncStorage for offline use
3. **Fallback**: Uses embedded JSON if no internet and no cache
4. **Manual Refresh**: Refresh button fetches latest data from API
5. **Error Handling**: Graceful degradation if API is unavailable

---

## 📍 Files You Can Easily Modify

### Change API URLs
`app/config/api.ts` - Single location for all API configuration

### Modify API Logic
`app/services/api.ts` - API calling functions

### Adjust Storage
`app/services/storage.ts` - Offline data management

### Update Translations
- `assets/locales/en.json` - English
- `assets/locales/pl.json` - Polish
- `assets/locales/de.json` - German
- `assets/locales/ua.json` - Ukrainian

---

## ❓ Troubleshooting

### Can't Scan QR Code?
- Ensure phone and computer are on **same WiFi network**
- Try manual connection: In Expo Go, enter `exp://192.168.0.123:8081` (check your terminal for the exact URL)

### "Network Request Failed"
- Normal on first launch without internet
- App will use fallback data from `assets/data/routesData.json`
- Press refresh button when internet is available

### App Won't Load?
1. Stop server (Ctrl+C in terminal)
2. Clear cache: `npx expo start -c`
3. Scan QR code again

---

## 📖 Full Documentation

See [SETUP.md](SETUP.md) for comprehensive documentation.

---

**Your app is ready to use! Happy coding! 🎉**
