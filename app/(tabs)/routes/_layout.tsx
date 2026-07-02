import { Stack } from 'expo-router';

export default function RoutesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="import" />
      <Stack.Screen name="import-summary" />
      <Stack.Screen name="delivery-preparation" />
      <Stack.Screen name="route-organizer" />
      <Stack.Screen name="route-execution" />
      <Stack.Screen name="occurrences" />
      <Stack.Screen name="route-completed" />
    </Stack>
  );
}
