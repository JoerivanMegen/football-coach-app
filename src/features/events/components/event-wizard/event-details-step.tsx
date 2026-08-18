import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Keyboard, Platform, Pressable, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import { MatchLocations } from '@/features/events/components/event-wizard/event-wizard-types';
import type {
  EventWizardFormState,
  MatchLocation,
} from '@/features/events/components/event-wizard/event-wizard-types';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/i18n-provider';
import type { TranslationKey } from '@/i18n/generated/translations';

type EventDetailsStepProps = {
  form: EventWizardFormState;
  onChangeForm: (nextForm: EventWizardFormState) => void;
};

export function EventDetailsStep({ form, onChangeForm }: EventDetailsStepProps) {
  const { t } = useI18n();

  return (
    <ThemedView style={styles.stepContent}>
      <EventTextInput
        label={t('training.add_training.details.title')}
        required
        value={form.title}
        onChangeText={(title) => onChangeForm({ ...form, title })}
      />

      {Platform.OS === 'web' ? (
        <EventTextInput
          label={t('training.add_training.details.date')}
          placeholder={t('common.fields.date.placeholder')}
          required
          value={form.date}
          onChangeText={(date) => onChangeForm({ ...form, date })}
        />
      ) : (
        <EventDatePickerField
          value={form.date}
          onChange={(date) => onChangeForm({ ...form, date })}
        />
      )}

      {Platform.OS === 'web' ? (
        <EventTextInput
          label={t('training.add_training.details.start_time')}
          placeholder={t('common.fields.time.placeholder')}
          value={form.startTime}
          onChangeText={(startTime) => onChangeForm({ ...form, startTime })}
        />
      ) : (
        <EventTimePickerField
          value={form.startTime}
          onChange={(startTime) => onChangeForm({ ...form, startTime })}
        />
      )}

      {form.type === 'match' ? (
        <MatchLocationField
          value={form.location}
          onChange={(location) => onChangeForm({ ...form, location })}
        />
      ) : (
        <EventTextInput
          label={t('training.add_training.details.location')}
          value={form.location}
          onChangeText={(location) => onChangeForm({ ...form, location })}
        />
      )}
      {form.type === 'match' ? (
        <EventTextInput
          label={t('training.add_training.details.opponent')}
          required
          value={form.opponent}
          onChangeText={(opponent) => onChangeForm({ ...form, opponent })}
        />
      ) : null}
      <EventTextInput
        label={t('training.add_training.details.notes')}
        multiline
        value={form.notes}
        onChangeText={(notes) => onChangeForm({ ...form, notes })}
      />
    </ThemedView>
  );
}

type EventTextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
};

function EventTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  multiline,
}: EventTextInputProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {label}
        {required ? ' *' : ''}
      </ThemedText>
      <TextInput
        autoCapitalize="sentences"
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
          multiline && styles.multilineTextInput,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
          },
        ]}
        value={value}
      />
    </ThemedView>
  );
}

type EventDatePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

function EventDatePickerField({ value, onChange }: EventDatePickerFieldProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDisplayDateToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }

    onChange(formatDateForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{t('training.add_training.details.date')} *</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('training.add_training.details.open_date_picker')}
        onPress={() => {
          Keyboard.dismiss();
          setIsOpen(true);
        }}
        style={({ pressed }) => [
          styles.datePickerButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
          tintColor={theme.text}
          size={18}
        />
        <ThemedText type="smallBold">{value || t('common.fields.date.choose')}</ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            mode="date"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === 'ios' ? <PickerDoneButton onPress={() => setIsOpen(false)} /> : null}
        </>
      ) : null}
    </ThemedView>
  );
}

type EventTimePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

function EventTimePickerField({ value, onChange }: EventTimePickerFieldProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const selectedTime = parseDisplayTimeToDate(value) ?? new Date();

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }

    onChange(formatTimeForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === 'android') {
      setIsOpen(false);
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{t('training.add_training.details.start_time')}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('training.add_training.details.open_time_picker')}
        onPress={() => {
          Keyboard.dismiss();
          setIsOpen(true);
        }}
        style={({ pressed }) => [
          styles.datePickerButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          tintColor={theme.text}
          size={18}
        />
        <ThemedText type="smallBold">{value || t('common.fields.time.choose')}</ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
            mode="time"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedTime}
          />
          {Platform.OS === 'ios' ? <PickerDoneButton onPress={() => setIsOpen(false)} /> : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function PickerDoneButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('training.add_training.details.confirm_picker')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        styles.pickerDoneButton,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={styles.primaryButtonText}>
        {t('common.done')}
      </ThemedText>
    </Pressable>
  );
}

type MatchLocationFieldProps = {
  value: string;
  onChange: (value: MatchLocation) => void;
};

function MatchLocationField({ value, onChange }: MatchLocationFieldProps) {
  const { t } = useI18n();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">{t('training.add_training.details.location')} *</ThemedText>
      <ThemedView style={styles.segmentedControl}>
        {MatchLocations.map((location) => {
          const isSelected = value === location;

          return (
            <Pressable
              key={location}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(location)}
              style={({ pressed }) => [
                styles.segmentedOption,
                isSelected && styles.segmentedOptionSelected,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={isSelected && styles.segmentedOptionTextSelected}>
                {getMatchLocationLabel(location, t)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>
    </ThemedView>
  );
}

function parseDisplayDateToDate(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseDisplayTimeToDate(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalizedValue);

  if (!match) {
    return null;
  }

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date;
}

export function formatDateForDisplay(date: Date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getFullYear()).padStart(4, '0'),
  ].join('-');
}

export function formatTimeForDisplay(date: Date) {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join(':');
}

export function getMatchLocationLabel(
  location: MatchLocation,
  t: (key: TranslationKey) => string,
) {
  switch (location) {
    case 'home':
      return t('training.add_training.details.locations.home');
    case 'away':
      return t('training.add_training.details.locations.away');
  }
}
