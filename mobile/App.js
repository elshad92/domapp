import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import './src/i18n';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import RequestDetailScreen from './src/screens/RequestDetailScreen';

import ResidentLoginScreen from './src/screens/ResidentLoginScreen';
import ResidentDashboardScreen from './src/screens/ResidentDashboardScreen';
import ResidentRequestsScreen from './src/screens/ResidentRequestsScreen';
import ResidentRequestDetailScreen from './src/screens/ResidentRequestDetailScreen';

const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const BG = '#F0FDFA';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ routeName, focused }) {
  const icons = {
    'Dashboard': focused ? 'grid' : 'grid-outline',
    'Requests': focused ? 'list' : 'list-outline',
  };
  return (
    <Ionicons
      name={icons[routeName] || 'ellipse-outline'}
      size={22}
      color={focused ? TEAL : '#999'}
    />
  );
}

function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('uz') ? 'UZ' : 'RU';

  const toggle = async () => {
    const next = current === 'RU' ? 'uz' : 'ru';
    await AsyncStorage.setItem('lang', next);
    i18n.changeLanguage(next);
  };

  return (
    <TouchableOpacity onPress={toggle} style={styles.langBtn}>
      <Ionicons name="globe-outline" size={16} color={TEAL} />
      <Text style={styles.langText}>{current}</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: t('nav.dashboard') }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{ tabBarLabel: t('nav.requests') }}
      />
    </Tab.Navigator>
  );
}

function ResidentTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Ionicons
            name={
              route.name === 'ResidentDashboard'
                ? focused ? 'grid' : 'grid-outline'
                : focused ? 'list' : 'list-outline'
            }
            size={22}
            color={focused ? TEAL : '#999'}
          />
        ),
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="ResidentDashboard"
        component={ResidentDashboardScreen}
        options={{ tabBarLabel: t('resident.dashboard') }}
      />
      <Tab.Screen
        name="ResidentRequests"
        component={ResidentRequestsScreen}
        options={{ tabBarLabel: t('nav.requests') }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const [adminToken, residentToken] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('resident_token'),
      ]);
      if (!mounted) return;
      if (adminToken) {
        setInitialRoute('Main');
      } else if (residentToken) {
        setInitialRoute('ResidentMain');
      } else {
        setInitialRoute('Login');
      }
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* UK Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />

        {/* Resident Screens */}
        <Stack.Screen name="ResidentLogin" component={ResidentLoginScreen} />
        <Stack.Screen name="ResidentMain" component={ResidentTabs} />
        <Stack.Screen name="ResidentRequestDetail" component={ResidentRequestDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEAL,
  },
});
