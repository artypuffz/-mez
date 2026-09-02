import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { SPENDING_ACTIVITIES, type SpendingCategory } from '../domain/config/spendingActivities';
import { checkSpendingActivityEligibility, getSpendingActivityCooldownRemaining, type SpendingActivityRejection } from '../domain/spending/resolveSpendingActivity';
import type { PurchaseOwnershipRejection } from '../domain/spending/purchaseOwnership';
import { FOOD_TIER_CONFIG, HOUSING_PURCHASE, PHONE_PURCHASE, COMPUTER_PURCHASE } from '../domain/config/lifestyleConfig';
import type { ComputerTier, FoodTier, HousingTier, PhoneTier, ResolvedResourceDelta } from '../domain/state/types';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import { colors, spacing, typography } from '../theme/tokens';

function formatMoney(amount: number): string {
  return `₺${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

const FOOD_TIER_LABEL: Record<FoodTier, string> = { economical: 'Ekonomik Beslen', normal: 'Normal Beslen', good: 'İyi Beslen' };
const HOUSING_TIER_LABEL: Record<HousingTier, string> = { cheap: 'Ucuz Ev', normal: 'Normal Ev', good: 'Konforlu Ev' };
const PHONE_TIER_LABEL: Record<PhoneTier, string> = { old: 'Eski Telefon', normal: 'Normal Telefon', good: 'Yeni Telefon' };
const COMPUTER_TIER_LABEL: Record<ComputerTier, string> = { none: 'Bilgisayar Yok', basic: 'Temel Bilgisayar', good: 'İyi Bilgisayar' };

const CATEGORY_LABEL: Record<SpendingCategory, string> = { social: 'SOSYAL', rest: 'DİNLENME' };

const SPENDING_REJECTION_LABEL: Record<SpendingActivityRejection, string> = {
  unknown_activity: 'Kullanılamıyor.',
  not_eligible: 'Şu an için uygun değil.',
  on_cooldown: 'Yakın zamanda yapıldı.',
  insufficient_money: 'Yeterli paran yok.',
  insufficient_time: 'Yeterli boş zamanın yok.',
};

const OWNERSHIP_REJECTION_LABEL: Record<PurchaseOwnershipRejection, string> = {
  already_owned: 'Zaten bu seviyedesin.',
  insufficient_money: 'Yeterli paran yok.',
  insufficient_time: 'Yeterli boş zamanın yok.',
};

function effectSummary(effects: ResolvedResourceDelta): string {
  const labels: Record<string, string> = { stress: 'Stres', fatigue: 'Yorgunluk', burnout: 'Tükenmişlik', health: 'Sağlık', social: 'Sosyal' };
  return (Object.entries(effects) as [string, number | undefined][])
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => `${labels[k] ?? k} ${v! > 0 ? '+' : ''}${v}`)
    .join(' · ');
}

export default function SpendingScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const isProcessing = useGameStore((s) => s.isProcessingLifestyleAction);
  const resolveSpendingActivityAction = useGameStore((s) => s.resolveSpendingActivityAction);
  const purchaseOwnershipAction = useGameStore((s) => s.purchaseOwnershipAction);
  const setLifestyleFoodTierAction = useGameStore((s) => s.setLifestyleFoodTierAction);

  if (!gameState || gameState.career.phase !== 'residency') {
    return (
      <View style={styles.centered}>
        <ScreenHeader title="Harcamalar" icon="spending" />
        <Text style={styles.emptyText}>Asistanlık başladığında harcamaların burada görünecek.</Text>
      </View>
    );
  }

  const week = gameState.career.residencyWeek;
  const breakdown = gameState.economy.lastBreakdown;
  const monthlyFixed = breakdown ? breakdown.expenses.rent + breakdown.expenses.food + breakdown.expenses.transport + breakdown.expenses.utilities + breakdown.expenses.fixedOther : null;

  const socialActivities = SPENDING_ACTIVITIES.filter((a) => a.category === 'social');
  const restActivities = SPENDING_ACTIVITIES.filter((a) => a.category === 'rest');

  return (
    <ScrollView contentContainerStyle={styles.container} testID="spending-screen">
      <ScreenHeader title="Harcamalar" subtitle="Paranı yönet, kendine yatırım yap" icon="spending" />

      {/* Bütçe */}
      <Card>
        <Text style={styles.sectionHeading}>BÜTÇE</Text>
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetValue}>{formatMoney(gameState.resources.money)}</Text>
            <Text style={styles.budgetLabel}>Bakiye</Text>
          </View>
          {monthlyFixed !== null && (
            <View style={styles.budgetRight}>
              <Text style={styles.budgetValueSmall}>-{formatMoney(monthlyFixed)}</Text>
              <Text style={styles.budgetLabel}>Aylık sabit gider</Text>
            </View>
          )}
        </View>
        <View style={styles.currentTiersRow}>
          <Badge label={FOOD_TIER_LABEL[gameState.lifestyle.foodTier]} tone="neutral" icon="lifestyle" />
          <Badge label={HOUSING_TIER_LABEL[gameState.ownership.housing]} tone="neutral" icon="ownership" />
        </View>
      </Card>

      {/* Yaşam Tarzı */}
      <Card>
        <Text style={styles.sectionHeading}>YAŞAM TARZI</Text>
        {(Object.keys(FOOD_TIER_CONFIG) as FoodTier[]).map((tier) => {
          const selected = gameState.lifestyle.foodTier === tier;
          const cfg = FOOD_TIER_CONFIG[tier];
          return (
            <Card
              key={tier}
              variant={selected ? 'success' : 'interactive'}
              onPress={() => !isProcessing && !selected && setLifestyleFoodTierAction(tier)}
              disabled={isProcessing}
              testID={`food-tier-${tier}`}
            >
              <View style={styles.tierRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierTitle}>{FOOD_TIER_LABEL[tier]}</Text>
                  <Text style={styles.tierMeta}>
                    Sağlık {cfg.healthModifier > 0 ? '+' : ''}{cfg.healthModifier === 0 ? '±0' : cfg.healthModifier} · Gıda gideri x{cfg.costMultiplier}
                  </Text>
                </View>
                {selected && <Icon name="checkmark" size={18} color={colors.success} />}
              </View>
            </Card>
          );
        })}
      </Card>

      {/* Aktiviteler */}
      <Card>
        <Text style={styles.sectionHeading}>AKTİVİTELER</Text>
        {([['SOSYAL', socialActivities], ['DİNLENME', restActivities]] as const).map(([label, activities]) => (
          <View key={label} style={styles.activityGroup}>
            <Text style={styles.groupLabel}>{label}</Text>
            {activities.map((activity) => {
              const eligibility = checkSpendingActivityEligibility(gameState, activity.id, week);
              const cooldownWeeks = getSpendingActivityCooldownRemaining(gameState, activity.id, week);
              return (
                <Card key={activity.id} testID={`activity-${activity.id}`}>
                  <Text style={styles.activityTitle}>{activity.label}</Text>
                  <Text style={styles.activityMeta}>
                    {formatMoney(activity.cost.money)} · {activity.cost.freeTimeHours} saat
                  </Text>
                  <Text style={styles.activityEffects}>{effectSummary(activity.effects)}</Text>
                  {!eligibility.ok && (
                    <Text style={styles.rejectionText}>
                      {SPENDING_REJECTION_LABEL[eligibility.reason]}
                      {eligibility.reason === 'on_cooldown' && cooldownWeeks > 0 ? ` (${cooldownWeeks} hafta)` : ''}
                    </Text>
                  )}
                  <Button
                    label="YAP"
                    variant="compact"
                    onPress={() => resolveSpendingActivityAction(activity.id)}
                    disabled={!eligibility.ok || isProcessing}
                    testID={`btn-activity-${activity.id}`}
                  />
                </Card>
              );
            })}
          </View>
        ))}
      </Card>

      {/* Sahip Olunanlar / Büyük Harcamalar */}
      <Card>
        <Text style={styles.sectionHeading}>SAHİP OLUNANLAR</Text>
        <OwnershipRow
          currentLabel={HOUSING_TIER_LABEL[gameState.ownership.housing]}
          options={(Object.keys(HOUSING_PURCHASE) as HousingTier[]).filter((t) => t !== gameState.ownership.housing)}
          labelFor={(t) => HOUSING_TIER_LABEL[t]}
          costFor={(t) => HOUSING_PURCHASE[t]}
          onBuy={(t) => purchaseOwnershipAction('housing', t)}
          disabled={isProcessing}
          idPrefix="housing"
        />
        <OwnershipRow
          currentLabel={PHONE_TIER_LABEL[gameState.ownership.phone]}
          options={(Object.keys(PHONE_PURCHASE) as PhoneTier[]).filter((t) => t !== gameState.ownership.phone)}
          labelFor={(t) => PHONE_TIER_LABEL[t]}
          costFor={(t) => PHONE_PURCHASE[t]}
          onBuy={(t) => purchaseOwnershipAction('phone', t)}
          disabled={isProcessing}
          idPrefix="phone"
        />
        <OwnershipRow
          currentLabel={COMPUTER_TIER_LABEL[gameState.ownership.computer]}
          options={(Object.keys(COMPUTER_PURCHASE) as ComputerTier[]).filter((t) => t !== gameState.ownership.computer)}
          labelFor={(t) => COMPUTER_TIER_LABEL[t]}
          costFor={(t) => COMPUTER_PURCHASE[t]}
          onBuy={(t) => purchaseOwnershipAction('computer', t)}
          disabled={isProcessing}
          idPrefix="computer"
        />
      </Card>
    </ScrollView>
  );
}

interface OwnershipRowProps<T extends string> {
  currentLabel: string;
  options: T[];
  labelFor: (t: T) => string;
  costFor: (t: T) => { money: number; freeTimeHours: number };
  onBuy: (t: T) => void;
  disabled: boolean;
  idPrefix: string;
}

function OwnershipRow<T extends string>({ currentLabel, options, labelFor, costFor, onBuy, disabled, idPrefix }: OwnershipRowProps<T>) {
  return (
    <View style={styles.ownershipBlock}>
      <Text style={styles.ownershipCurrent}>{currentLabel}</Text>
      {options.map((t) => {
        const cost = costFor(t);
        return (
          <Card key={t} testID={`${idPrefix}-${t}`}>
            <View style={styles.tierRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tierTitle}>{labelFor(t)}</Text>
                <Text style={styles.tierMeta}>{formatMoney(cost.money)} · {cost.freeTimeHours} saat</Text>
              </View>
              <Button label="AL" variant="compact" onPress={() => onBuy(t)} disabled={disabled} testID={`btn-${idPrefix}-${t}`} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.bgBase },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  sectionHeading: { ...typography.sectionHeading, marginBottom: spacing.sm },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  budgetValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  budgetValueSmall: { fontSize: 15, fontWeight: '700', color: colors.danger },
  budgetLabel: { fontSize: 11, color: colors.textMuted },
  budgetRight: { alignItems: 'flex-end' },
  currentTiersRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  tierMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  activityGroup: { marginTop: spacing.sm, gap: spacing.sm },
  groupLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  activityMeta: { fontSize: 12, color: colors.textSecondary },
  activityEffects: { fontSize: 12, color: colors.accent },
  rejectionText: { fontSize: 11, color: colors.danger },
  ownershipBlock: { gap: spacing.sm, marginTop: spacing.sm },
  ownershipCurrent: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
});
