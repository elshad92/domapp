import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import residentApi from '../residentApi';

const TEAL = '#0D9488';
const BG = '#F0FDFA';

const STATUS_COLORS = {
  new: '#F59E0B',
  in_progress: '#3B82F6',
  done: '#10B981',
};

export default function ResidentDashboardScreen({ navigation }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [profileRes, paymentsRes, requestsRes] = await Promise.all([
        residentApi.get('/resident/me'),
        residentApi.get('/resident/me/payments'),
        residentApi.get('/resident/me/requests'),
      ]);
      setProfile(profileRes.data);
      setPayments(paymentsRes.data);
      setRequests(requestsRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        await AsyncStorage.multiRemove(['resident_token', 'resident_name', 'resident_id']);
        navigation.replace('ResidentLogin');
      }
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

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['resident_token', 'resident_name', 'resident_id']);
    navigation.replace('ResidentLogin');
  };

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const balance = profile?.balance || 0;

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
            <Text style={styles.subtitle}>{t('resident.dashboard')}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      {profile && (
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="home" size={24} color={TEAL} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profilePhone}>
                <Ionicons name="call-outline" size={12} color="#999" /> {profile.phone}
              </Text>
            </View>
          </View>
          <View style={styles.profileDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t('apartments.number')}</Text>
              <Text style={styles.detailValue}>{profile.apartment_number || '—'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t('buildings.address')}</Text>
              <Text style={styles.detailValue}>{profile.building_address || '—'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Balance */}
      {profile && (
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>{t('resident.balance')}</Text>
            <Text style={[styles.balanceValue, balance > 0 ? { color: '#EF4444' } : { color: '#10B981' }]}>
              {balance > 0 ? `-${balance.toLocaleString()} сум` : '0 сум'}
            </Text>
          </View>
          <View style={[styles.balanceIcon, balance > 0 ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#D1FAE5' }]}>
            <Ionicons
              name="card-outline"
              size={28}
              color={balance > 0 ? '#EF4444' : '#10B981'}
            />
          </View>
        </View>
      )}

      {/* Payment Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{payments.length}</Text>
          <Text style={styles.statLabel}>{t('resident.totalPayments')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{paidCount}</Text>
          <Text style={styles.statLabel}>{t('resident.paid')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>{t('resident.pending')}</Text>
        </View>
      </View>

      {/* Recent Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('resident.recentRequests')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ResidentRequests')}>
          <Text style={styles.sectionLink}>{t('resident.allRequests')} →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <Ionicons name="hourglass-outline" size={32} color="#ccc" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="document-text-outline" size={40} color="#ccc" />
          <Text style={styles.centerText}>{t('resident.noRequests')}</Text>
        </View>
      ) : (
        requests.slice(0, 5).map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.requestItem}
            onPress={() => navigation.navigate('ResidentRequestDetail', { id: r.id })}
          >
            <View style={styles.requestLeft}>
              <Ionicons
                name={r.status === 'new' ? 'alert-circle' : r.status === 'in_progress' ? 'sync-circle' : 'checkmark-circle'}
                size={24}
                color={STATUS_COLORS[r.status] || '#999'}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0F766E' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 1 },
  logoutBtn: { padding: 8 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#CCFBF1', justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '600', color: '#111' },
  profilePhone: { fontSize: 13, color: '#666', marginTop: 2 },
  profileDetails: { flexDirection: 'row', gap: 8 },
  detailItem: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10,
  },
  detailLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  balanceCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  balanceLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: '700' },
  balanceIcon: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: TEAL },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2, textAlign: 'center' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  sectionLink: { fontSize: 13, color: TEAL, fontWeight: '500' },
  centerState: { alignItems: 'center', padding: 32 },
  centerText: { color: '#999', marginTop: 8, fontSize: 14 },
  requestItem: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  requestInfo: { flex: 1 },
  requestDesc: { fontSize: 14, fontWeight: '500', color: '#111' },
  requestMeta: { fontSize: 12, color: '#999', marginTop: 2 },
});
