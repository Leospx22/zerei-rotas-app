import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Phone, Mail, MapPin, Package, CheckCircle } from 'lucide-react-native';
import { HeaderBrandIcon } from '@/components/HeaderBrandIcon';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import {
  WAITLIST_PLATFORMS,
  submitWaitlistLead,
  type WaitlistPlatform,
} from '@/lib/waitlistLeads';

export default function LandingScreen() {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [mainPlatform, setMainPlatform] = useState<WaitlistPlatform | ''>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !whatsapp.trim() || !mainPlatform) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    console.log('Landing form: submitting waitlist lead...');

    const result = await submitWaitlistLead({
      name,
      whatsapp,
      email: email || undefined,
      city: city || undefined,
      main_platform: mainPlatform,
    });

    setLoading(false);

    if (result.success) {
      console.log('Landing form: lead submitted successfully.');
      setSuccess(true);
    } else {
      console.log('Landing form: submission failed —', result.error);
      setError(result.error);
    }
  };

  if (success) {
    return (
      <LinearGradient colors={[Colors.background, Colors.primary[800]]} style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Cadastro enviado!</Text>
          <Text style={styles.successMessage}>
            Cadastro enviado com sucesso! Em breve entraremos em contato para liberar seu acesso ao
            teste.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.background, Colors.primary[800]]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <HeaderBrandIcon size={32} containerSize={72} filled />
            <Text style={styles.title}>Zerei Rotas</Text>
            <Text style={styles.subtitle}>
              Organize e conclua suas rotas de entrega mais rapido
            </Text>
            <Text style={styles.ctaLabel}>
              Entre na lista de teste gratuito
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nome completo <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <User size={18} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor={Colors.gray}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                WhatsApp <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Phone size={18} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor={Colors.gray}
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Plataforma principal <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.platformGrid}>
                {WAITLIST_PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.platformChip,
                      mainPlatform === p && styles.platformChipSelected,
                    ]}
                    onPress={() => setMainPlatform(p)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.platformChipText,
                        mainPlatform === p && styles.platformChipTextSelected,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail (opcional)</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor={Colors.gray}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cidade (opcional)</Text>
              <View style={styles.inputContainer}>
                <MapPin size={18} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Sua cidade"
                  placeholderTextColor={Colors.gray}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primary[900]} />
              ) : (
                <>
                  <Package size={20} color={Colors.primary[900]} style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Quero participar do teste</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Seus dados sao usados apenas para contato sobre o beta. Sem spam.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gold[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.hero,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  ctaLabel: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.gold[400],
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.lightGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  platformChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBg,
  },
  platformChipSelected: {
    borderColor: Colors.gold[500],
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
  },
  platformChipText: {
    fontSize: FontSizes.md,
    color: Colors.gray,
    fontWeight: '500',
  },
  platformChipTextSelected: {
    color: Colors.gold[400],
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold[500],
    borderRadius: BorderRadius.md,
    height: 56,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  submitIcon: {},
  buttonDisabled: { opacity: 0.55 },
  submitButtonText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary[900],
  },
  disclaimer: {
    fontSize: FontSizes.sm,
    color: Colors.darkGray,
    textAlign: 'center',
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: FontSizes.lg,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 26,
  },
});
