import { Alert, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import type { Dispatch, SetStateAction } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { matchDayStyles as styles } from "@/features/match-day/components/match-day-styles";
import type { MatchSetupFormState } from "@/features/match-day/match-day-view-types";
import type { SignupStatus } from "@/features/events/components/event-wizard/event-wizard-types";
import { getPlayerPositionLabel } from "@/features/players/player-position-labels";
import type { Player, PlayerInjury } from "@/features/players/player-types";
import { useI18n } from "@/i18n/i18n-provider";
import { isPlayerInjuredOnDate } from "@/features/players/player-injury-utils";

export function MatchAvailabilityStep({
  form,
  matchDutyEnabled,
  onChangeForm,
  onOpenGuestPlayerModal,
  injuriesByPlayerId,
  players,
}: {
  form: MatchSetupFormState;
  matchDutyEnabled: boolean;
  onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>;
  onOpenGuestPlayerModal: () => void;
  injuriesByPlayerId: Map<number, PlayerInjury[]>;
  players: Player[];
}) {
  const { locale, t } = useI18n();
  const availablePlayers = players.filter(
    (player) => form.playerStatuses[player.id] === "available",
  );
  const availableSquadPlayers = availablePlayers.filter(
    (player) => !player.isGuest,
  );

  function makePlayerAvailable(player: Player) {
    const update = () =>
      updateMatchPlayerStatus(onChangeForm, player.id, "available");
    if (!isPlayerInjuredOnDate(player, form.date, injuriesByPlayerId)) {
      update();
      return;
    }
    Alert.alert(
      t("matchday.add_match.availability.injury_override.title"),
      t("matchday.add_match.availability.injury_override.message", {
        name: formatPlayerDisplayName(player),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("matchday.add_match.availability.injury_override.action"),
          onPress: update,
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.availabilityStep}>
      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="smallBold">
          {t("matchday.add_match.availability.title")}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("matchday.add_match.availability.description")}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.availabilityList}>
        {players.length > 0 ? (
          players.map((player) => {
            const status = form.playerStatuses[player.id] ?? "available";

            return (
              <ThemedView
                key={player.id}
                type="backgroundElement"
                style={styles.availabilityRow}
              >
                <ThemedView style={styles.availabilityPlayerInfo}>
                  <ThemedView style={styles.availabilityPlayerNameRow}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {formatPlayerDisplayName(player)}
                    </ThemedText>
                    {isPlayerInjuredOnDate(player, form.date, injuriesByPlayerId) ? (
                      <SymbolView
                        accessibilityLabel={t("matchday.add_match.availability.injured")}
                        name={{ ios: "cross.case.fill", android: "healing", web: "healing" }}
                        tintColor="#B42318"
                        size={16}
                      />
                    ) : null}
                  </ThemedView>
                  <ThemedText type="small" themeColor="textSecondary">
                    {player.isGuest
                      ? `${t("matchday.add_match.availability.guest")} · ${getPlayerPositionLabel(player.position, locale)} · #${player.kitNumber}`
                      : formatPlayerMeta(
                          player,
                          locale,
                          t("matchday.add_match.availability.no_kit_number"),
                        )}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.availabilityToggle}>
                  <AvailabilityOption
                    isSelected={status === "available"}
                    label={t("matchday.add_match.availability.available")}
                    onPress={() => makePlayerAvailable(player)}
                  />
                  <AvailabilityOption
                    isSelected={status === "unavailable"}
                    label={t("matchday.add_match.availability.out")}
                    onPress={() =>
                      updateMatchPlayerStatus(
                        onChangeForm,
                        player.id,
                        "unavailable",
                      )
                    }
                  />
                </ThemedView>
              </ThemedView>
            );
          })
        ) : (
          <ThemedView type="backgroundElement" style={styles.availabilityRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {t("matchday.add_match.availability.empty")}
            </ThemedText>
          </ThemedView>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("matchday.add_match.guest_players.title")}
          onPress={onOpenGuestPlayerModal}
          style={({ pressed }) => [
            styles.addGuestPlayerButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{
              ios: "person.badge.plus",
              android: "person_add",
              web: "person_add",
            }}
            tintColor="#ffffff"
            size={18}
          />
          <ThemedText type="smallBold" style={styles.addGuestPlayerButtonText}>
            {t("matchday.add_match.guest_players.title")}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.responsibilityPanel}>
        <ThemedView style={styles.fieldGroup}>
          <ThemedText type="smallBold">
            {t("matchday.add_match.roles.title")}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {matchDutyEnabled
              ? t("matchday.add_match.roles.instructions.captain_and_duty")
              : t("matchday.add_match.roles.instructions.captain")}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.responsibilityGroup}>
          <ThemedText type="smallBold">
            {t("matchday.add_match.roles.captain_required")}
          </ThemedText>
          <ThemedView style={styles.responsibilityOptions}>
            {availableSquadPlayers.length > 0 ? (
              availableSquadPlayers.map((player) => (
                <PlayerRoleOption
                  key={player.id}
                  isSelected={form.captainPlayerId === player.id}
                  label={formatPlayerDisplayName(player)}
                  onPress={() =>
                    updateCaptainPlayer(
                      onChangeForm,
                      form.captainPlayerId === player.id ? null : player.id,
                    )
                  }
                />
              ))
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {t("matchday.add_match.roles.no_available_players")}
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>

        {matchDutyEnabled ? (
          <ThemedView style={styles.responsibilityGroup}>
            <ThemedText type="smallBold">
              {t("matchday.add_match.roles.match_duty")}
            </ThemedText>
            <ThemedView style={styles.responsibilityOptions}>
              {availableSquadPlayers.length > 0 ? (
                availableSquadPlayers.map((player) => {
                  const isSelected = form.matchDutyPlayerIds.includes(player.id);

                  return (
                    <PlayerRoleOption
                      key={player.id}
                      isSelected={isSelected}
                      label={formatPlayerDisplayName(player)}
                      onPress={() =>
                        toggleMatchDutyPlayer(
                          onChangeForm,
                          form.matchDutyPlayerIds,
                          player.id,
                          t,
                        )
                      }
                    />
                  );
                })
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {t("matchday.add_match.roles.no_available_players")}
                </ThemedText>
              )}
            </ThemedView>
          </ThemedView>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}


export function PlayerRoleOption({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.playerRoleOption,
        isSelected && styles.playerRoleOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={isSelected && styles.playerRoleOptionTextSelected}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function AvailabilityOption({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.availabilityOption,
        isSelected && styles.availabilityOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={isSelected && styles.availabilityOptionTextSelected}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function formatPlayerDisplayName(player: Player) { return [player.firstName, player.lastName].filter(Boolean).join(" "); }
function formatPlayerMeta(player: Player, locale: "en" | "nl", noKitNumber: string) { const kitNumber = player.kitNumber ? `#${player.kitNumber}` : noKitNumber; return `${kitNumber} · ${getPlayerPositionLabel(player.position, locale)}`; }
function removePlayerFromAssignments(assignments: MatchSetupFormState["lineupAssignments"], playerId: number) { return Object.fromEntries(Object.entries(assignments).filter(([, assignedPlayerId]) => assignedPlayerId !== playerId)); }
function updateMatchPlayerStatus(onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>, playerId: number, status: SignupStatus) { onChangeForm((currentForm) => ({ ...currentForm, captainPlayerId: status === "available" || currentForm.captainPlayerId !== playerId ? currentForm.captainPlayerId : null, matchDutyPlayerIds: status === "available" ? currentForm.matchDutyPlayerIds : currentForm.matchDutyPlayerIds.filter((id) => id !== playerId), lineupAssignments: status === "available" ? currentForm.lineupAssignments : removePlayerFromAssignments(currentForm.lineupAssignments, playerId), playerStatuses: { ...currentForm.playerStatuses, [playerId]: status } })); }
function updateCaptainPlayer(onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>, playerId: number | null) { onChangeForm((current) => ({ ...current, captainPlayerId: playerId })); }
function toggleMatchDutyPlayer(onChangeForm: Dispatch<SetStateAction<MatchSetupFormState>>, selected: number[], playerId: number, t: ReturnType<typeof useI18n>["t"]) { if (selected.includes(playerId)) { onChangeForm((current) => ({ ...current, matchDutyPlayerIds: current.matchDutyPlayerIds.filter((id) => id !== playerId) })); return; } if (selected.length >= 2) { Alert.alert(t("matchday.add_match.validation.match_duty.title"), t("matchday.add_match.validation.match_duty.message")); return; } onChangeForm((current) => ({ ...current, matchDutyPlayerIds: [...current.matchDutyPlayerIds, playerId] })); }
