import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import residentApi from '../residentApi';

const TEAL = '#0D9488';
const BG = '#F0FDFA';

const STATUS_CONFIG = {
  new: { color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-circle' },
  in_progress: { color: '#3B82F6', bg: '#DBEAFE', icon: 'sync-circle' },
  done: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' },
};

export default function ResidentRequestDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { id } = route.params;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    residentApi.get('/resident/me/requests')
      .then((res) => {
        const found = res.data.find((r) => r.id === parseInt(id));
        if (found) {
          setRequest(found);
        } else {
          navigation.goBack();
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          AsyncStorage.multiRemove(['resident_token', 'resident_name', 'resident_id']);
          navigation.replace('ResidentLogin');
        }
        navigation.goBack();
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  if (!request) return null;

  const currentCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.new;

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color={TEAL} />
        <Text style={styles.backText}>{t('requests.back')}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusIcon, { backgroundColor: currentCfg.bg }]}>
              <Ionicons name={currentCfg.icon} size={24} color={currentCfg.color} />
            </View>
            <View>
              <Text style={styles.title}>
                {t('requests.detail')} #{request.id}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: currentCfg.bg }]}>
                <Text style={[styles.statusBadgeText, { color: currentCfg.color }]}>
                  {t(`requests.${request.status}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fields */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('requests.category')}</Text>
          <Text style={styles.value}>{request.category}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('requests.description')}</Text>
          <Text style={styles.value}>{request.description}</Text>
        </View>

        {request.photo_url && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('requests.photo')}</Text>
            <Image source={{ uri: request.photo_url }} style={styles.photo} />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>{t('requests.date')}</Text>
          <Text style={styles.value}>
            {new Date(request.created_at).toLocaleString()}
          </Text>
        </View>

        {/* Comment from UK */}
        {request.comment && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('requests.comment')}</Text>
            <View style={styles.commentBox}>
              <Ionicons name="chatbubble-ellipses" size={16} color={TEAL} />
              <Text style={styles.commentText}>{request.comment}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 16, marginTop: 8,
  },
  backText: { color: TEAL, fontSize: 16, fontWeight: '500' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start', marginTop: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  field: { marginBottom: 16 },
  label: {
    fontSize: 11, color: '#999', marginBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  value: { fontSize: 15, color: '#111', lineHeight: 20 },
  photo: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  commentBox: {
    backgroundColor: '#F0FDFA', borderRadius: 10, padding: 12,
    marginTop: 4, flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  commentText: { fontSize: 14, color: '#374151', flex: 1 },
});
