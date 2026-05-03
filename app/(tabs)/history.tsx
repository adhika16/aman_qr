/**
 * History Screen
 * Placeholder for future scan history feature
 * Will display past QR scans with their safety analysis
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan History</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="history" size={80} color="#D1D5DB" />
        </View>

        <Text style={styles.comingSoonTitle}>Coming Soon</Text>

        <Text style={styles.description}>
          Your scan history will be saved here for future reference.
        </Text>

        <Text style={styles.features}>
          Future features:
          {'\n'}• View past QR scans
          {'\n'}• Review safety analysis results
          {'\n'}• Search and filter history
          {'\n'}• Export safety reports
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  features: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
});
