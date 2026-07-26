import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { colors, font } from '../theme';
import { useApp } from '../context/AppContext';
import { RootStackParamList, TabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import PantryScreen from '../screens/PantryScreen';
import PlansScreen from '../screens/PlansScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AddTicketScreen from '../screens/AddTicketScreen';
import ShoppingModeScreen from '../screens/ShoppingModeScreen';
import PlanDetailScreen from '../screens/PlanDetailScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_EMOJI: Record<keyof TabParamList, string> = {
  Inicio: '🏠',
  Despensa: '🥦',
  Planes: '📋',
  Compra: '🛒',
  Ajustes: '⚙️',
};

function TabIcon({ name, focused }: { name: keyof TabParamList; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 24 : 21, opacity: focused ? 1 : 0.55 }}>{TAB_EMOJI[name]}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: font.weight.semibold },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Despensa" component={PantryScreen} />
      <Tab.Screen name="Planes" component={PlansScreen} />
      <Tab.Screen name="Compra" component={ShoppingScreen} />
      <Tab.Screen name="Ajustes" component={PreferencesScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { preferences } = useApp();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: font.weight.bold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {!preferences.onboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="AddTicket"
            component={AddTicketScreen}
            options={{ presentation: 'modal', title: 'Añadir ticket' }}
          />
          <Stack.Screen
            name="ShoppingMode"
            component={ShoppingModeScreen}
            options={{ presentation: 'modal', title: 'Modo compra' }}
          />
          <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={{ title: 'Plan semanal' }} />
          <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Receta' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
