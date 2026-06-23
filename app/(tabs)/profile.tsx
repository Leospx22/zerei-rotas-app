import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  CreditCard,
  MapPin,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Package,
  Star,
  Crown,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

const PROFILE_MENU = [
  { icon: Bell, label: 'Notificações', color: Colors.gold[400] },
  { icon: CreditCard, label: 'Assinatura', color: Colors.gold[400] },
  { icon: MapPin, label: 'Integrações', color: Colors.gold[400] },
  { icon: Settings, label: 'Configurações', color: Colors.gray },
  { icon: HelpCircle, label: 'Ajuda e Suporte', color: Colors.gray },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Crown size={36} color={Colors.primary[900]} />
        </View>
        <View style={styles.nameRow}>
          <Crown size={18} color={Colors.gold[400]} />
          <Text style={styles.userName}>Motorista</Text>
        </View>
        <Text style={styles.userEmail}>motorista@email.com</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Package size={18} color={Colors.gold[400]} />
          <Text style={styles.statValue}>368</Text>
          <Text style={styles.statLabel}>Pacotes</Text>
        </View>
        <View style={styles.statItem}>
          <MapPin size={18} color={Colors.gold[400]} />
          <Text style={styles.statValue}>1.2k km</Text>
          <Text style={styles.statLabel}>Percorrido</Text>
        </View>
        <View style={styles.statItem}>
          <Star size={18} color={Colors.gold[400]} />
          <Text style={styles.statValue}>4.9</Text>
          <Text style={styles.statLabel}>Avaliação</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        {PROFILE_MENU.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <item.icon size={20} color={item.color} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight size={18} color={Colors.gray} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sair da Conta</Text>
      </TouchableOpacity>

      <View style={styles.brandFooter}>
        <Crown size={16} color={Colors.gold[400]} />
        <Text style={styles.versionText}>Zerei Rotas v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userName: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  userEmail: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: BorderRadius.md,
    height: 52,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  signOutText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.error,
  },
  brandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  versionText: {
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});
