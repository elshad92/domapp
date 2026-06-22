import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  'http://localhost:8000/api/v1';

const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';

export default function ResidentLoginScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/resident/auth/send-code`, {
        phone: phone.trim(),
      });
      Alert.alert('Код отправлен', 'Проверьте SMS на вашем телефоне');
      setStep('code');
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.detail || 'Не удалось отправить код'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Ошибка', 'Введите код из SMS');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/resident/auth/verify-code`, {
        phone: phone.trim(),
        code: code.trim(),
      });
      const data = res.data;
      await AsyncStorage.multiSet([
        ['resident_token', data.token],
        ['resident_name', data.name],
        ['resident_id', String(data.resident_id)],
      ]);
      navigation.replace('ResidentMain');
    } catch (err) {
      Alert.alert(
        'Ошибка',
        err.response?.data?.detail || 'Неверный код'
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
        <Text style={styles.subtitle}>
          {step === 'phone' ? 'Вход в личный кабинет' : 'Подтверждение'}
        </Text>

        {step === 'phone' ? (
          <>
            {/* Phone */}
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+998 XX XXX XX XX"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Send Code Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Получить код</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Code Input */}
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="6-значный код"
                placeholderTextColor="#999"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Подтвердить и войти</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Back to phone */}
            <TouchableOpacity
              onPress={() => { setStep('phone'); setCode(''); }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#999" />
              <Text style={styles.backText}>Сменить номер</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.hint}>
          {step === 'phone'
            ? 'Введите номер телефона, указанный в договоре с УК'
            : `Код отправлен на ${phone}`}
        </Text>
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
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '700',
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 4,
  },
  backText: {
    fontSize: 13,
    color: '#999',
  },
  hint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
