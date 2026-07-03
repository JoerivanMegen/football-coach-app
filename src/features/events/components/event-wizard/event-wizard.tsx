import { SymbolView } from 'expo-symbols';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  EventDetailsStep,
  formatDateForDisplay,
  getDefaultTitleForEventType,
} from '@/features/events/components/event-wizard/event-details-step';
import { EventPlayersStep } from '@/features/events/components/event-wizard/event-players-step';
import { EventReviewStep } from '@/features/events/components/event-wizard/event-review-step';
import { EventTypeStep } from '@/features/events/components/event-wizard/event-type-step';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import {
  EventWizardStepLabels,
  type EventType,
  type EventWizardFormState,
  type EventWizardStep,
  type MatchLocation,
} from '@/features/events/components/event-wizard/event-wizard-types';
import { listPlayersAsync } from '@/features/players/player-repository';
import type { Player } from '@/features/players/player-types';
import { useTheme } from '@/hooks/use-theme';

type EventWizardProps = {
  visible: boolean;
  initialForm?: EventWizardFormState | null;
  title?: string;
  saveButtonLabel?: string;
  onClose: () => void;
  onSave: (form: EventWizardFormState) => Promise<void>;
};

function createEmptyEventWizardFormState(): EventWizardFormState {
  return {
    type: null,
    title: '',
    date: formatDateForDisplay(new Date()),
    startTime: '',
    location: '',
    opponent: '',
    notes: '',
    playerStatuses: {},
  };
}

export function EventWizard({
  visible,
  initialForm,
  title = 'Add event',
  saveButtonLabel = 'Save event',
  onClose,
  onSave,
}: EventWizardProps) {
  const theme = useTheme();
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState<EventWizardFormState>(
    () => initialForm ?? createEmptyEventWizardFormState()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState<EventWizardStep>(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    listPlayersAsync()
      .then((nextPlayers) => {
        if (isMounted) {
          setPlayers(nextPlayers);
          setForm((current) => ({
            ...current,
            playerStatuses: createPlayerStatusMap(nextPlayers, current.playerStatuses),
          }));
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load players for event wizard', error);
        Alert.alert('Could not load players', 'You can still plan the event details.');
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  function handleClose() {
    if (!isSaving) {
      resetWizard();
      onClose();
    }
  }

  function handleSelectType(type: EventType) {
    const defaultTitles = ['Training', 'Match'];

    setForm((current) => ({
      ...current,
      type,
      title:
        !current.title || defaultTitles.includes(current.title)
          ? getDefaultTitleForEventType(type)
          : current.title,
      location: getLocationForSelectedType(type, current.location),
    }));
  }

  function goToNextStep() {
    if (!validateWizardStep(wizardStep, form)) {
      return;
    }

    setWizardStep((current) => Math.min(current + 1, 3) as EventWizardStep);
  }

  function goToPreviousStep() {
    setWizardStep((current) => Math.max(current - 1, 0) as EventWizardStep);
  }

  async function handleSave() {
    if (!validateWizardStep(1, form)) {
      setWizardStep(1);
      return;
    }

    setIsSaving(true);

    try {
      await onSave(form);
      resetWizard();
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  function resetWizard() {
    setWizardStep(0);
    setForm(initialForm ?? createEmptyEventWizardFormState());
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <ThemedView style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">{title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Step {wizardStep + 1} of {EventWizardStepLabels.length}:{' '}
                {EventWizardStepLabels[wizardStep]}
              </ThemedText>
            </ThemedView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={handleClose}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                tintColor={theme.text}
                size={18}
              />
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.stepIndicator}>
            {EventWizardStepLabels.map((step, index) => (
              <ThemedView
                key={step}
                style={[styles.stepDot, index <= wizardStep && styles.stepDotActive]}
              />
            ))}
          </ThemedView>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.wizardScroll}>
            {renderWizardStep(wizardStep, form, setForm, players, handleSelectType)}
          </ScrollView>

          <ThemedView style={styles.formActions}>
            <Pressable
              accessibilityRole="button"
              disabled={wizardStep === 0}
              onPress={goToPreviousStep}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                wizardStep === 0 && styles.disabledButton,
              ]}>
              <ThemedText type="smallBold">Back</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={wizardStep === 3 ? handleSave : goToNextStep}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isSaving && styles.disabledButton,
              ]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {wizardStep === 3 ? (isSaving ? 'Saving...' : saveButtonLabel) : 'Next'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function renderWizardStep(
  wizardStep: EventWizardStep,
  form: EventWizardFormState,
  setForm: Dispatch<SetStateAction<EventWizardFormState>>,
  players: Player[],
  handleSelectType: (type: EventType) => void
) {
  switch (wizardStep) {
    case 0:
      return <EventTypeStep selectedType={form.type} onSelectType={handleSelectType} />;
    case 1:
      return <EventDetailsStep form={form} onChangeForm={setForm} />;
    case 2:
      return <EventPlayersStep players={players} form={form} onChangeForm={setForm} />;
    case 3:
      return <EventReviewStep players={players} form={form} />;
  }
}

function createPlayerStatusMap(
  players: Player[],
  currentPlayerStatuses: EventWizardFormState['playerStatuses']
) {
  return Object.fromEntries(
    players.map((player) => [player.id, currentPlayerStatuses[player.id] ?? 'unknown'])
  );
}

function validateWizardStep(wizardStep: EventWizardStep, form: EventWizardFormState) {
  if (wizardStep === 0 && !form.type) {
    Alert.alert('Choose an event type', 'Select training, match, or other.');
    return false;
  }

  if (wizardStep === 1) {
    if (!form.title.trim()) {
      Alert.alert('Missing title', 'Add a title for this event.');
      return false;
    }

    if (!isValidDisplayDate(form.date)) {
      Alert.alert('Invalid date', 'Use DD-MM-YYYY, for example 12-07-2026.');
      return false;
    }

    if (form.startTime.trim() && !isValidDisplayTime(form.startTime)) {
      Alert.alert('Invalid start time', 'Use HH:MM, for example 18:30.');
      return false;
    }

    if (form.type === 'match' && !isMatchLocation(form.location)) {
      Alert.alert('Choose match location', 'Select whether the match is home or away.');
      return false;
    }

    if (form.type === 'match' && !form.opponent.trim()) {
      Alert.alert('Missing opponent', 'Add the opponent for this match.');
      return false;
    }
  }

  return true;
}

function getLocationForSelectedType(type: EventType, currentLocation: string) {
  if (type === 'match') {
    return isMatchLocation(currentLocation) ? currentLocation : '';
  }

  return isMatchLocation(currentLocation) ? '' : currentLocation;
}

function isMatchLocation(value: string): value is MatchLocation {
  return value === 'home' || value === 'away';
}

function isValidDisplayDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());

  if (!match) {
    return false;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidDisplayTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
}
