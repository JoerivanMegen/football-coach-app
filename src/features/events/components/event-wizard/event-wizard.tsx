import { SymbolView } from 'expo-symbols';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  EventDetailsStep,
  formatDateForDisplay,
} from '@/features/events/components/event-wizard/event-details-step';
import { EventPlayersStep } from '@/features/events/components/event-wizard/event-players-step';
import { EventReviewStep } from '@/features/events/components/event-wizard/event-review-step';
import { eventWizardStyles as styles } from '@/features/events/components/event-wizard/event-wizard-styles';
import {
  EventWizardStepLabels,
  type EventWizardFormState,
  type EventWizardStep,
} from '@/features/events/components/event-wizard/event-wizard-types';
import {
  listAllPlayerInjuriesAsync,
  listPlayersAsync,
} from '@/features/players/player-repository';
import type { Player, PlayerInjury } from '@/features/players/player-types';
import { isPlayerInjuredOnDate } from '@/features/players/player-injury-utils';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n/i18n-provider';

type EventWizardProps = {
  visible: boolean;
  initialForm?: EventWizardFormState | null;
  isEditing?: boolean;
  title?: string;
  saveButtonLabel?: string;
  onClose: () => void;
  onSave: (form: EventWizardFormState) => Promise<void>;
};

function createEmptyEventWizardFormState(defaultTitle: string): EventWizardFormState {
  return {
    type: 'training',
    title: defaultTitle,
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
  isEditing = false,
  title,
  saveButtonLabel,
  onClose,
  onSave,
}: EventWizardProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const stepLabels = [
    t('training.add_training.steps.details'),
    t('training.add_training.steps.players'),
    t('training.add_training.steps.review'),
  ];
  const displayedTitle = title ?? t('training.add_training.title');
  const displayedSaveButtonLabel = saveButtonLabel ?? t('training.actions.save');
  const [players, setPlayers] = useState<Player[]>([]);
  const [injuriesByPlayerId, setInjuriesByPlayerId] = useState(
    new Map<number, PlayerInjury[]>(),
  );
  const [form, setForm] = useState<EventWizardFormState>(
    () => initialForm ?? createEmptyEventWizardFormState(t('training.add_training.details.title_placeholder'))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState<EventWizardStep>(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    Promise.all([listPlayersAsync(), listAllPlayerInjuriesAsync()])
      .then(([nextPlayers, injuries]) => {
        if (isMounted) {
          const nextInjuriesByPlayerId = groupInjuriesByPlayerId(injuries);
          setPlayers(nextPlayers);
          setInjuriesByPlayerId(nextInjuriesByPlayerId);
          setForm((current) => ({
            ...current,
            playerStatuses: createPlayerStatusMap(
              nextPlayers,
              current.playerStatuses,
              current.date,
              nextInjuriesByPlayerId,
              !isEditing,
            ),
          }));
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load players for event wizard', error);
        Alert.alert(t('training.errors.load_players.title'), t('training.errors.load_players.message'));
      });

    return () => {
      isMounted = false;
    };
  }, [initialForm, isEditing, t, visible]);

  function handleClose() {
    if (!isSaving) {
      resetWizard();
      onClose();
    }
  }

  function goToNextStep() {
    if (!validateWizardStep(wizardStep, form, t)) {
      return;
    }

    if (wizardStep === 0 && !isEditing) {
      setForm((current) => ({
        ...current,
        playerStatuses: createPlayerStatusMap(
          players,
          {},
          current.date,
          injuriesByPlayerId,
          true,
        ),
      }));
    }

    setWizardStep((current) => Math.min(current + 1, 2) as EventWizardStep);
  }

  function goToPreviousStep() {
    setWizardStep((current) => Math.max(current - 1, 0) as EventWizardStep);
  }

  async function handleSave() {
    if (!validateWizardStep(0, form, t)) {
      setWizardStep(0);
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
    setForm(
      initialForm ??
        createEmptyEventWizardFormState(t('training.add_training.details.title_placeholder')),
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={handleClose} />
        <ThemedView type="modalBackground" style={styles.modalSheet}>
          <ThemedView style={styles.modalHeader}>
            <ThemedView style={styles.modalTitleGroup}>
              <ThemedText type="default">{displayedTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('training.add_training.progress', {
                  current: wizardStep + 1,
                  total: EventWizardStepLabels.length,
                  step: stepLabels[wizardStep],
                })}
              </ThemedText>
            </ThemedView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
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
            {stepLabels.map((step, index) => (
              <ThemedView
                key={step}
                style={[styles.stepDot, index <= wizardStep && styles.stepDotActive]}
              />
            ))}
          </ThemedView>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.wizardScroll}>
            {renderWizardStep(
              wizardStep,
              form,
              setForm,
              injuriesByPlayerId,
              players,
            )}
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
              <ThemedText type="smallBold">{t('common.back')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={wizardStep === 2 ? handleSave : goToNextStep}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isSaving && styles.disabledButton,
              ]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {wizardStep === 2
                  ? (isSaving ? t('training.actions.saving') : displayedSaveButtonLabel)
                  : t('common.next')}
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
  injuriesByPlayerId: Map<number, PlayerInjury[]>,
  players: Player[]
) {
  switch (wizardStep) {
    case 0:
      return <EventDetailsStep form={form} onChangeForm={setForm} />;
    case 1:
      return (
        <EventPlayersStep
          players={players}
          form={form}
          injuriesByPlayerId={injuriesByPlayerId}
          onChangeForm={setForm}
        />
      );
    case 2:
      return <EventReviewStep players={players} form={form} />;
  }
}

function createPlayerStatusMap(
  players: Player[],
  currentPlayerStatuses: EventWizardFormState['playerStatuses'],
  eventDate: string,
  injuriesByPlayerId: Map<number, PlayerInjury[]>,
  defaultInjuredPlayersOut: boolean,
) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      currentPlayerStatuses[player.id] ??
        (defaultInjuredPlayersOut &&
        isPlayerInjuredOnDate(player, eventDate, injuriesByPlayerId)
          ? 'unavailable'
          : 'available'),
    ])
  );
}

function groupInjuriesByPlayerId(injuries: PlayerInjury[]) {
  const grouped = new Map<number, PlayerInjury[]>();
  for (const injury of injuries) {
    grouped.set(injury.playerId, [
      ...(grouped.get(injury.playerId) ?? []),
      injury,
    ]);
  }
  return grouped;
}

function validateWizardStep(
  wizardStep: EventWizardStep,
  form: EventWizardFormState,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (wizardStep === 0) {
    if (!form.title.trim()) {
      Alert.alert(
        t('training.add_training.validation.missing_title.title'),
        t('training.add_training.validation.missing_title.message'),
      );
      return false;
    }

    if (!isValidDisplayDate(form.date)) {
      Alert.alert(
        t('training.add_training.validation.invalid_date.title'),
        t('training.add_training.validation.invalid_date.message'),
      );
      return false;
    }

    if (form.startTime.trim() && !isValidDisplayTime(form.startTime)) {
      Alert.alert(
        t('training.add_training.validation.invalid_start_time.title'),
        t('training.add_training.validation.invalid_start_time.message'),
      );
      return false;
    }

  }

  return true;
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
