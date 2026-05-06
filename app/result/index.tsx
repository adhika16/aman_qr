/**
 * QR Scan Result Screen - Sheet Modal
 * Displays safety analysis results with risk score and recommendations
 * Presented as a modal sheet from the bottom
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Clipboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { OfflineModeBanner } from '@/components/offline-mode-banner';
import {
  QRData,
  SafetyAnalysis,
  QRType,
  RISK_LEVEL_CONFIG,
  QR_TYPE_LABELS,
  URLContent,
  UPIPaymentContent,
  RiskLevel,
} from '../types/qr.types';

export default function ResultScreen() {
  const { qrData: qrDataString, safetyAnalysis: safetyAnalysisString } = useLocalSearchParams<{
    qrData: string;
    safetyAnalysis: string;
  }>();

  // Parse the data from route params
  const qrData: QRData = JSON.parse(qrDataString || '{}');
  const safetyAnalysis: SafetyAnalysis = JSON.parse(safetyAnalysisString || '{}');

  // Get risk level config
  const riskConfig = RISK_LEVEL_CONFIG[safetyAnalysis?.riskLevel || RiskLevel.SAFE];

  // Check if we're in offline mode
  const isOffline = safetyAnalysis?.checks?.some(
    check => check.source !== 'local-heuristics' && check.confidence === 0
  ) ?? false;

  const handleClose = () => {
    router.back();
  };

  const handleCopy = () => {
    Clipboard.setString(qrData.rawContent);
    Alert.alert('Copied', 'QR content copied to clipboard');
  };

  const renderContentPreview = () => {
    switch (qrData.type) {
      case QRType.URL: {
        const content = qrData.parsedContent as URLContent;
        return (
          <View style={styles.contentSection}>
            <Text style={styles.contentLabel}>Website URL</Text>
            <Text style={styles.contentValue} numberOfLines={2}>
              {content.originalUrl}
            </Text>
            <View style={styles.urlDetails}>
              <View style={styles.detailItem}>
                <MaterialIcons
                  name={content.isHttps ? 'lock' : 'lock-open'}
                  size={16}
                  color={content.isHttps ? '#22C55E' : '#EF4444'}
                />
                <Text style={[styles.detailText, { color: content.isHttps ? '#22C55E' : '#EF4444' }]}>
                  {content.isHttps ? 'HTTPS Secure' : 'HTTP Not Secure'}
                </Text>
              </View>
              {content.isShortened && (
                <View style={styles.detailItem}>
                  <MaterialIcons name="short-text" size={16} color="#EAB308" />
                  <Text style={[styles.detailText, { color: '#EAB308' }]}>
                    Shortened URL
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      }

      case QRType.UPI_PAYMENT: {
        const content = qrData.parsedContent as UPIPaymentContent;
        return (
          <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#D97706" />
              <Text style={styles.paymentTitle}>Payment Details</Text>
            </View>
            
            <View style={styles.paymentDetails}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payee Name</Text>
                <Text style={styles.paymentValue}>
                  {content.payeeName || 'Not specified'}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>UPI ID</Text>
                <Text style={styles.paymentValue}>
                  {content.payeeId}
                </Text>
              </View>
              {content.amount && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Amount</Text>
                  <Text style={[styles.paymentValue, styles.paymentAmount]}>
                    ₹{content.amount}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.paymentWarning}>
              <MaterialIcons name="warning-amber" size={20} color="#D97706" />
              <Text style={styles.paymentWarningText}>
                ⚠️ Always verify payee details before making payment
              </Text>
            </View>
          </View>
        );
      }

      default:
        return (
          <View style={styles.contentSection}>
            <Text style={styles.contentLabel}>
              {QR_TYPE_LABELS[qrData.type] || 'Content'}
            </Text>
            <Text style={styles.contentValue} numberOfLines={3}>
              {qrData.rawContent}
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sheet Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header with Close Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Result</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Risk Score Card */}
        <View style={[styles.scoreCard, { borderColor: riskConfig.color }]}>
          <View style={[styles.scoreCircle, { backgroundColor: riskConfig.bgColor }]}>
            <Text style={[styles.scoreNumber, { color: riskConfig.color }]}>
              {safetyAnalysis?.riskScore || 0}
            </Text>
            <Text style={[styles.scoreLabel, { color: riskConfig.color }]}>/ 10</Text>
          </View>

          <View style={styles.riskInfo}>
            <Text style={[styles.riskLevel, { color: riskConfig.color }]}>
              {riskConfig.label}
            </Text>
            <Text style={styles.riskDescription}>{riskConfig.description}</Text>
          </View>
        </View>

        {/* Offline Mode Banner */}
        <OfflineModeBanner isOffline={isOffline} />

        {/* Content Preview */}
        {renderContentPreview()}

        {/* Explanation */}
        {safetyAnalysis?.explanations?.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analysis</Text>
            <Text style={styles.explanationText}>
              {safetyAnalysis.explanations.summary}
            </Text>
            {safetyAnalysis.explanations.details?.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <MaterialIcons name="check-circle" size={16} color="#3B82F6" style={styles.detailIcon} />
                <Text style={styles.explanationText}>{detail}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Red Flags */}
        {safetyAnalysis?.redFlags && safetyAnalysis.redFlags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>⚠️ Concerns Detected</Text>
            {safetyAnalysis.redFlags.map((flag, index) => (
              <View key={index} style={styles.flagItem}>
                <MaterialIcons name="warning" size={20} color="#EF4444" />
                <Text style={styles.flagText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {safetyAnalysis?.recommendations && safetyAnalysis.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {safetyAnalysis.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <MaterialIcons name="lightbulb" size={16} color="#EAB308" style={styles.recommendationIcon} />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Safety Checks */}
        {safetyAnalysis?.checks && safetyAnalysis.checks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety Checks</Text>
            {safetyAnalysis.checks.map((check, index) => (
              <View key={index} style={styles.checkItem}>
                <View style={styles.checkHeader}>
                  <View style={styles.checkSourceContainer}>
                    <Text style={styles.checkSource}>{check.source}</Text>
                    {check.confidence === 0 && check.source !== 'local-heuristics' && (
                      <View style={styles.offlineBadge}>
                        <MaterialIcons name="cloud-off" size={10} color="#92400E" />
                        <Text style={styles.offlineBadgeText}>Offline</Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.checkBadge,
                      {
                        backgroundColor: check.isThreat ? '#EF4444' : '#22C55E',
                      },
                    ]}
                  >
                    <Text style={styles.checkBadgeText}>
                      {check.isThreat ? 'Risk' : 'Safe'}
                    </Text>
                  </View>
                </View>
                {check.details && (
                  <Text style={styles.checkDetails}>{check.details}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Bottom Action Buttons - Simplified: Copy | Scan Again | Close */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
          <MaterialIcons name="content-copy" size={24} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Copy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
          <MaterialIcons name="qr-code-scanner" size={24} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Scan Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleClose}>
          <MaterialIcons name="close" size={24} color="#6B7280" />
          <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  scoreCard: {
    margin: 16,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  riskInfo: {
    marginLeft: 20,
    flex: 1,
  },
  riskLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  contentSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  contentLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  contentValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  urlDetails: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Payment Section Styles
  paymentSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  paymentDetails: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentAmount: {
    color: '#059669',
    fontSize: 16,
  },
  paymentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  paymentWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  flagText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  checkItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkSource: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  offlineBadgeText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '500',
  },
  checkBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  checkBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  checkDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  bottomSpacing: {
    height: 100,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
