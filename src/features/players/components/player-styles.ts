import { StyleSheet } from "react-native";

import {
  ActionColors,
  AppHeaderHeight,
  CompactScreenTopMargin,
  MaxContentWidth,
  PageTopPadding,
  Spacing,
} from "@/constants/theme";

export const playerStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    marginTop: CompactScreenTopMargin,
    paddingHorizontal: Spacing.four,
    paddingTop: AppHeaderHeight + PageTopPadding,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  titleGroup: {
    flex: 1,
    gap: Spacing.two,
  },
  title: {
    lineHeight: 38,
  },
  description: {
    maxWidth: 560,
  },
  headerActions: {
    alignItems: "stretch",
    gap: Spacing.two,
    width: 150,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.three,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  teamStatsButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: ActionColors.info,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  actionButtonText: {
    color: ActionColors.onAccent,
  },
  teamStatsButtonText: {
    color: ActionColors.info,
    flexShrink: 1,
    textAlign: "left",
  },
  pressed: {
    opacity: 0.7,
  },
  emptyPanel: {
    alignItems: "center",
    borderRadius: Spacing.three,
    gap: Spacing.two,
    minHeight: 180,
    justifyContent: "center",
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: "center",
  },
  playerList: {
    gap: Spacing.three,
  },
  positionSection: {
    gap: Spacing.two,
  },
  positionSectionHeader: {
    alignItems: "center",
    borderRadius: Spacing.three,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  positionSectionTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  positionSectionPlayers: {
    gap: Spacing.two,
  },
  noPositionPlayers: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  playerCard: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  playerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 52,
  },
  playerToggle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
  },
  playerNameGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  playerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    justifyContent: "flex-end",
  },
  rowActionButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 40,
    minHeight: 40,
    justifyContent: "center",
    width: 40,
  },
  editButton: {
    backgroundColor: "transparent",
    borderColor: ActionColors.warning,
    borderWidth: 1.5,
  },
  statsButton: {
    backgroundColor: "transparent",
    borderColor: ActionColors.info,
    borderWidth: 1.5,
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderColor: ActionColors.danger,
    borderWidth: 1.5,
  },
  playerStatsPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  statsSections: {
    gap: Spacing.three,
  },
  statList: {
    gap: Spacing.two,
  },
  statRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
    minHeight: 48,
  },
  statRowText: {
    flex: 1,
    gap: Spacing.half,
  },
  statRowValue: {
    textAlign: "right",
  },
  recentRatingsGroup: {
    gap: Spacing.two,
  },
  recentRatingList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  recentRatingPill: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  recentRatingGood: {
    backgroundColor: "#1C7C54",
  },
  recentRatingOk: {
    backgroundColor: ActionColors.warning,
  },
  recentRatingPoor: {
    backgroundColor: ActionColors.danger,
  },
  recentRatingText: {
    textAlign: "center",
  },
  recentRatingTextLight: {
    color: "#ffffff",
  },
  recentRatingTextDark: {
    color: ActionColors.warningText,
  },
  statsModalTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  statsModalPlayerName: {
    fontSize: 24,
    lineHeight: 30,
  },
  statsModalContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  teamStatsModalScreen: {
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  teamStatsModalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
  },
  teamStatsModalTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  teamStatsModalTitle: {
    lineHeight: 38,
  },
  teamStatsTableScrollContent: {
    paddingBottom: Spacing.three,
  },
  teamStatsFrozenHeaderLayout: {
    flexDirection: "row",
    height: 48,
    zIndex: 3,
  },
  teamStatsFrozenHeaderCell: {
    borderRightColor: ActionColors.primary,
    borderRightWidth: 1,
    borderTopLeftRadius: Spacing.three,
    overflow: "hidden",
    width: 170,
    zIndex: 4,
  },
  teamStatsHeaderScrollableColumns: {
    borderTopRightRadius: Spacing.three,
    flex: 1,
    overflow: "hidden",
  },
  teamStatsFrozenLayout: {
    minHeight: "100%",
    paddingBottom: Spacing.three,
    position: "relative",
  },
  teamStatsFrozenColumn: {
    borderBottomLeftRadius: Spacing.three,
    borderRightColor: ActionColors.primary,
    borderRightWidth: 1,
    borderTopLeftRadius: Spacing.three,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    width: 170,
    zIndex: 2,
  },
  teamStatsScrollableColumns: {
    marginLeft: 170,
  },
  teamStatsTable: {
    borderBottomRightRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    minWidth: 1078,
    overflow: "hidden",
  },
  teamStatsTableHeaderRow: {
    flexDirection: "row",
    height: 48,
  },
  teamStatsTableRow: {
    borderTopColor: "rgba(128, 128, 128, 0.18)",
    borderTopWidth: 1,
    flexDirection: "row",
    height: 84,
  },
  teamStatsTableCell: {
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    width: 92,
  },
  teamStatsPlayerCell: {
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three,
    width: 170,
  },
  teamStatsPlayerDataCell: {
    paddingBottom: Spacing.three,
    paddingTop: Spacing.three,
  },
  teamStatsRecentCell: {
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    width: 210,
  },
  teamStatsHeaderText: {
    color: ActionColors.onAccent,
    textTransform: "uppercase",
  },
  teamStatsSortableHeader: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "center",
  },
  teamStatsSortIndicator: {
    color: "#1C7C54",
  },
  teamStatsValueText: {
    textAlign: "center",
  },
  teamStatsRecentRatings: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  teamStatsRecentRatingPill: {
    alignItems: "center",
    borderRadius: Spacing.two,
    height: 28,
    justifyContent: "center",
    width: 32,
  },
  teamStatsRecentRatingText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  modalSheet: {
    alignSelf: "center",
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: "92%",
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  formContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  textInput: {
    borderRadius: Spacing.two,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  datePickerButton: {
    alignItems: "center",
    borderRadius: Spacing.two,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    marginTop: Spacing.one,
  },
  positionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  positionOption: {
    minWidth: 136,
  },
  positionOptionInner: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#1C7C54",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  positionOptionInnerSelected: {
    backgroundColor: "#1C7C54",
  },
  positionOptionText: {
    color: "#1C7C54",
  },
  positionOptionTextSelected: {
    color: "#ffffff",
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "#7A7A7A",
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1C7C54",
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.5,
  },
  injurySection: {
    borderTopColor: ActionColors.warning,
    borderTopWidth: 1,
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
  },
  injuryToggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  injuryHistory: { gap: Spacing.two },
  injuryHistoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  injuryCard: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  injuryCardTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  injuryCardText: { flex: 1, gap: Spacing.one },
  injuryActiveBadge: { color: ActionColors.danger },
  injuryCardActions: { flexDirection: "row", gap: Spacing.two },
  injurySecondaryAction: {
    alignItems: "center",
    borderColor: ActionColors.primary,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  injuryPrimaryAction: {
    alignItems: "center",
    backgroundColor: ActionColors.primary,
    borderRadius: Spacing.two,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  injuryEditAction: {
    alignItems: "center",
    borderColor: ActionColors.warning,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  injuryEditText: { color: ActionColors.warning, textAlign: "center" },
  injuryDeleteAction: {
    alignItems: "center",
    borderColor: ActionColors.danger,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  injuryDeleteText: { color: ActionColors.danger, textAlign: "center" },
});
