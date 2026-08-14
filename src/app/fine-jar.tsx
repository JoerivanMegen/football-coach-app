import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  ActionColors,
  AppHeaderHeight,
  BottomTabInset,
  CompactScreenTopMargin,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";
import {
  createFineTypeAsync,
  createPlayerFineAsync,
  listFineTypesAsync,
  listPlayerFinesAsync,
  setPlayerFinePaidAsync,
} from "@/features/fine-jar/fine-jar-repository";
import type {
  FineType,
  PlayerFine,
} from "@/features/fine-jar/fine-jar-types";
import { listPlayersAsync } from "@/features/players/player-repository";
import type { Player } from "@/features/players/player-types";
import { getTeamSettingsAsync } from "@/features/settings/team-settings-repository";
import type { FineJarCurrency } from "@/features/settings/team-settings-types";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n/i18n-provider";

export default function FineJarScreen() {
  const theme = useTheme();
  const { locale, t } = useI18n();
  const safeAreaInsets = useSafeAreaInsets();
  const [fineTypes, setFineTypes] = useState<FineType[]>([]);
  const [fines, setFines] = useState<PlayerFine[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currency, setCurrency] = useState<FineJarCurrency>(
    locale === "nl" ? "EUR" : "GBP",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [isFineTypesOpen, setIsFineTypesOpen] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [nextTypes, nextFines, nextPlayers, settings] = await Promise.all([
        listFineTypesAsync(),
        listPlayerFinesAsync(),
        listPlayersAsync(),
        getTeamSettingsAsync(),
      ]);
      setFineTypes(nextTypes);
      setFines(nextFines);
      setPlayers(nextPlayers);
      setCurrency(
        settings?.fineJarCurrency ?? (locale === "nl" ? "EUR" : "GBP"),
      );
    } catch (error) {
      console.warn("Failed to load Fine Jar", error);
      Alert.alert(t("common.errors.generic_title"), t("fine_jar.errors.load"));
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadData();
    }, [loadData]),
  );

  const unpaidFines = useMemo(
    () => fines.filter((fine) => !fine.isPaid),
    [fines],
  );
  const paidFines = useMemo(
    () => fines.filter((fine) => fine.isPaid),
    [fines],
  );
  const unpaidTotalCents = useMemo(
    () => unpaidFines.reduce((sum, fine) => sum + fine.amountCents, 0),
    [unpaidFines],
  );
  const paidTotalCents = useMemo(
    () => paidFines.reduce((sum, fine) => sum + fine.amountCents, 0),
    [paidFines],
  );
  const formatCurrency = useCallback(
    (amountCents: number) =>
      new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-GB", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      }).format(amountCents / 100),
    [currency, locale],
  );

  async function togglePaid(fine: PlayerFine) {
    try {
      await setPlayerFinePaidAsync(fine.id, !fine.isPaid);
      await loadData();
    } catch (error) {
      console.warn("Failed to update fine", error);
      Alert.alert(t("common.errors.generic_title"), t("fine_jar.errors.save"));
    }
  }

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: { paddingTop: PageTopPadding, paddingBottom: Spacing.five },
  });

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentInset={insets}
        contentContainerStyle={[styles.screen, contentPlatformStyle]}
      >
        <ThemedView style={styles.container}>
          <View style={styles.heading}>
            <ThemedText type="subtitle">{t("fine_jar.header.title")}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t("fine_jar.header.subtitle")}
            </ThemedText>
          </View>

          <View style={styles.primaryActions}>
            <PrimaryButton
              label={t("fine_jar.actions.add_fine")}
              onPress={() => setIsFineModalOpen(true)}
              disabled={!players.length || !fineTypes.length}
              icon={{ ios: "plus", android: "add", web: "add" }}
            />
          </View>

          <View style={styles.summaryGrid}>
            <ThemedView
              type="backgroundElement"
              style={[styles.summaryCard, styles.paidSummaryCard]}
            >
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t("fine_jar.overview.paid_value")}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.paidSummaryValue}>
                {formatCurrency(paidTotalCents)}
              </ThemedText>
            </ThemedView>
            <ThemedView
              type="backgroundElement"
              style={[styles.summaryCard, styles.unpaidSummaryCard]}
            >
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t("fine_jar.overview.unpaid_value")}
              </ThemedText>
              <ThemedText type="subtitle" style={styles.unpaidSummaryValue}>
                {formatCurrency(unpaidTotalCents)}
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedView type="backgroundElement" style={styles.panel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(
                isFineTypesOpen
                  ? "fine_jar.fine_types.collapse"
                  : "fine_jar.fine_types.expand",
              )}
              accessibilityState={{ expanded: isFineTypesOpen }}
              onPress={() => setIsFineTypesOpen((current) => !current)}
              style={({ pressed }) => [
                styles.sectionHeader,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="default" style={styles.flexText}>
                {t("fine_jar.fine_types.title")}
              </ThemedText>
              <SymbolView
                name={{
                  ios: isFineTypesOpen ? "chevron.up" : "chevron.down",
                  android: isFineTypesOpen ? "expand_less" : "expand_more",
                  web: isFineTypesOpen ? "expand_less" : "expand_more",
                }}
                size={20}
                tintColor={ActionColors.primary}
              />
            </Pressable>
            {isFineTypesOpen ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("fine_jar.fine_types.description")}
                </ThemedText>
                {fineTypes.length ? (
                  <View style={styles.typeList}>
                    {fineTypes.map((fineType) => (
                      <View key={fineType.id} style={styles.typeRow}>
                        <ThemedText type="smallBold" style={styles.flexText}>
                          {fineType.name}
                        </ThemedText>
                        <ThemedText type="smallBold" style={styles.greenText}>
                          {formatCurrency(fineType.amountCents)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t("fine_jar.fine_types.empty")}
                  </ThemedText>
                )}
                <OutlineButton
                  label={t("fine_jar.actions.add_fine_type")}
                  onPress={() => setIsTypeModalOpen(true)}
                />
              </>
            ) : null}
          </ThemedView>

          <ThemedText type="default">{t("fine_jar.overview.title")}</ThemedText>
          {isLoading ? (
            <ActivityIndicator color={ActionColors.primary} />
          ) : (
            <>
              <FineSection
                initiallyOpen
                title={t("fine_jar.overview.unpaid")}
                emptyText={t("fine_jar.overview.empty_unpaid")}
                fines={unpaidFines}
                totalLabel={t("fine_jar.overview.total", {
                  amount: formatCurrency(
                    unpaidTotalCents,
                  ),
                })}
                actionLabel={t("fine_jar.fine.mark_paid")}
                formatCurrency={formatCurrency}
                onTogglePaid={togglePaid}
              />
              <FineSection
                title={t("fine_jar.overview.paid")}
                emptyText={t("fine_jar.overview.empty_paid")}
                fines={paidFines}
                totalLabel={t("fine_jar.overview.total", {
                  amount: formatCurrency(
                    paidTotalCents,
                  ),
                })}
                actionLabel={t("fine_jar.fine.mark_unpaid")}
                formatCurrency={formatCurrency}
                onTogglePaid={togglePaid}
              />
            </>
          )}
        </ThemedView>
      </ScrollView>

      <FineTypeModal
        visible={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        onSaved={async () => {
          setIsTypeModalOpen(false);
          await loadData();
        }}
      />
      <AddFineModal
        visible={isFineModalOpen}
        players={players}
        fineTypes={fineTypes}
        formatCurrency={formatCurrency}
        onClose={() => setIsFineModalOpen(false)}
        onSaved={async () => {
          setIsFineModalOpen(false);
          await loadData();
        }}
      />
    </>
  );
}

function FineSection({
  title,
  emptyText,
  fines,
  totalLabel,
  actionLabel,
  initiallyOpen = false,
  formatCurrency,
  onTogglePaid,
}: {
  title: string;
  emptyText: string;
  fines: PlayerFine[];
  totalLabel: string;
  actionLabel: string;
  initiallyOpen?: boolean;
  formatCurrency: (amountCents: number) => string;
  onTogglePaid: (fine: PlayerFine) => void;
}) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((current) => !current)}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
      >
        <View style={styles.sectionTitle}>
          <ThemedText type="default">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {totalLabel}
          </ThemedText>
        </View>
        <SymbolView
          name={{
            ios: isOpen ? "chevron.up" : "chevron.down",
            android: isOpen ? "expand_less" : "expand_more",
            web: isOpen ? "expand_less" : "expand_more",
          }}
          size={20}
          tintColor={theme.text}
        />
      </Pressable>
      {isOpen ? (
        fines.length ? (
          <View style={styles.fineList}>
            {fines.map((fine) => (
              <View key={fine.id} style={styles.fineCard}>
                <View style={styles.flexText}>
                  <ThemedText type="smallBold">
                    {fine.playerFirstName} {fine.playerLastName}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {fine.fineName}
                  </ThemedText>
                </View>
                <View style={styles.fineRight}>
                  <ThemedText type="smallBold">
                    {formatCurrency(fine.amountCents)}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onTogglePaid(fine)}
                    style={({ pressed }) => [
                      styles.smallOutlineButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold" style={styles.greenText}>
                      {actionLabel}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {emptyText}
          </ThemedText>
        )
      ) : null}
    </ThemedView>
  );
}

function FineTypeModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const normalizedPrice = price.trim().replace(",", ".");
    const amount = Number(normalizedPrice);
    if (!name.trim()) return setError(t("fine_jar.validation.fine_name"));
    if (!normalizedPrice || !Number.isFinite(amount) || amount < 0) {
      return setError(t("fine_jar.validation.price"));
    }
    setIsSaving(true);
    try {
      await createFineTypeAsync({ name, amountCents: Math.round(amount * 100) });
      setName("");
      setPrice("");
      setError(null);
      await onSaved();
    } catch (saveError) {
      console.warn("Failed to create fine type", saveError);
      setError(
        String(saveError).includes("UNIQUE")
          ? t("fine_jar.validation.duplicate")
          : t("fine_jar.errors.save"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title={t("fine_jar.type_modal.title")} onClose={onClose}>
      <FieldLabel label={t("fine_jar.type_modal.name")} />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("fine_jar.type_modal.name_placeholder")}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      <FieldLabel label={t("fine_jar.type_modal.price")} />
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder={t("fine_jar.type_modal.price_placeholder")}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      {error ? <ThemedText type="small" style={styles.errorText}>{error}</ThemedText> : null}
      <PrimaryButton
        label={isSaving ? t("common.loading") : t("fine_jar.type_modal.submit")}
        disabled={isSaving}
        onPress={() => void save()}
      />
    </FormModal>
  );
}

function AddFineModal({
  visible,
  players,
  fineTypes,
  formatCurrency,
  onClose,
  onSaved,
}: {
  visible: boolean;
  players: Player[];
  fineTypes: FineType[];
  formatCurrency: (amountCents: number) => string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [fineTypeId, setFineTypeId] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (playerId === null) return setError(t("fine_jar.validation.player"));
    if (fineTypeId === null) return setError(t("fine_jar.validation.fine_type"));
    setIsSaving(true);
    try {
      await createPlayerFineAsync({ playerId, fineTypeId, isPaid });
      setPlayerId(null);
      setFineTypeId(null);
      setIsPaid(false);
      setError(null);
      await onSaved();
    } catch (saveError) {
      console.warn("Failed to create fine", saveError);
      setError(t("fine_jar.errors.save"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title={t("fine_jar.add_modal.title")} onClose={onClose}>
      <FieldLabel label={t("fine_jar.add_modal.player")} />
      <View style={styles.choiceGrid}>
        {players.map((player) => (
          <ChoiceButton
            key={player.id}
            label={`${player.firstName} ${player.lastName}`.trim()}
            selected={playerId === player.id}
            onPress={() => setPlayerId(player.id)}
          />
        ))}
      </View>
      <FieldLabel label={t("fine_jar.add_modal.fine_type")} />
      <View style={styles.choiceGrid}>
        {fineTypes.map((fineType) => (
          <ChoiceButton
            key={fineType.id}
            label={`${fineType.name} · ${formatCurrency(fineType.amountCents)}`}
            selected={fineTypeId === fineType.id}
            onPress={() => setFineTypeId(fineType.id)}
          />
        ))}
      </View>
      <FieldLabel label={t("fine_jar.add_modal.payment_status")} />
      <View style={styles.segmentedRow}>
        <ChoiceButton label={t("fine_jar.fine.unpaid")} selected={!isPaid} onPress={() => setIsPaid(false)} />
        <ChoiceButton label={t("fine_jar.fine.paid")} selected={isPaid} onPress={() => setIsPaid(true)} />
      </View>
      {error ? <ThemedText type="small" style={styles.errorText}>{error}</ThemedText> : null}
      <PrimaryButton
        label={isSaving ? t("common.loading") : t("fine_jar.add_modal.submit")}
        disabled={isSaving}
        onPress={() => void save()}
      />
    </FormModal>
  );
}

function FormModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
        <ThemedView type="modalBackground" style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="default">{title}</ThemedText>
            <Pressable accessibilityLabel={t("common.close")} accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <ThemedText type="default">×</ThemedText>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <ThemedText type="smallBold">{label}</ThemedText>;
}

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={selected ? styles.selectedText : styles.greenText}>{label}</ThemedText>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, disabled = false, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: Parameters<typeof SymbolView>[0]["name"] }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && styles.pressed]}>
      {icon ? <SymbolView name={icon} size={18} tintColor={ActionColors.onAccent} /> : null}
      <ThemedText type="smallBold" style={styles.selectedText}>{label}</ThemedText>
    </Pressable>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.greenText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: "center", paddingHorizontal: Spacing.four },
  container: { gap: Spacing.three, marginTop: CompactScreenTopMargin, maxWidth: MaxContentWidth, paddingTop: Platform.select({ web: AppHeaderHeight + PageTopPadding, default: AppHeaderHeight + Spacing.two }) ?? AppHeaderHeight + Spacing.two, width: "100%" },
  heading: { gap: Spacing.one },
  primaryActions: { alignItems: "stretch" },
  summaryGrid: { flexDirection: "row", gap: Spacing.two },
  summaryCard: {
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    flex: 1,
    gap: Spacing.two,
    justifyContent: "space-between",
    minHeight: 108,
    padding: Spacing.three,
  },
  paidSummaryCard: { borderColor: ActionColors.primary },
  unpaidSummaryCard: { borderColor: ActionColors.warning },
  paidSummaryValue: { color: ActionColors.primary },
  unpaidSummaryValue: { color: ActionColors.warning },
  panel: { borderRadius: Spacing.three, gap: Spacing.two, padding: Spacing.three },
  typeList: { gap: Spacing.two },
  typeRow: { alignItems: "center", borderBottomColor: "rgba(128,128,128,0.25)", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.two, minHeight: 38 },
  flexText: { flex: 1 },
  greenText: { color: ActionColors.primary },
  section: { borderRadius: Spacing.three, gap: Spacing.three, padding: Spacing.three },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.three },
  sectionTitle: { flex: 1, gap: Spacing.one },
  fineList: { gap: Spacing.two },
  fineCard: { alignItems: "center", borderTopColor: "rgba(128,128,128,0.25)", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.three, paddingTop: Spacing.three },
  fineRight: { alignItems: "flex-end", gap: Spacing.two },
  smallOutlineButton: { borderColor: ActionColors.primary, borderRadius: Spacing.two, borderWidth: 1, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  primaryButton: { alignItems: "center", backgroundColor: ActionColors.primary, borderRadius: Spacing.two, flexDirection: "row", gap: Spacing.two, justifyContent: "center", minHeight: 48, paddingHorizontal: Spacing.three },
  outlineButton: { alignItems: "center", borderColor: ActionColors.primary, borderRadius: Spacing.two, borderWidth: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: Spacing.three },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  modalOverlay: { backgroundColor: "rgba(0,0,0,0.55)", flex: 1, justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: Spacing.four, borderTopRightRadius: Spacing.four, maxHeight: "88%", paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  closeButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  modalContent: { gap: Spacing.two, paddingBottom: Spacing.three },
  input: { borderColor: ActionColors.primary, borderRadius: Spacing.two, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: Spacing.three },
  choiceGrid: { gap: Spacing.two },
  segmentedRow: { flexDirection: "row", gap: Spacing.two },
  choiceButton: { alignItems: "center", borderColor: ActionColors.primary, borderRadius: Spacing.two, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: Spacing.two },
  choiceButtonSelected: { backgroundColor: ActionColors.primary },
  selectedText: { color: ActionColors.onAccent },
  errorText: { color: ActionColors.danger },
});
