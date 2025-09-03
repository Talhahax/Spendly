import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatsCardProps } from '../types';
import { formatCurrency } from '../utils';

interface ExtendedStatsCardProps extends StatsCardProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}

const StatsCard: React.FC<ExtendedStatsCardProps> = memo(({
  title,
  amount,
  icon,
  gradient,
  isProjection = false,
  showInfo = false,
  onInfoPress,
  fadeAnim,
  slideAnim
}) => {
  return (
    <Animated.View 
      style={[
        styles.statsCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={gradient as any}
        style={styles.statsCardGradient}
      >
        <View style={styles.statsCardHeader}>
          <View style={styles.statsCardIconContainer}>
            <Ionicons name={icon} size={24} color="#ffffff" />
          </View>
          {showInfo && onInfoPress && (
            <TouchableOpacity onPress={onInfoPress} style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={20} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.statsCardTitle}>{title}</Text>
        <Text style={styles.statsCardAmount}>
          {formatCurrency(amount)}
        </Text>
        
        {isProjection && (
          <View style={styles.projectionBadge}>
            <Text style={styles.projectionText}>Projected</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  statsCard: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsCardGradient: {
    padding: 20,
    minHeight: 120,
  },
  statsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButton: {
    padding: 5,
  },
  statsCardTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
    fontWeight: '500',
  },
  statsCardAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 5,
  },
  projectionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  projectionText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default StatsCard;
