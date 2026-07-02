import { Tabs } from 'expo-router';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Home, Map, BarChart3, User } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

const TAB_BAR_STYLE = {
  backgroundColor: Colors.cardBg,
  borderTopColor: Colors.cardBorder,
  borderTopWidth: 1,
  height: 100,
  paddingBottom: 24,
  paddingTop: 8,
};

const ROUTE_LIFECYCLE_SCREENS = new Set([
  'import',
  'import-summary',
  'delivery-preparation',
  'route-organizer',
  'route-execution',
  'occurrences',
  'route-completed',
]);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: Colors.gold[500],
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Painel',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={({ route }) => {
          const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'index';
          const hideTabBar = ROUTE_LIFECYCLE_SCREENS.has(focusedRoute);

          return {
            title: 'Rotas',
            tabBarStyle: hideTabBar
              ? { ...TAB_BAR_STYLE, display: 'none' }
              : TAB_BAR_STYLE,
            tabBarIcon: ({ size, color }) => <Map size={size} color={color} />,
          };
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ size, color }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
