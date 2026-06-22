import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '../api';

const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';
const BG = '#F0FDFA';

const STATUS_CONFIG = {
  new: { color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-circle' },
  in_progress: { color: '#3B82F6', bg: '#DBEAFE', icon: 'sync-circle' },
  done: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' },
};

const statusOptions = [
  { value: 'new', labelKey: 'requests.new', icon: 'alert-circle', color: '#F59E0B' },
  { value: 'in_progress', labelKey: 'requests.inProgress', icon: 'sync-circle', color: '#3B82F6' },
  { value: 'done', labelKey: 'requests.done', icon: 'checkmark-circle', color: '#10B981' },
];

export default function RequestDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { id } = route.params;
  const [request, setRequest] = useState(null);
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/requests')
      .then((res) => {
        const found = res.data.find((r) => r.id === parseInt(id));
        if (found) {
          setRequest(found);
          setStatus(found.status);
        } else {
          navigation.goBack();
        }
      })
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async () => {
    try {
      await api.patch(`/requests/${id}`, { status });
      setRequest((prev) => ({ ...prev, status }));
      Alert.alert(t('common.success'), t('requests.statusUpdated'));
    } catch (err) {
      Alert.alert(t('common.error'), t('requests.statusUpdateError'));
    }
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.patch(`/requests/${id}`, { comment: comment.trim() });
      setRequest((prev) => ({ ...prev, comment: comment.trim() }));
      setComment('');
      Alert.alert(t('common.success'), t('requests.commentSaved'));
    } catch (err) {
      Alert.alert(t('common.error'), t('requests.commentSaveError'));
    }
  };

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

        {request.comment && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('requests.comment')}</Text>
            <View style={styles.commentBox}>
              <Ionicons name="chatbubble-ellipses" size={16} color={TEAL} />
              <Text style={styles.commentText}>{request.comment}</Text>
            </View>
          </View>
        )}

        {/* Status Change */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('requests.status')}</Text>
          <View style={styles.row}>
            <View style={styles.picker}>
              {statusOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.option,
                    status === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                  ]}
                  onPress={() => setStatus(opt.value)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={status === opt.value ? '#fff' : opt.color}
                  />
                  <Text style={[
                    styles.optionText,
                    status === opt.value && styles.optionTextActive,
                  ]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleStatusChange}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('requests.addComment')}</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder={t('requests.commentPlaceholder')}
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveComment}>
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
    marginTop: 8,
  },
  backText: { color: TEAL, fontSize: 16, fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  field: { marginBottom: 16 },
  label: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { fontSize: 15, color: '#111', lineHeight: 20 },
  photo: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  commentBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  commentText: { fontSize: 14, color: '#374151', flex: 1 },
  section: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  picker: { flexDirection: 'column', flex: 1, gap: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionActive: { backgroundColor: TEAL, borderColor: TEAL },
  optionText: { fontSize: 13, color: '#666', fontWeight: '500' },
  optionTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: TEAL,
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    minHeight: 40,
  },
});
