/**
 * Offline Mode Banner Component
 * Displays a warning when external security services are unavailable
 * Shows in both the scanner and result screens
 */

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';

interface OfflineModeBannerProps {
  isOffline: boolean;
  cacheHit?: boolean;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export function OfflineModeBanner({
  isOffline,
  cacheHit = false,
  onDismiss,
  showDismiss = false,
}: OfflineModeBannerProps) {
  const backgroundColor = useThemeColor({ light: '#FEF3C7', dark: '#451a03' }, 'background');
  const textColor = useThemeColor({ light: '#92400E', dark: '#FCD34D' }, 'text');
  const borderColor = useThemeColor({ light: '#F59E0B', dark: '#D97706' }, 'text');

  // Don't render if not offline
  if (!isOffline && !cacheHit) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor, borderColor }, styles.bannerBorder]}>
      <View style={styles.content}>
        <MaterialIcons
          name={isOffline ? 'cloud-off' : 'cached'}
          size={20}
          color={borderColor}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]}>
            {isOffline ? 'Limited Check - Offline Mode' : 'Cached Result'}
          </Text>
          <Text style={[styles.message, { color: textColor }]}>
            {isOffline
              ? 'External security services are unavailable. Only local heuristics were performed. Use extra caution.'
              : 'This result was retrieved from cache. The check may not reflect the current status.'}
          </Text>
        </View>
      </View>
      {showDismiss && onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <MaterialIcons name="close" size={20} color={borderColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  bannerBorder: {
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

/**
 * Compact version for inline use (e.g., in check items)
 */
interface OfflineIndicatorProps {
  isOffline: boolean;
}

export function OfflineIndicator({ isOffline }: OfflineIndicatorProps) {
  if (!isOffline) return null;

  return (
    <View style={indicatorStyles.container}>
      <MaterialIcons name="cloud-off" size={14} color="#EAB308" />
      <Text style={indicatorStyles.text}>Offline</Text>
    </View>
  );
}

const indicatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  text: {
    fontSize: 10,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '500',
  },
});
