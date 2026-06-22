import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../api';

const TEAL = '#0D9488';
const BG = '#F0FDFA';

const STATUS_CONFIG = {
  new: { color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-circle' },
  in_progress: { color: '#3B82F6', bg: '#DBEAFE', icon: 'sync-circle' },
  done: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' },
  cancelled: { color: '#9CA3AF', bg: '#F3F4F6', icon: 'close-circle' },
};

export default function RequestsScreen({ navigation }) {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/requests');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filtered = filter ? requests.filter((r) => r.status === filter) : requests;

  const filters = [
    { value: '', label: t('requests.all'), icon: 'funnel' },
    { value: 'new', label: t('requests.new'), icon: 'alert-circle', color: '#F59E0B' },
    { value: 'in_progress', label: t('requests.inProgress'), icon: 'sync-circle', color: '#3B82F6' },
    { value: 'done', label: t('requests.done'), icon: 'checkmark-circle', color: '#10B981' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="list" size={22} color="#fff" />
          </View>
          <Text style={styles.title}>{t('requests.title')}</Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        <View style={styles.filters}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterBtn,
                filter === f.value && styles.filterBtnActive,
              ]}
              onPress={() => setFilter(f.value)}
            >
              <Ionicons
                name={f.icon}
                size={16}
                color={filter === f.value ? '#fff' : (f.color || '#666')}
              />
              <Text style={[
                styles.filterText,
                filter === f.value && styles.filterTextActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.centerState}>
          <Ionicons name="hourglass-outline" size={40} color="#ccc" />
          <Text style={styles.centerText}>{t('common.loading')}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="document-text-outline" size={40} color="#ccc" />
          <Text style={styles.centerText}>{t('requests.noRequests')}</Text>
        </View>
      ) : (
        filtered.map((r) => {
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.new;
          return (
            <TouchableOpacity
              key={r.id}
              style={styles.item}
              onPress={() => navigation.navigate('RequestDetail', { id: r.id })}
            >
              <View style={styles.itemTop}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[styles.statusText, { color: cfg.color }]}>
                    {t(`requests.${r.status}`)}
                  </Text>
                </View>
                <Text style={styles.itemId}>#{r.id}</Text>
              </View>
              <Text style={styles.itemCategory}>{r.category}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>{r.description}</Text>
              <View style={styles.itemBottom}>
                <Ionicons name="calendar-outline" size={12} color="#999" />
                <Text style={styles.itemDate}>
                  {new Date(r.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0F766E' },
  filtersScroll: { marginBottom: 16 },
  filters: { flexDirection: 'row', gap: 8 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: { backgroundColor: TEAL, borderColor: TEAL },
  filterText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  centerState: { alignItems: 'center', padding: 40 },
  centerText: { color: '#999', marginTop: 8, fontSize: 14 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  itemId: { fontSize: 12, color: TEAL, fontWeight: '600' },
  itemCategory: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 4 },
  itemDesc: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemDate: { fontSize: 11, color: '#999' },
});
