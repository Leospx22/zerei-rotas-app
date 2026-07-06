import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, Crown } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthErrorMessage } from '@/lib/userProfile';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (isSignUp && !name) {
      setError('Informe seu nome');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password, name);
        if (result.requiresEmailConfirmation) {
          setMessage('Conta criada. Confirme seu e-mail antes de entrar.');
          return;
        }
      } else {
        await signInWithEmail(email, password);
      }
      router.replace('/(tabs)');
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.background, Colors.primary[800]]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Crown size={32} color={Colors.primary[900]} />
          </View>
          <Text style={styles.title}>Zerei Rotas</Text>
          <Text style={styles.subtitle}>
            Organize, otimize e conclua suas rotas de entrega mais rápido
          </Text>
          <Text style={styles.accountHelper}>
            Crie sua conta para ativar o teste grátis e salvar seu perfil.
          </Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Mail size={20} color={Colors.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor={Colors.gray}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Mail size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.gray} />
              ) : (
                <Eye size={20} color={Colors.gray} />
              )}
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {message && <Text style={styles.messageText}>{message}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary[500]} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? 'Criar Conta' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar agora'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.xxl },
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
  },
  form: { gap: Spacing.md },
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
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  eyeButton: { padding: Spacing.xs },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  accountHelper: {
    fontSize: FontSizes.sm,
    color: Colors.gold[400],
    textAlign: 'center',
    lineHeight: 19,
    marginTop: Spacing.sm,
  },
  messageText: {
    color: Colors.success,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.gold[500],
    borderRadius: BorderRadius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary[900],
  },
  buttonDisabled: { opacity: 0.55 },
  toggleButton: { alignItems: 'center', marginTop: Spacing.md },
  toggleText: {
    fontSize: FontSizes.md,
    color: Colors.gold[400],
    fontWeight: '600',
  },
});
