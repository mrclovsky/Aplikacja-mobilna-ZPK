# Running Your React Native App with Expo Go

## Quick Start Guide

### 1. Install Dependencies

First, install the new package dependency:

```powershell
npm install
```

### 2. Start the Development Server

```powershell
npm start
```

This will start the Expo development server and display a QR code in your terminal.

### 3. Install Expo Go on Your Phone

- **Android**: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779)

### 4. Connect to Your App

**On Android:**
1. Open Expo Go app
2. Tap "Scan QR code"
3. Scan the QR code from your terminal

**On iOS:**
1. Open the Camera app
2. Point it at the QR code from your terminal
3. Tap the notification to open in Expo Go

**Alternative (if QR code doesn't work):**
- Make sure your phone and computer are on the same WiFi network
- In Expo Go, manually enter the URL shown in the terminal (e.g., `exp://192.168.1.x:8081`)

---

## What's New: API Integration

### Summary of Changes

Your app now fetches route and point data from a live API instead of using static JSON files:

1. **API Endpoints** (configurable in [app/config/api.ts](app/config/api.ts)):
   - Points: `https://inzynierka-web-production.up.railway.app/app/points`
   - Paths: `https://inzynierka-web-production.up.railway.app/app/paths`

2. **Offline Support**: 
   - Data is automatically cached using AsyncStorage
   - App works without internet after the first data fetch
   - Falls back to embedded JSON if no cached data exists

3. **Refresh Button**: 
   - Added to the bottom of the Routes List screen
   - Manually fetches fresh data from the API
   - Shows loading indicator while refreshing

### Files Modified/Created

**New Files:**
- `app/config/api.ts` - API configuration (URLs, timeouts)
- `app/services/api.ts` - API calling logic
- `app/services/storage.ts` - Offline storage logic
- `app/hooks/useRoutesData.ts` - React hook for data management

**Modified Files:**
- `app/components/routesListScreen.tsx` - Now uses API data + refresh button
- `app/components/mapScreen.tsx` - Uses API data
- `app/components/qrScanScreen.tsx` - Uses API data
- `assets/locales/*.json` - Added translations for "Refresh", "Refreshing", "Loading"

### Changing API URLs

To update the API endpoints, edit [app/config/api.ts](app/config/api.ts):

```typescript
export const API_CONFIG = {
  BASE_URL: "https://your-new-url.com", // Change this
  ENDPOINTS: {
    POINTS: "/app/points",  // Or change these paths
    PATHS: "/app/paths",
  },
  TIMEOUT: 10000,
};
```

---

## Troubleshooting

### App Won't Load
- Ensure your phone and computer are on the same WiFi
- Try restarting the Expo server (`Ctrl+C` then `npm start`)
- Clear Expo cache: `npx expo start -c`

### "Network Request Failed"
- Check your internet connection
- Verify the API URLs in `app/config/api.ts`
- The app will use cached data if the API is unavailable

### Package Installation Errors
```powershell
# Clear npm cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

### AsyncStorage Errors
If you see AsyncStorage warnings, the package is already installed and integrated.

---

## Development Tips

### Hot Reload
- Changes to your code will automatically refresh in Expo Go
- Shake your phone (or press `Ctrl+M` on Android, `Cmd+D` on iOS) to open the developer menu

### Testing API Changes
1. Edit data in `app/config/api.ts`
2. Save the file
3. In the Routes List screen, tap the "Refresh" button
4. New data will be fetched and displayed

### Clearing Cached Data
If you need to clear stored data during development:
```typescript
import { storageService } from './app/services/storage';
await storageService.clearRoutesData();
```

---

## Additional Commands

```powershell
# Start with cache clear
npx expo start -c

# Start in specific mode
npx expo start --lan      # Use LAN for connection
npx expo start --tunnel   # Use tunnel (slower but works on different networks)

# Install packages
npm install

# Check for package updates
npm outdated
```

---

## Support

For Expo-specific issues, see: https://docs.expo.dev/get-started/introduction/
