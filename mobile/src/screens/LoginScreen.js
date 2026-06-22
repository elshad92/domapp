import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import api from '../api';

const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';

export default function LoginScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('login.error'), t('login.enterEmail'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, company_id, company_name } = res.data;
      await AsyncStorage.multiSet([
        ['token', token],
        ['company_id', String(company_id)],
        ['company_name', company_name],
      ]);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert(
        t('login.error'),
        err.response?.data?.detail || t('login.invalidCredentials')
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = async () => {
    const next = i18n.language?.startsWith('uz') ? 'ru' : 'uz';
    await AsyncStorage.setItem('lang', next);
    i18n.changeLanguage(next);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Language Toggle */}
      <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
        <Ionicons name="globe-outline" size={18} color={TEAL} />
        <Text style={styles.langText}>
          {i18n.language?.startsWith('uz') ? 'RU' : 'UZ'}
        </Text>
      </TouchableOpacity>

      <View style={styles.form}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="business" size={32} color="#fff" />
          </View>
          <Text style={styles.logoText}>DomApp</Text>
        </View>
        <Text style={styles.subtitle}>{t('login.title')}</Text>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('login.email')}
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('login.password')}
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>{t('login.login')}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('ResidentLogin')}
          disabled={loading}
        >
          <View style={styles.secondaryButtonContent}>
            <Ionicons name="person-outline" size={18} color={TEAL} />
            <Text style={styles.secondaryButtonText}>Вход для жильца</Text>
          </View>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    padding: 24,
  },
  langBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    zIndex: 10,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: TEAL_DARK,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
  },
  button: {
    backgroundColor: TEAL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: TEAL,
    fontSize: 15,
    fontWeight: '600',
  },
});
