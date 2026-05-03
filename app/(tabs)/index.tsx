/**
 * QR Scanner Screen
 * Main scanning interface with camera view
 * Located in (tabs) as the primary screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { parseQRData } from '../services/qr-parser';
import { analyzeQRSafety } from '../services/risk-calculator';
import { QRData, SafetyAnalysis } from '../types/qr.types';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width, height) * 0.7;

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || analyzing) return;

      setScanned(true);
      setAnalyzing(true);

      try {
        // Vibrate on successful scan
        Vibration.vibrate(50);

        // Parse QR data
        const qrData = parseQRData(data);
        console.log('QR Data:', qrData);

        // Analyze safety
        const safetyAnalysis = await analyzeQRSafety(qrData);
        console.log('Safety Analysis:', safetyAnalysis);

        // Navigate to results
        router.push({
          pathname: '/result',
          params: {
            qrData: JSON.stringify(qrData),
            safetyAnalysis: JSON.stringify(safetyAnalysis),
          },
        });
      } catch (error) {
        console.error('Error processing QR:', error);
        Alert.alert('Error', 'Failed to analyze QR code. Please try again.');
        setScanned(false);
      } finally {
        setAnalyzing(false);
      }
    },
    [scanned, analyzing]
  );

  const toggleTorch = () => {
    setTorchEnabled((prev) => !prev);
  };

  const resetScanner = () => {
    setScanned(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <MaterialIcons name="no-photography" size={64} color="#EF4444" />
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.text}>
          We need camera permission to scan QR codes
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        enableTorch={torchEnabled}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AmanQR Scanner</Text>
            <Text style={styles.headerSubtitle}>
              Point camera at a QR code to check safety
            </Text>
          </View>

          {/* Scan Area */}
          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scan line */}
              {!scanned && <View style={styles.scanLine} />}
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleTorch}>
              <MaterialIcons
                name={torchEnabled ? 'flash-on' : 'flash-off'}
                size={28}
                color="white"
              />
              <Text style={styles.controlText}>
                {torchEnabled ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>

            {scanned && (
              <TouchableOpacity
                style={[styles.controlButton, styles.scanAgainButton]}
                onPress={resetScanner}
                disabled={analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialIcons name="refresh" size={28} color="white" />
                    <Text style={styles.controlText}>Scan Again</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Loading Overlay - Full Screen */}
          {analyzing && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingTitle}>Analyzing QR Code...</Text>
                <Text style={styles.loadingSubtitle}>
                  Checking safety across multiple sources
                </Text>
                <View style={styles.checksContainer}>
                  <View style={styles.checkItem}>
                    <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                    <Text style={styles.checkText}>Parsing QR content</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                    <Text style={styles.checkText}>Running local heuristics</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <MaterialIcons name="pending" size={16} color="#EAB308" />
                    <Text style={styles.checkText}>AI safety analysis</Text>
                  </View>
                  <View style={styles.checkItem}>
                    <MaterialIcons name="pending" size={16} color="#EAB308" />
                    <Text style={styles.checkText}>Threat database check</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
    gap: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanAgainButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
  },
  controlText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingContent: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  checksContainer: {
    alignSelf: 'stretch',
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
