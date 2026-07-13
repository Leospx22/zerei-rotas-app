import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  CheckCircle2,
  FlaskConical,
  Headphones,
  LogOut,
  MessageCircle,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { useAuth } from '@/contexts/AuthContext';
import {
  formatProfileDate,
  getAuthErrorMessage,
  getFunnelStage,
  getProfileCompletion,
  getTrialDisplay,
  recordProfileCompletedOnce,
  recordFunnelEvent,
  shouldRecordProfileCompleted,
  updateUserProfile,
} from '@/lib/userProfile';
import {
  BETA_STATUS_TEXT,
  BETA_STATUS_TITLE,
  getAppVersionLabel,
  getFeedbackFormUrl,
  getWhatsAppSupportUrl,
} from '@/lib/appLinks';

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

  const completion = useMemo(() => getProfileCompletion(form), [form]);
  const trial = useMemo(() => getTrialDisplay(profile), [profile]);
  const funnelLabel = profile ? FUNNEL_LABELS[getFunnelStage(profile)] : 'Cadastrado';

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
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
    if (
      session?.user.id
      && shouldRecordProfileCompleted(profile, saved, false)
    ) {
      await recordProfileCompletedOnce(session.user.id);
    }
    await refreshProfile();
    setMessage('Perfil salvo com sucesso.');
  });

  const handleSignOut = () => runAction(signOut);

  const handleFeedback = async () => {
    const url = getFeedbackFormUrl();
    if (!url) {
      setError(null);
      setMessage('Link de feedback ainda não configurado.');
      Alert.alert('Feedback', 'Link de feedback ainda não configurado.');
      return;
    }
    try {
      setError(null);
      setMessage(null);
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
      if (session?.user.id) {
        await recordFunnelEvent(session.user.id, 'feedback_opened');
      }
    } catch {
      setMessage(null);
      setError('Não foi possível abrir o formulário de feedback.');
      Alert.alert('Feedback', 'Não foi possível abrir o formulário de feedback.');
    }
  };

  const handleSupport = async () => {
    try {
      setError(null);
      setMessage(null);
      const url = getWhatsAppSupportUrl();
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(url);
    } catch {
      setMessage(null);
      setError('Não foi possível abrir o WhatsApp.');
      Alert.alert('Suporte', 'Não foi possível abrir o WhatsApp.');
    }
  };

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
          {session
            ? <HeaderBrandIcon size={24} containerSize={44} filled />
            : <UserRound size={30} color={Colors.primary[900]} />}
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
          <Text style={styles.sectionEyebrow}>CONTA</Text>
          <Text style={styles.cardTitle}>Entrar ou criar conta</Text>
          <Text style={styles.helper}>
            Crie sua conta para ativar o teste grátis e salvar seu perfil.
          </Text>
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
          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color={Colors.primary[900]} /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, busy && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={busy}
          >
            <Text style={styles.secondaryButtonText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      )}

      {configured && session && (
        <>
          <View style={styles.betaCard}>
            <View style={styles.sectionHeader}>
              <FlaskConical size={20} color={Colors.gold[400]} />
              <Text style={styles.betaTitle}>{BETA_STATUS_TITLE}</Text>
            </View>
            <Text style={styles.betaText}>{BETA_STATUS_TEXT}</Text>
            <View style={styles.betaStats}>
              <StatusRow label="Status" value="Beta gratuito" />
              <StatusRow label="Dias restantes" value={trial.daysLabel} />
              <StatusRow label="Conta" value={trial.accountLabel} />
              <StatusRow
                label="Cadastro"
                value={completion.isComplete ? 'Perfil completo' : `${completion.completedFields} de ${completion.totalFields}`}
              />
            </View>
          </View>

          <View style={[styles.completionCard, completion.isComplete && styles.completionCardComplete]}>
            <View style={styles.completionHeader}>
              <CheckCircle2
                size={22}
                color={completion.isComplete ? Colors.success : Colors.gold[400]}
              />
              <View style={styles.completionTitleWrap}>
                <Text style={styles.cardTitle}>
                  {completion.isComplete ? 'Perfil completo' : 'Complete seu cadastro'}
                </Text>
                <Text style={styles.completionCount}>
                  {completion.completedFields} de {completion.totalFields} campos preenchidos
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${completion.percentage}%` }]} />
            </View>
            {!completion.isComplete && (
              <>
                <Text style={styles.helper}>
                  Isso ajuda a configurar sua conta e preparar seu teste grátis.
                </Text>
                <View style={styles.missingFields}>
                  {completion.missingFields.map(field => (
                    <View key={field} style={styles.missingChip}>
                      <Text style={styles.missingChipText}>{field}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <ShieldCheck size={19} color={Colors.gold[400]} />
              <Text style={styles.sectionTitle}>Conta</Text>
            </View>
            <StatusRow label="Email" value={session.user.email ?? 'Não informado'} />
            <StatusRow label="Status da conta" value={trial.accountLabel} />
            <StatusRow label="Etapa do funil" value={funnelLabel} />
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <CalendarDays size={19} color={Colors.gold[400]} />
              <Text style={styles.sectionTitle}>Teste grátis</Text>
            </View>
            <StatusRow label="Dias restantes" value={trial.daysLabel} />
            <StatusRow label="Início do teste" value={formatProfileDate(profile?.trial_started_at ?? null)} />
            <StatusRow label="Fim do teste" value={formatProfileDate(profile?.trial_ends_at ?? null)} />
            {trial.isExpired && (
              <View style={styles.expiredNotice}>
                <Text style={styles.expiredText}>
                  Seu teste expirou. Em breve você poderá ativar sua assinatura pelo app.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dados do motorista</Text>
            <ProfileInput label="Nome" value={form.full_name} onChangeText={value => updateField('full_name', value)} />
            <ProfileInput label="WhatsApp" value={form.phone} onChangeText={value => updateField('phone', value)} keyboardType="phone-pad" />
            <View style={styles.inlineFields}>
              <View style={styles.cityField}>
                <ProfileInput label="Cidade" value={form.city} onChangeText={value => updateField('city', value)} />
              </View>
              <View style={styles.stateField}>
                <ProfileInput label="Estado" value={form.state} onChangeText={value => updateField('state', value)} autoCapitalize="characters" maxLength={2} />
              </View>
            </View>
            <ProfileInput label="Tipo de veículo" value={form.vehicle_type} onChangeText={value => updateField('vehicle_type', value)} />
            <ProfileInput label="Plataforma principal" value={form.main_platform} onChangeText={value => updateField('main_platform', value)} />
            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color={Colors.primary[900]} />
                : (
                  <>
                    <Save size={18} color={Colors.primary[900]} />
                    <Text style={styles.primaryButtonText}>Salvar perfil</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Headphones size={19} color={Colors.gold[400]} />
              <Text style={styles.sectionTitle}>Suporte e feedback</Text>
            </View>
            <Text style={styles.helper}>
              Conte como foi sua rota ou fale com o suporte durante o beta.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleFeedback}>
              <MessageCircle size={18} color={Colors.primary[900]} />
              <Text style={styles.primaryButtonText}>Enviar feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSupport}>
              <Headphones size={18} color={Colors.gold[400]} />
              <Text style={styles.secondaryButtonText}>Falar com suporte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Segurança</Text>
            <Text style={styles.helper}>Encerre a sessão neste dispositivo quando necessário.</Text>
            <TouchableOpacity
              style={[styles.signOutButton, busy && styles.buttonDisabled]}
              onPress={handleSignOut}
              disabled={busy}
            >
              <LogOut size={18} color={Colors.lightGray} />
              <Text style={styles.signOutText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}
      <View style={styles.versionCard}>
        <Text style={styles.versionLabel}>Versão do app</Text>
        <Text style={styles.versionValue}>{getAppVersionLabel()}</Text>
      </View>
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

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
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
  subtitle: { color: Colors.gray, fontSize: FontSizes.md, marginTop: Spacing.xs, textAlign: 'center' },
  card: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.lg },
  infoCard: { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.sm },
  completionCard: { backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.lg },
  completionCardComplete: { backgroundColor: Colors.successBg, borderColor: Colors.successBorder },
  betaCard: { backgroundColor: Colors.cardBg, borderWidth: 1, borderColor: Colors.gold[700], borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.lg },
  betaTitle: { flex: 1, color: Colors.gold[400], fontSize: FontSizes.lg, fontWeight: '800' },
  betaText: { color: Colors.lightGray, fontSize: FontSizes.md, lineHeight: 20 },
  betaStats: { borderTopWidth: 1, borderTopColor: Colors.cardBorder, paddingTop: Spacing.md, gap: Spacing.sm },
  completionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  completionTitleWrap: { flex: 1, gap: 2 },
  completionCount: { color: Colors.gray, fontSize: FontSizes.sm },
  progressTrack: { height: 7, borderRadius: BorderRadius.full, backgroundColor: Colors.cardBorder, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: BorderRadius.full, backgroundColor: Colors.gold[400] },
  missingFields: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  missingChip: { borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.warningBorder, backgroundColor: Colors.cardBg, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  missingChipText: { color: Colors.lightGray, fontSize: FontSizes.sm, fontWeight: '700' },
  sectionEyebrow: { color: Colors.gold[400], fontSize: FontSizes.xs, fontWeight: '800', letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '800' },
  cardTitle: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: '800' },
  helper: { color: Colors.gray, fontSize: FontSizes.md, lineHeight: 20 },
  offlineLabel: { color: Colors.gold[400], fontSize: FontSizes.sm, fontWeight: '700' },
  field: { gap: Spacing.xs },
  label: { color: Colors.lightGray, fontSize: FontSizes.sm, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, backgroundColor: Colors.background, color: Colors.white, fontSize: FontSizes.lg, paddingHorizontal: Spacing.md },
  inputDisabled: { color: Colors.gray, opacity: 0.8 },
  inlineFields: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  cityField: { flex: 1 },
  stateField: { width: 88 },
  primaryButton: { minHeight: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.gold[500], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
  primaryButtonText: { color: Colors.primary[900], fontSize: FontSizes.lg, fontWeight: '800' },
  secondaryButton: { minHeight: 52, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.gold[500], alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  secondaryButtonText: { color: Colors.gold[400], fontSize: FontSizes.lg, fontWeight: '800' },
  buttonDisabled: { opacity: 0.55 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
  statusLabel: { flex: 1, color: Colors.gray, fontSize: FontSizes.md },
  statusValue: { flexShrink: 1, color: Colors.white, fontSize: FontSizes.md, fontWeight: '800', textAlign: 'right' },
  expiredNotice: { borderRadius: BorderRadius.md, backgroundColor: Colors.warningBg, borderWidth: 1, borderColor: Colors.warningBorder, padding: Spacing.md },
  expiredText: { color: Colors.lightGray, fontSize: FontSizes.sm, lineHeight: 19 },
  signOutButton: { minHeight: 50, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  signOutText: { color: Colors.lightGray, fontSize: FontSizes.lg, fontWeight: '700' },
  error: { color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  success: { color: Colors.success, textAlign: 'center', marginBottom: Spacing.md, fontWeight: '700' },
  versionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.cardBorder, paddingTop: Spacing.md, marginTop: Spacing.sm },
  versionLabel: { color: Colors.gray, fontSize: FontSizes.sm },
  versionValue: { color: Colors.lightGray, fontSize: FontSizes.sm, fontWeight: '700' },
});
