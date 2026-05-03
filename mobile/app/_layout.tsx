import React from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import Screens
import LoginScreen from './login';
import SignupScreen from './signup';
import TabLayout from './(tabs)/_layout';
import BookScreen from './book';
import HistoryScreen from './history';
import NotificationsScreen from './notifications';
import RatesScreen from './rates';
import HelpSupportScreen from './help-support';
import LegalScreen from './legal';
import AccountSettingsScreen from './account-settings';
import EditProfileScreen from './edit-profile';
import ManageAddressesScreen from './manage-addresses';
import FeedbackScreen from './feedback';
import ReferEarnScreen from './refer-earn';
import LanguageNotificationsScreen from './language-notifications';
import TermsScreen from './terms';
import LicensesScreen from './licenses';
import WithdrawScreen from './withdraw';

// Dynamic Screens
import InvoiceScreen from './invoice/[id]';
import TrackScreen from './track/[id]';
import TrackRouteScreen from './track-route/[id]';
import WeighScreen from './weigh/[id]';

// Onboarding Screens
import OnboardingLanguageScreen from './onboarding/language';
import OnboardingDetailsScreen from './onboarding/details';
import OnboardingTutorialScreen from './onboarding/tutorial';
import OnboardingFleetScreen from './onboarding/fleet';

const Stack = createNativeStackNavigator();

function RootLayoutNav() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
          {!user?.onboarded ? (
            <>
              <Stack.Screen name="OnboardingDetails" component={OnboardingDetailsScreen} />
              <Stack.Screen name="OnboardingLanguage" component={OnboardingLanguageScreen} />
              {user?.role === 'AGENT' && (
                <Stack.Screen name="OnboardingFleet" component={OnboardingFleetScreen} />
              )}
            </>
          ) : null}
          <Stack.Screen name="Main" component={TabLayout} />
          <Stack.Screen name="Book" component={BookScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Rates" component={RatesScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
          <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ManageAddresses" component={ManageAddressesScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
          <Stack.Screen name="ReferEarn" component={ReferEarnScreen} />
          <Stack.Screen name="LanguageNotifications" component={LanguageNotificationsScreen} />
          <Stack.Screen name="Invoice" component={InvoiceScreen} />
          <Stack.Screen name="Track" component={TrackScreen} />
          <Stack.Screen name="TrackRoute" component={TrackRouteScreen} />
          <Stack.Screen name="Weigh" component={WeighScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
          <Stack.Screen name="Licenses" component={LicensesScreen} />
          <Stack.Screen name="Withdraw" component={WithdrawScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <ThemeProvider value={DefaultTheme}>
            <RootLayoutNav />
            <StatusBar barStyle="dark-content" />
          </ThemeProvider>
        </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
