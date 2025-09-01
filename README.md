# Budget Tracker Mobile App

A modern React Native budget tracking application built with TypeScript and Expo, featuring a sleek dark theme and comprehensive financial management capabilities.

## Features

### 📊 Financial Tracking
- **Expense Management**: Track daily expenses with categories, amounts, dates, and descriptions
- **Income Tracking**: Record income from various sources with detailed information
- **Real-time Calculations**: Automatic calculation of totals, net amounts, and projections
- **Monthly Projections**: Smart predictions based on current spending patterns

### 🎨 Modern Dark UI
- **Pure Black Theme**: Modern dark design with high contrast for better visibility
- **Category Color Coding**: Vibrant category tags with dark theme optimization
- **Glass Morphism Effects**: Subtle shadows and modern card designs
- **Responsive Layout**: Optimized for both iOS and Android devices

### 📱 Mobile-First Features
- **Pull-to-Refresh**: Refresh data with native pull gesture
- **Async Storage**: Persistent data storage across app sessions
- **Custom Modals**: Native-feeling picker modals for categories and income sources
- **Touch-Optimized**: Proper touch targets and haptic feedback

### 📈 Analytics & Insights
- **Category Breakdown**: Visual progress bars showing spending distribution
- **Daily Averages**: Track daily spending patterns
- **Financial Health**: Smart alerts for overspending and savings goals
- **Transaction History**: Detailed list of recent transactions with delete functionality

## Technology Stack

- **React Native**: Cross-platform mobile development
- **TypeScript**: Type-safe development with full type definitions
- **Expo**: Development platform for React Native apps
- **AsyncStorage**: Local data persistence
- **Vector Icons**: Beautiful icons from @expo/vector-icons

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (optional)

### Installation

1. **Clone or copy the project files**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm start
   ```
4. **Run on device/simulator**:
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

### Expo Snack

This app is fully compatible with Expo Snack for quick testing:

1. Go to [snack.expo.dev](https://snack.expo.dev)
2. Copy the contents of `App.tsx`
3. Update `package.json` dependencies
4. Run in web preview or scan QR code for mobile testing

## Project Structure

```
├── App.tsx                 # Main application component
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── app.json              # Expo configuration
├── expo-env.d.ts         # TypeScript environment types
└── README.md             # This file
```

## Key Components

### Data Models
- **Expense**: Amount, category, description, date
- **Income**: Amount, source, description, date
- **Form Data**: Typed form state management

### Core Features
- **Tab Navigation**: Switch between expense and income entry
- **Stats Cards**: Real-time financial overview
- **Transaction Lists**: FlatList implementation for performance
- **Category Analytics**: Visual spending breakdown
- **Modal Pickers**: Native-feeling selection components

## Dark Theme Design

### Color Palette
- **Background**: `#000000` (Pure Black)
- **Cards**: `#1a1a1a` (Dark Gray)
- **Text Primary**: `#ffffff` (White)
- **Text Secondary**: `#a3a3a3` (Light Gray)
- **Success**: `#10b981` (Emerald)
- **Danger**: `#ef4444` (Red)
- **Primary**: `#3b82f6` (Blue)

### UI Principles
- High contrast for accessibility
- Vibrant accent colors on dark backgrounds
- Subtle shadows and borders
- Modern card-based layout
- Touch-friendly interactive elements

## TypeScript Features

- **Full Type Safety**: Complete type definitions for all components
- **Interface Definitions**: Structured data models
- **Type Guards**: Runtime type checking where needed
- **Generic Components**: Reusable typed components
- **Strict Configuration**: Comprehensive TypeScript rules

## Performance Optimizations

- **FlatList**: Efficient rendering for large transaction lists
- **AsyncStorage**: Optimized local data persistence
- **Memoization**: Preventing unnecessary re-renders
- **Lazy Loading**: Only render visible components
- **Minimal Re-renders**: Efficient state management

## Development Scripts

- `npm start`: Start Expo development server
- `npm run android`: Run on Android emulator
- `npm run ios`: Run on iOS simulator
- `npm run web`: Run in web browser
- `npm run type-check`: Run TypeScript type checking

## Customization

### Adding New Categories
Update the `categories` array in `App.tsx` and add corresponding colors to `categoryColors`.

### Modifying Theme Colors
Update the color constants in the `styles` object and component-specific colors.

### Adding New Features
The TypeScript structure makes it easy to add new features with full type safety.

## Compatibility

- **Expo SDK**: 49.0.0
- **React Native**: 0.72.6
- **TypeScript**: 5.1.3
- **iOS**: 13.0+
- **Android**: API 21+

## License

This project is open source and available under the MIT License.
