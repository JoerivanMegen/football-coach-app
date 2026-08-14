import { Platform } from "react-native";

import { MatchCategoryField, MatchDatePickerField, MatchLocationField, MatchTextInput, MatchTimePickerField } from "@/features/match-day/components/match-setup-fields";
import type { MatchLocation, MatchSetupFormState } from "@/features/match-day/match-day-view-types";
import { useI18n } from "@/i18n/i18n-provider";

export function MatchDetailsStep({ clubLocation, form, maximumDate, onChangeForm }: {
  clubLocation: string;
  form: MatchSetupFormState;
  maximumDate?: Date;
  onChangeForm: (form: MatchSetupFormState) => void;
}) {
  const { t } = useI18n();
  function handleLocationChange(location: MatchLocation) {
    onChangeForm({ ...form, location, venue: location === "home" ? clubLocation : "" });
  }

  return (
    <>
      <MatchTextInput label={t("matchday.add_match.match_details.opponent")} required value={form.opponent} onChangeText={(opponent) => onChangeForm({ ...form, opponent })} />
      {Platform.OS === "web" ? <MatchTextInput label={t("matchday.add_match.match_details.date")} placeholder={t("common.fields.date.placeholder")} required value={form.date} onChangeText={(date) => onChangeForm({ ...form, date })} /> : <MatchDatePickerField maximumDate={maximumDate} value={form.date} onChange={(date) => onChangeForm({ ...form, date })} />}
      {Platform.OS === "web" ? <MatchTextInput label={t("matchday.add_match.match_details.time")} placeholder={t("common.fields.time.placeholder")} required value={form.startTime} onChangeText={(startTime) => onChangeForm({ ...form, startTime })} /> : <MatchTimePickerField value={form.startTime} onChange={(startTime) => onChangeForm({ ...form, startTime })} />}
      <MatchLocationField value={form.location} onChange={handleLocationChange} />
      <MatchCategoryField value={form.category} onChange={(category) => onChangeForm({ ...form, category })} />
      <MatchTextInput label={t("matchday.result.player_performance.notes")} multiline value={form.notes} onChangeText={(notes) => onChangeForm({ ...form, notes })} />
    </>
  );
}
