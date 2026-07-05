import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Crown, LogOut, Save, UserRound } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateTrialDaysLeft,
  getFunnelStage,
  updateUserProfile,
  type SubscriptionStatus,
} from '@/lib/userProfile';

const ACCOUNT_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: 'Teste ativo',
  active: 'Assinatura ativa',
  expired: 'Teste expirado',
  canceled: 'Cancelado',
  none: 'Sem assinatura',
};

const FUNNEL_LABELS = {
  registered: 'Cadastrado',
  trial_active: 'Teste ativo',
  trial_expired: 'Teste expirado',
  subscribed: 'Assinante',
  canceled: 'Cancelado',
  churned: 'Inativo',
};

interface ProfileForm {
  full_name: string;
  phone: string;
  city: string;
  state: string;
  vehicle_type: string;
  main_platform: string;
}

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  phone: '',
  city: '',
  state: '',
  vehicle_type: '',
  main_platform: '',
};

export default function ProfileScreen() {
  const {
    configured,
    loading: authLoading,
    session,
    profile,
    refreshProfile,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationName, setRegistrationName] = useState('');
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? '',
      phone: profile.phone ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      vehicle_type: profile.vehicle_type ?? '',
      main_platform: profile.main_platform ?? '',
    });
  }, [profile]);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = () => runAction(async () => {
    if (!email.trim() || !password) throw new Error('Informe e-mail e senha.');
    await signInWithEmail(email, password);
  });

  const handleSignUp = () => runAction(async () => {
    if (!registrationName.trim() || !email.trim() || !password) {
      throw new Error('Informe nome, e-mail e senha.');
    }
    const result = await signUpWithEmail(email, password, registrationName);
    setMessage(
      result.requiresEmailConfirmation
        ? 'Conta criada. Confirme seu e-mail antes de entrar.'
        : 'Conta criada e teste grátis iniciado.'
    );
  });

  const handleSave = () => runAction(async () => {
    const saved = await updateUserProfile(form);
    if (!saved) throw new Error('Não foi possível salvar o perfil.');
    await refreshProfile();
    setMessage('Perfil salvo.');
  });

  const handleSignOut = () => runAction(signOut);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.gold[400]} />
        <Text style={styles.helper}>Carregando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {session ? <Crown size={30} color={Colors.primary[900]} /> : <UserRound size={30} color={Colors.primary[900]} />}
        </View>
        <Text style={styles.title}>Perfil</Text>
        {session?.user.email && <Text style={styles.subtitle}>{session.user.email}</Text>}
      </View>

      {!configured && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Conta ainda não configurada neste ambiente.</Text>
          <Text style={styles.helper}>
            Configure o Supabase para ativar cadastro, teste grátis e assinatura.
          </Text>
          <Text style={styles.offlineLabel}>As rotas locais continuam disponíveis.</Text>
        </View>
      )}

      {configured && !session && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entrar ou criar conta</Text>
          <Text style={styles.helper}>Crie sua conta para iniciar o teste grátis de 7 dias.</Text>
          <ProfileInput label="Nome" value={registrationName} onChangeText={setRegistrationName} />
          <ProfileInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <ProfileInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn} disabled={busy}>
            <Text style={styles.primaryButtonText}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUp} disabled={busy}>
            <Text style={styles.secondaryButtonText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      )}

      {configured && session && (
        <>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status da conta</Text>
              <Text style={styles.statusValue}>
                {ACCOUNT_STATUS_LABELS[profile?.subscription_status ?? 'none']}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Dias restantes de teste</Text>
              <Text style={styles.statusValue}>{calculateTrialDaysLeft(profile)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Etapa do funil</Text>
              <Text style={styles.statusValue}>
                {profile ? FUNNEL_LABELS[getFunnelStage(profile)] : 'Cadastrado'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <ProfileInput label="Nome" value={form.full_name} onChangeText={value => updateField('full_name', value)} />
            <ProfileInput label="Email" value={session.user.email ?? ''} editable={false} />
            <ProfileInput label="WhatsApp" value={form.phone} onChangeText={value => updateField('phone', value)} keyboardType="phone-pad" />
            <ProfileInput label="Cidade" value={form.city} onChangeText={value => updateField('city', value)} />
            <ProfileInput label="Estado" value={form.state} onChangeText={value => updateField('state', value)} autoCapitalize="characters" />
            <ProfileInput label="Tipo de veículo" value={form.vehicle_type} onChangeText={value => updateField('vehicle_type', value)} />
            <ProfileInput label="Plataforma principal" value={form.main_platform} onChangeText={value => updateField('main_platform', value)} />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={busy}>
              <Save size={18} color={Colors.primary[900]} />
              <Text style={styles.primaryButtonText}>Salvar perfil</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={busy}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Sair</Text>
          </TouchableOpacity>
        </>
      )}

      {busy && <ActivityIndicator style={styles.activity} color={Colors.gold[400]} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}
      <Text style={styles.version}>Zerei Rotas v1.0.0</Text>
    </ScrollView>
  );
}

function ProfileInput(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, editable = true, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        editable={editable}
        placeholderTextColor={Colors.gray}
        style={[styles.input, !editable && styles.inputDisabled]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  centered: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.gold[500], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  title: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: '800' },
  subtitle: { color: Colors.gray, fontSize: FontSizes.md, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.lg },
  infoCard: { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.sm },
  statusCard: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.lg },
  cardTitle: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: '800' },
  helper: { color: Colors.gray, fontSize: FontSizes.md, lineHeight: 20 },
  offlineLabel: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '700' },
  field: { gap: Spacing.xs },
  label: { color: Colors.lightGray, fontSize: FontSizes.sm, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, backgroundColor: Colors.background, color: Colors.white, fontSize: FontSizes.lg, paddingHorizontal: Spacing.md },
  inputDisabled: { color: Colors.gray, opacity: 0.8 },
  primaryButton: { minHeight: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.gold[500], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  primaryButtonText: { color: Colors.primary[900], fontSize: FontSizes.lg, fontWeight: '800' },
  secondaryButton: { minHeight: 52, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gold[500], alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  secondaryButtonText: { color: Colors.gold[400], fontSize: FontSizes.lg, fontWeight: '800' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  statusLabel: { flex: 1, color: Colors.gray, fontSize: FontSizes.md },
  statusValue: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '800', textAlign: 'right' },
  signOutButton: { minHeight: 52, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.errorBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  signOutText: { color: Colors.error, fontSize: FontSizes.lg, fontWeight: '800' },
  activity: { marginBottom: Spacing.md },
  error: { color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  success: { color: Colors.success, textAlign: 'center', marginBottom: Spacing.md },
  version: { color: Colors.gray, fontSize: FontSizes.sm, textAlign: 'center', marginTop: Spacing.lg },
});
