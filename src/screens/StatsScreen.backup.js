import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart, LineChart, ProgressChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';
import { statsAPI } from '../services/api';
import { ThemedView, ThemedText, Card, LoadingState, EmptyState } from '../components/ui';
import { spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2;

// Stat Card Component
const StatCard = ({ icon, iconColor, title, value, subtitle, theme }) => (
  <Card style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: iconColor + '20' }]}>
      {icon}
    </View>
    <View style={styles.statContent}>
      <ThemedText color="secondary" style={styles.statTitle} numberOfLines={1}>{title}</ThemedText>
      <ThemedText variant="h3" style={styles.statValue} numberOfLines={1}>{value}</ThemedText>
      {subtitle && (
        <ThemedText color="secondary" style={styles.statSubtitle} numberOfLines={1}>{subtitle}</ThemedText>
      )}
    </View>
  </Card>
);

// Insight Card Component
const InsightCard = ({ icon, title, value, color, theme }) => (
  <View style={[styles.insightCard, { backgroundColor: color + '15', borderColor: color + '30' }]}>
    {icon}
    <View style={styles.insightContent}>
      <ThemedText color="secondary" style={styles.insightTitle}>{title}</ThemedText>
      <ThemedText style={styles.insightValue}>{value}</ThemedText>
    </View>
  </View>
);

const StatsScreen = () => {
  const { theme, chartColors } = useTheme();
  const { t } = useI18n();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [decksData, setDecksData] = useState([]);
  const [insights, setInsights] = useState(null);

  // Fetch stats on focus
  useFocusEffect(
    useCallback(() => {
      fetchAllStats();
    }, [period])
  );

  const fetchAllStats = async () => {
    try {
      const [overviewRes, dailyRes, decksRes, insightsRes] = await Promise.all([
        statsAPI.getOverview(),
        statsAPI.getDailyActivity(period),
        statsAPI.getAllDecks(),
        statsAPI.getInsights().catch(() => ({ data: null })),
      ]);

      setOverview(overviewRes.data);
      setDailyData(dailyRes.data?.daily || []);
      setDecksData(decksRes.data?.decks || []);
      setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllStats();
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: theme.background.card,
    backgroundGradientTo: theme.background.card,
    decimalCount: 0,
    color: (opacity = 1) => chartColors?.primary || theme.primary.main,
    labelColor: (opacity = 1) => theme.text.secondary,
    style: {
      borderRadius: borderRadius.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: chartColors?.primary || theme.primary.main,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.border.main + '40',
    },
  };

  // Period options
  const periods = [
    { key: '7', label: t('7_days') || '7D' },
    { key: '30', label: t('30_days') || '30D' },
    { key: '90', label: t('90_days') || '90D' },
    { key: '365', label: t('1_year') || '1Y' },
    { key: 'all', label: t('all_time_short') || 'All' },
  ];

  if (loading) {
    return (
      <ThemedView variant="gradient" style={styles.container}>
        <LoadingState fullScreen message={t('loading')} />
      </ThemedView>
    );
  }

  // Prepare chart data
  const chartLabels = dailyData.slice(-7).map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en', { weekday: 'short' });
  });
  
  const cardsStudiedData = dailyData.slice(-7).map(d => parseInt(d.cards_studied) || 0);

  // Calculate weekly trend
  const weeklyTrend = insights?.weeklyComparison ? (() => {
    const { current, previous } = insights.weeklyComparison;
    if (previous?.cards === 0) return current?.cards > 0 ? 100 : 0;
    return previous?.cards ? Math.round(((current.cards - previous.cards) / previous.cards) * 100) : 0;
  })() : 0;

  // Get values with fallback for different API response formats
  const getValue = (primary, fallback) => overview?.[primary] ?? overview?.[fallback] ?? 0;

  return (
    <ThemedView variant="gradient" style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <MaterialCommunityIcons name="chart-line" size={28} color={theme.primary.main} />
              <ThemedText variant="h2">{t('statistics')}</ThemedText>
            </View>
            <ThemedText color="secondary">{t('stats_subtitle')}</ThemedText>
          </View>

          {/* Top Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon={<MaterialCommunityIcons name="cards" size={24} color="#3b82f6" />}
              iconColor="#3b82f6"
              title={t('total_cards') || 'Total Cards'}
              value={getValue('totalCards', 'total_cards')}
              subtitle={`${getValue('totalDecks', 'total_decks')} ${t('decks') || 'decks'}`}
              theme={theme}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="school" size={24} color="#22c55e" />}
              iconColor="#22c55e"
              title={t('cards_studied') || 'Studied'}
              value={getValue('totalCardsStudied', 'total_cards_studied')}
              subtitle={weeklyTrend !== 0 ? `${weeklyTrend > 0 ? '+' : ''}${weeklyTrend}% ${t('vs_last_week') || 'vs last week'}` : null}
              theme={theme}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="crosshairs" size={24} color="#8b5cf6" />}
              iconColor="#8b5cf6"
              title={t('accuracy') || 'Accuracy'}
              value={`${getValue('accuracy', 'average_accuracy')}%`}
              subtitle={`${getValue('totalCorrect', 'total_correct')}/${getValue('totalCorrect', 'total_correct') + getValue('totalWrong', 'total_wrong')}`}
              theme={theme}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="fire" size={24} color="#f59e0b" />}
              iconColor="#f59e0b"
              title={t('current_streak') || 'Streak'}
              value={`${getValue('currentStreak', 'current_streak')}`}
              subtitle={`${t('best') || 'Best'}: ${getValue('longestStreak', 'longest_streak')}`}
              theme={theme}
            />
          </View>

          {/* Secondary Stats */}
          <View style={styles.secondaryStatsGrid}>
            <StatCard
              icon={<MaterialCommunityIcons name="clock-outline" size={24} color="#06b6d4" />}
              iconColor="#06b6d4"
              title={t('study_time') || 'Study Time'}
              value={formatDuration(getValue('totalStudyTime', 'total_study_time'))}
              theme={theme}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="check-circle" size={24} color="#22c55e" />}
              iconColor="#22c55e"
              title={t('correct_answers') || 'Correct'}
              value={getValue('totalCorrect', 'total_correct')}
              theme={theme}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />}
              iconColor="#ef4444"
              title={t('wrong_answers') || 'Wrong'}
              value={getValue('totalWrong', 'total_wrong')}
              theme={theme}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="calendar-check" size={24} color="#ec4899" />}
              iconColor="#ec4899"
              title={t('sessions') || 'Sessions'}
              value={getValue('totalSessions', 'total_sessions')}
              theme={theme}
            />
          </View>

          {/* Insights */}
          {(insights || overview?.insights) && (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="lightbulb-on" size={22} color="#f59e0b" />
                <ThemedText variant="h3">{t('insights') || 'Insights'}</ThemedText>
              </View>
              <View style={styles.insightsGrid}>
                {(insights?.bestHour || overview?.insights?.best_hour) && (
                  <InsightCard
                    icon={<MaterialCommunityIcons name="clock" size={24} color="#06b6d4" />}
                    title={t('best_study_hour') || 'Best Hour'}
                    value={`${insights?.bestHour?.hour ?? overview?.insights?.best_hour}:00 (${insights?.bestHour?.accuracy ?? overview?.insights?.best_hour_accuracy ?? 0}%)`}
                    color="#06b6d4"
                    theme={theme}
                  />
                )}
                {(insights?.bestDay || overview?.insights?.best_day) && (
                  <InsightCard
                    icon={<MaterialCommunityIcons name="calendar" size={24} color="#8b5cf6" />}
                    title={t('best_study_day') || 'Best Day'}
                    value={`${t(`day_${(insights?.bestDay?.day ?? overview?.insights?.best_day)?.toLowerCase()}`) || insights?.bestDay?.day || overview?.insights?.best_day} (${insights?.bestDay?.accuracy ?? overview?.insights?.best_day_accuracy ?? 0}%)`}
                    color="#8b5cf6"
                    theme={theme}
                  />
                )}
                {(insights?.mostActiveMode || overview?.insights?.favorite_mode) && (
                  <InsightCard
                    icon={<MaterialCommunityIcons name="star" size={24} color="#22c55e" />}
                    title={t('favorite_mode') || 'Mode'}
                    value={t(`mode_${insights?.mostActiveMode?.game_mode ?? overview?.insights?.favorite_mode}`) || 'Standard'}
                    color="#22c55e"
                    theme={theme}
                  />
                )}
                {(overview?.bestDeck || decksData?.[0]) && (
                  <InsightCard
                    icon={<MaterialCommunityIcons name="folder-star" size={24} color="#3b82f6" />}
                    title={t('best_deck') || 'Best Deck'}
                    value={`${(overview?.bestDeck?.title || decksData?.[0]?.title || '-').substring(0, 12)}${(overview?.bestDeck?.title || decksData?.[0]?.title || '').length > 12 ? '...' : ''} (${overview?.bestDeck?.accuracy ?? decksData?.[0]?.accuracy ?? 0}%)`}
                    color="#3b82f6"
                    theme={theme}
                  />
                )}
              </View>
            </Card>
          )}

          {/* Period Selector */}
          <View style={styles.periodContainer}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.periodButton,
                  { 
                    backgroundColor: period === p.key ? theme.primary.main : theme.background.elevated,
                    borderColor: period === p.key ? theme.primary.main : theme.border.main,
                  }
                ]}
                onPress={() => setPeriod(p.key)}
              >
                <Text style={[
                  styles.periodText,
                  { color: period === p.key ? '#fff' : theme.text.secondary }
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {[
              { key: 0, label: t('overview') || 'Overview' },
              { key: 1, label: t('decks') || 'Decks' },
              { key: 2, label: t('activity') || 'Activity' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  activeTab === tab.key && styles.tabButtonActive,
                  { borderColor: activeTab === tab.key ? theme.primary.main : 'transparent' }
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? theme.primary.main : theme.text.secondary }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content: Overview */}
          {activeTab === 0 && (
            <>
              {/* Study Activity Line Chart */}
              {dailyData.length > 0 && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="chart-line" size={22} color={theme.primary.main} />
                    <ThemedText variant="h3">{t('study_activity') || 'Study Activity'}</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: chartLabels.length > 0 ? chartLabels : [''],
                        datasets: [{ data: cardsStudiedData.length > 0 ? cardsStudiedData : [0] }],
                      }}
                      width={Math.max(CHART_WIDTH, chartLabels.length * 50)}
                      height={200}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      bezier
                      withDots
                      withInnerLines={false}
                      withOuterLines={false}
                      withVerticalLines={false}
                    />
                  </ScrollView>
                </Card>
              )}

              {/* Correct vs Wrong */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="check-decagram" size={22} color="#22c55e" />
                  <ThemedText variant="h3">{t('correct_vs_incorrect') || 'Accuracy'}</ThemedText>
                </View>
                <View style={styles.accuracyRow}>
                  <View style={styles.accuracyItem}>
                    <Text style={[styles.accuracyValue, { color: '#22c55e' }]}>
                      {getValue('totalCorrect', 'total_correct')}
                    </Text>
                    <ThemedText color="secondary">{t('correct') || 'Correct'}</ThemedText>
                  </View>
                  <View style={[styles.accuracyDivider, { backgroundColor: theme.border.main }]} />
                  <View style={styles.accuracyItem}>
                    <Text style={[styles.accuracyValue, { color: '#ef4444' }]}>
                      {getValue('totalWrong', 'total_wrong')}
                    </Text>
                    <ThemedText color="secondary">{t('incorrect') || 'Wrong'}</ThemedText>
                  </View>
                </View>
                <View style={[styles.progressBar, { backgroundColor: '#ef4444' }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: '#22c55e',
                        width: `${getValue('accuracy', 'average_accuracy')}%`,
                      }
                    ]} 
                  />
                </View>
                <ThemedText color="secondary" style={styles.accuracyPercent}>
                  {getValue('accuracy', 'average_accuracy')}% {t('accuracy') || 'accuracy'}
                </ThemedText>
              </Card>

              {/* Study Time Bar Chart */}
              {dailyData.length > 0 && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="clock-outline" size={22} color="#8b5cf6" />
                    <ThemedText variant="h3">{t('study_time_chart') || 'Study Time'}</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={{
                        labels: chartLabels.length > 0 ? chartLabels : [''],
                        datasets: [{ data: dailyData.slice(-7).map(d => Math.round((parseInt(d.study_time) || 0) / 60)) }],
                      }}
                      width={Math.max(CHART_WIDTH, chartLabels.length * 50)}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => '#8b5cf6',
                      }}
                      style={styles.chart}
                      fromZero
                      showValuesOnTopOfBars
                      withInnerLines={false}
                      yAxisSuffix="m"
                    />
                  </ScrollView>
                </Card>
              )}

              {/* Deck Performance Bar Chart */}
              {decksData.length > 0 && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="folder-star" size={22} color="#3b82f6" />
                    <ThemedText variant="h3">{t('deck_performance') || 'Deck Performance'}</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={{
                        labels: decksData.slice(0, 6).map(d => d.title.substring(0, 8)),
                        datasets: [{ data: decksData.slice(0, 6).map(d => parseFloat(d.accuracy) || 0) }],
                      }}
                      width={Math.max(CHART_WIDTH, decksData.slice(0, 6).length * 60)}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => '#3b82f6',
                      }}
                      style={styles.chart}
                      fromZero
                      showValuesOnTopOfBars
                      withInnerLines={false}
                      yAxisSuffix="%"
                    />
                  </ScrollView>
                </Card>
              )}
            </>
          )}

          {/* Tab Content: Decks */}
          {activeTab === 1 && (
            <>
              {/* Deck Performance Bar Chart */}
              {decksData.length > 0 && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="chart-bar" size={22} color="#3b82f6" />
                    <ThemedText variant="h3">{t('deck_accuracy') || 'Deck Accuracy'}</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={{
                        labels: decksData.slice(0, 8).map(d => d.title.substring(0, 6)),
                        datasets: [{ data: decksData.slice(0, 8).map(d => parseFloat(d.accuracy) || 0) }],
                      }}
                      width={Math.max(CHART_WIDTH, decksData.slice(0, 8).length * 50)}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => '#3b82f6',
                      }}
                      style={styles.chart}
                      fromZero
                      showValuesOnTopOfBars
                      withInnerLines={false}
                      yAxisSuffix="%"
                    />
                  </ScrollView>
                </Card>
              )}

              {/* Deck List */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="folder-multiple" size={22} color="#3b82f6" />
                  <ThemedText variant="h3">{t('all_decks') || 'All Decks'}</ThemedText>
                </View>
                {decksData.length > 0 ? (
                  decksData.map((deck, index) => (
                    <View key={deck.id || index} style={styles.deckRow}>
                      <View style={styles.deckInfo}>
                        <ThemedText style={styles.deckTitle} numberOfLines={1}>
                          {deck.title}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.deckMeta}>
                          {deck.cards_studied || 0} {t('cards') || 'cards'} • {deck.session_count || 0} {t('sessions') || 'sessions'}
                        </ThemedText>
                      </View>
                      <View style={styles.deckStatsRow}>
                        <View style={[styles.deckStatBadge, { backgroundColor: '#22c55e20' }]}>
                          <ThemedText style={[styles.deckStatText, { color: '#22c55e' }]}>
                            {deck.total_correct || 0}
                          </ThemedText>
                        </View>
                        <View style={[styles.deckStatBadge, { backgroundColor: '#ef444420' }]}>
                          <ThemedText style={[styles.deckStatText, { color: '#ef4444' }]}>
                            {deck.total_wrong || 0}
                          </ThemedText>
                        </View>
                        <View style={[styles.deckStatBadge, { backgroundColor: '#3b82f620' }]}>
                          <ThemedText style={[styles.deckStatText, { color: '#3b82f6' }]}>
                            {deck.accuracy || 0}%
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <ThemedText color="secondary" style={{ textAlign: 'center', paddingVertical: spacing.lg }}>
                    {t('no_data') || 'No data available'}
                  </ThemedText>
                )}
              </Card>
            </>
          )}

          {/* Tab Content: Activity */}
          {activeTab === 2 && (
            <>
              {/* Weekly Comparison */}
              {insights?.weeklyComparison && (
                <View style={styles.weeklyComparisonRow}>
                  <Card style={styles.weeklyCard}>
                    <ThemedText variant="h4" style={styles.weeklyCardTitle}>{t('this_week') || 'This Week'}</ThemedText>
                    <View style={styles.weeklyStatsRow}>
                      <View style={styles.weeklyStatItem}>
                        <ThemedText style={[styles.weeklyStatValue, { color: theme.primary.main }]}>
                          {insights.weeklyComparison.current?.cards || 0}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.weeklyStatLabel}>{t('cards') || 'Cards'}</ThemedText>
                      </View>
                      <View style={styles.weeklyStatItem}>
                        <ThemedText style={[styles.weeklyStatValue, { color: '#22c55e' }]}>
                          {insights.weeklyComparison.current?.correct || 0}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.weeklyStatLabel}>{t('correct') || 'Correct'}</ThemedText>
                      </View>
                      <View style={styles.weeklyStatItem}>
                        <ThemedText style={[styles.weeklyStatValue, { color: '#ef4444' }]}>
                          {insights.weeklyComparison.current?.wrong || 0}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.weeklyStatLabel}>{t('incorrect') || 'Wrong'}</ThemedText>
                      </View>
                    </View>
                  </Card>
                  <Card style={styles.weeklyCard}>
                    <ThemedText variant="h4" style={styles.weeklyCardTitle}>{t('last_week') || 'Last Week'}</ThemedText>
                    <View style={styles.weeklyStatsRow}>
                      <View style={styles.weeklyStatItem}>
                        <ThemedText style={[styles.weeklyStatValue, { color: theme.primary.main }]}>
                          {insights.weeklyComparison.previous?.cards || 0}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.weeklyStatLabel}>{t('cards') || 'Cards'}</ThemedText>
                      </View>
                      <View style={styles.weeklyStatItem}>
                        <ThemedText style={[styles.weeklyStatValue, { color: '#22c55e' }]}>
                          {insights.weeklyComparison.previous?.correct || 0}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.weeklyStatLabel}>{t('correct') || 'Correct'}</ThemedText>
                      </View>
                      <View style={styles.weeklyStatItem}>
                        <ThemedText style={[styles.weeklyStatValue, { color: '#ef4444' }]}>
                          {insights.weeklyComparison.previous?.wrong || 0}
                        </ThemedText>
                        <ThemedText color="secondary" style={styles.weeklyStatLabel}>{t('incorrect') || 'Wrong'}</ThemedText>
                      </View>
                    </View>
                  </Card>
                </View>
              )}

              {/* Daily Activity Line Chart */}
              {dailyData.length > 0 && (
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="chart-line" size={22} color={theme.primary.main} />
                    <ThemedText variant="h3">{t('daily_activity') || 'Daily Activity'}</ThemedText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: chartLabels.length > 0 ? chartLabels : [''],
                        datasets: [{ data: cardsStudiedData.length > 0 ? cardsStudiedData : [0] }],
                      }}
                      width={Math.max(CHART_WIDTH, chartLabels.length * 50)}
                      height={220}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      bezier
                      withDots
                      withInnerLines={false}
                      withOuterLines={false}
                      withVerticalLines={false}
                    />
                  </ScrollView>
                </Card>
              )}

              {/* Daily Stats List */}
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="calendar-text" size={22} color="#8b5cf6" />
                  <ThemedText variant="h3">{t('daily_breakdown') || 'Daily Breakdown'}</ThemedText>
                </View>
                {dailyData.slice(-7).reverse().map((day, index) => (
                  <View key={index} style={styles.dailyRow}>
                    <View style={styles.dailyDate}>
                      <ThemedText style={styles.dailyDateText}>
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </ThemedText>
                    </View>
                    <View style={styles.dailyStats}>
                      <View style={styles.dailyStatItem}>
                        <MaterialCommunityIcons name="cards" size={16} color="#3b82f6" />
                        <ThemedText style={styles.dailyStatValue}>{day.cards_studied || 0}</ThemedText>
                      </View>
                      <View style={styles.dailyStatItem}>
                        <MaterialCommunityIcons name="check" size={16} color="#22c55e" />
                        <ThemedText style={styles.dailyStatValue}>{day.correct || 0}</ThemedText>
                      </View>
                      <View style={styles.dailyStatItem}>
                        <MaterialCommunityIcons name="close" size={16} color="#ef4444" />
                        <ThemedText style={styles.dailyStatValue}>{day.wrong || 0}</ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

// Helper function for deck colors
const getDeckColor = (index) => {
  const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  secondaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 11,
    lineHeight: 13,
    marginBottom: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 1,
    lineHeight: 12,
  },
  sectionCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.md,
    marginLeft: -spacing.sm,
  },
  periodContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dailyDate: {
    flex: 1,
  },
  dailyDateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dailyStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dailyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  accuracyItem: {
    alignItems: 'center',
    flex: 1,
  },
  accuracyValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  accuracyDivider: {
    width: 1,
    height: 50,
    marginHorizontal: spacing.lg,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  accuracyPercent: {
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 13,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  insightCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  insightContent: {
    flex: 1,
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  deckRow: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  deckInfo: {
    marginBottom: spacing.sm,
  },
  deckTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  deckMeta: {
    fontSize: 12,
  },
  deckStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deckStatBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  deckStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deckProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  deckProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  weeklyComparisonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  weeklyCard: {
    flex: 1,
    padding: spacing.md,
  },
  weeklyCardTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  weeklyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weeklyStatItem: {
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  weeklyStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default StatsScreen;
