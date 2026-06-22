import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../api';

const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const BG = '#F0FDFA';

const STATUS_COLORS = {
  new: '#F59E0B',
  in_progress: '#3B82F6',
  done: '#10B981',
  cancelled: '#9CA3AF',
};

const STATUS_ICONS = {
  new: 'alert-circle',
  in_progress: 'sync-circle',
  done: 'checkmark-circle',
  cancelled: 'close-circle',
};

export default function DashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ new: 0, inProgress: 0, done: 0, total: 0 });
  const [recent, setRecent] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/requests');
      const requests = res.data;
      setStats({
        new: requests.filter((r) => r.status === 'new').length,
        inProgress: requests.filter((r) => r.status === 'in_progress').length,
        done: requests.filter((r) => r.status === 'done').length,
        total: requests.length,
      });
      setRecent(requests.slice(0, 5));
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

  const cards = [
    { label: t('dashboard.new'), value: stats.new, color: STATUS_COLORS.new, icon: 'alert-circle' },
    { label: t('dashboard.inProgress'), value: stats.inProgress, color: STATUS_COLORS.in_progress, icon: 'sync-circle' },
    { label: t('dashboard.done'), value: stats.done, color: STATUS_COLORS.done, icon: 'checkmark-circle' },
    { label: t('dashboard.total'), value: stats.total, color: TEAL, icon: 'clipboard' },
  ];

  const getStatusIcon = (status) => STATUS_ICONS[status] || 'ellipse';
  const getStatusColor = (status) => STATUS_COLORS[status] || '#999';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="business" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.title}>DomApp</Text>
            <Text style={styles.subtitle}>{t('dashboard.title')}</Text>
          </View>
        </View>
      </View>

      {/* Stat Cards */}
      <View style={styles.cardsRow}>
        {cards.map((card) => (
          <View key={card.label} style={styles.card}>
            <View style={[styles.cardIconWrap, { backgroundColor: card.color + '15' }]}>
              <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('dashboard.recentRequests')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
          <Text style={styles.sectionLink}>{t('dashboard.allRequests')} →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <Ionicons name="hourglass-outline" size={32} color="#ccc" />
          <Text style={styles.loadingText}>{t('dashboard.loading')}</Text>
        </View>
      ) : recent.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>{t('dashboard.noRequests')}</Text>
        </View>
      ) : (
        recent.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.requestItem}
            onPress={() => navigation.navigate('RequestDetail', { id: r.id })}
          >
            <View style={styles.requestLeft}>
              <Ionicons
                name={getStatusIcon(r.status)}
                size={24}
                color={getStatusColor(r.status)}
              />
              <View style={styles.requestInfo}>
                <Text style={styles.requestDesc} numberOfLines={1}>{r.description}</Text>
                <Text style={styles.requestMeta}>
                  {r.category} · {new Date(r.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))
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
    marginBottom: 20,
    marginTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0F766E' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 1 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardValue: { fontSize: 28, fontWeight: '700' },
  cardLabel: { fontSize: 13, color: '#666', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  sectionLink: { fontSize: 13, color: TEAL, fontWeight: '500' },
  loadingState: { alignItems: 'center', padding: 32 },
  loadingText: { color: '#999', marginTop: 8, fontSize: 14 },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  requestInfo: { flex: 1 },
  requestDesc: { fontSize: 14, fontWeight: '500', color: '#111' },
  requestMeta: { fontSize: 12, color: '#999', marginTop: 2 },
});
