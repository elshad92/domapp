import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  'http://localhost:8000/api/v1';

const residentApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Добавляем resident_token
residentApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('resident_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// На 401 — logout
residentApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['resident_token', 'resident_name', 'resident_id']);
    }
    return Promise.reject(error);
  }
);

export default residentApi;
