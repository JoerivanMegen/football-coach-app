import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getPlayerPositionLabel } from '@/features/players/player-position-labels';
import {
  archivePlayerAsync,
  createPlayerAsync,
  listPlayersAsync,
  updatePlayerAsync,
} from '@/features/players/player-repository';
import {
  PLAYER_POSITIONS,
  type CreatePlayerInput,
  type Player,
  type PlayerPosition,
} from '@/features/players/player-types';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { useTheme } from '@/hooks/use-theme';

type PlayerFormState = {
  firstName: string;
  lastName: string;
  nickName: string;
  birthDate: string;
  position: PlayerPosition | null;
  kitNumber: string;
};

const emptyFormState: PlayerFormState = {
  firstName: '',
  lastName: '',
  nickName: '',
  birthDate: '',
  position: null,
  kitNumber: '',
};

const WarningColor = '#F59E0B';
const WarningTextColor = '#111827';
const ErrorColor = '#B42318';
const ActionTextColor = '#ffffff';

export default function PlayersScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBirthDatePickerOpen, setIsBirthDatePickerOpen] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [form, setForm] = useState<PlayerFormState>(emptyFormState);

  const insets = useMemo(
    () => ({
      ...safeAreaInsets,
      bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    }),
    [safeAreaInsets]
  );

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.five,
      paddingBottom: Spacing.five,
    },
  });

  const loadPlayers = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);

    try {
      const nextPlayers = await listPlayersAsync();
      setPlayers(nextPlayers);
    } catch (error) {
      console.warn('Failed to load players', error);
      Alert.alert('Could not load players', 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    listPlayersAsync()
      .then((nextPlayers) => {
        if (isMounted) {
          setPlayers(nextPlayers);
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load players', error);
        Alert.alert('Could not load players', 'Please try again.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function openAddPlayerForm() {
    setEditingPlayerId(null);
    setForm(emptyFormState);
    setIsBirthDatePickerOpen(false);
    setIsFormOpen(true);
  }

  function openEditPlayerForm(player: Player) {
    setEditingPlayerId(player.id);
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      nickName: player.nickName ?? '',
      birthDate: formatIsoDateForDisplay(player.birthDate),
      position: player.position,
      kitNumber: player.kitNumber === null ? '' : String(player.kitNumber),
    });
    setIsBirthDatePickerOpen(false);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (!isSaving) {
      setIsBirthDatePickerOpen(false);
      setEditingPlayerId(null);
      setIsFormOpen(false);
    }
  }

  async function handleSavePlayer() {
    const firstName = normalizeNameInput(form.firstName);
    const lastName = normalizeNameInput(form.lastName);
    const nickName = normalizeNameInput(form.nickName);
    const kitNumber = form.kitNumber.trim() ? Number(form.kitNumber.trim()) : null;
    const birthDate = parseDisplayDateToIsoDate(form.birthDate);

    if (!firstName || !lastName) {
      Alert.alert('Missing required fields', 'First name and last name are required.');
      return;
    }

    if (!isValidNameInput(firstName)) {
      Alert.alert('Invalid first name', 'Use letters only, with single spaces between names.');
      return;
    }

    if (!isValidNameInput(lastName)) {
      Alert.alert('Invalid last name', 'Use letters only, with single spaces between names.');
      return;
    }

    if (nickName && !isValidNameInput(nickName)) {
      Alert.alert('Invalid nickname', 'Use letters only, with single spaces between names.');
      return;
    }

    if (form.birthDate.trim() && !birthDate) {
      Alert.alert('Invalid birth date', 'Use DD-MM-YYYY, for example 24-09-2012.');
      return;
    }

    if (!form.position) {
      Alert.alert('Missing required fields', 'Choose a player position.');
      return;
    }

    if (kitNumber !== null && (!Number.isInteger(kitNumber) || kitNumber < 0)) {
      Alert.alert('Invalid kit number', 'Use a whole number, or leave it empty.');
      return;
    }

    const playerInput: CreatePlayerInput = {
      firstName,
      lastName,
      nickName,
      birthDate,
      position: form.position,
      kitNumber,
    };

    if (findDuplicatePlayer(firstName, lastName, players, editingPlayerId)) {
      confirmDuplicatePlayer(`${firstName} ${lastName}`, () => {
        void savePlayer(playerInput);
      });
      return;
    }

    await savePlayer(playerInput);
  }

  async function savePlayer(playerInput: CreatePlayerInput) {
    setIsSaving(true);

    try {
      if (editingPlayerId === null) {
        await createPlayerAsync(playerInput);
      } else {
        await updatePlayerAsync(editingPlayerId, playerInput);
      }
      setIsFormOpen(false);
      setForm(emptyFormState);
      setEditingPlayerId(null);
      await loadPlayers();
    } catch (error) {
      console.warn('Failed to save player', error);
      Alert.alert('Could not save player', 'Please check the details and try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleArchivePlayer(player: Player) {
    const playerName = `${player.firstName} ${player.lastName}`;
    const message = `Delete ${playerName}? This will remove the player from the active squad list.`;

    if (Platform.OS === 'web') {
      if (globalThis.confirm(message)) {
        void archivePlayer(player);
      }
      return;
    }

    Alert.alert('Delete player', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void archivePlayer(player);
        },
      },
    ]);
  }

  async function archivePlayer(player: Player) {
    try {
      await archivePlayerAsync(player.id);
      await loadPlayers();
    } catch (error) {
      console.warn('Failed to delete player', error);
      Alert.alert('Could not delete player', 'Please try again.');
    }
  }

  return (
    <>
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentInset={insets}
        contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleGroup}>
              <ThemedText type="subtitle" style={styles.title}>
                Players
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.description}>
                Manage your squad list and start collecting player stats.
              </ThemedText>
            </ThemedView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add player"
              onPress={openAddPlayerForm}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                tintColor="#ffffff"
                size={18}
              />
              <ThemedText type="smallBold" style={styles.addButtonText}>
                Add player
              </ThemedText>
            </Pressable>
          </ThemedView>

          {isLoading ? (
            <ThemedView type="backgroundElement" style={styles.emptyPanel}>
              <ActivityIndicator color={theme.text} />
            </ThemedView>
          ) : players.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyPanel}>
              <ThemedText type="smallBold">No players yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Add your first player to start building the squad.
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.playerList}>
              {players.map((player) => (
                <ThemedView key={player.id} type="backgroundElement" style={styles.playerRow}>
                  <ThemedView type="backgroundElement" style={styles.playerNameGroup}>
                    <ThemedText type="default">
                      {player.firstName} {player.lastName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {getPlayerPositionLabel(player.position, DEFAULT_LOCALE)}
                      {player.kitNumber !== null ? ` · #${player.kitNumber}` : ''}
                    </ThemedText>
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={styles.playerActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${player.firstName} ${player.lastName}`}
                      onPress={() => openEditPlayerForm(player)}
                      style={({ pressed }) => [
                        styles.rowActionButton,
                        styles.editButton,
                        pressed && styles.pressed,
                      ]}>
                      <SymbolView
                        name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                        tintColor={WarningTextColor}
                        size={16}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${player.firstName} ${player.lastName}`}
                      onPress={() => handleArchivePlayer(player)}
                      style={({ pressed }) => [
                        styles.rowActionButton,
                        styles.deleteButton,
                        pressed && styles.pressed,
                      ]}>
                      <SymbolView
                        name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                        tintColor={ActionTextColor}
                        size={16}
                      />
                    </Pressable>
                  </ThemedView>
                </ThemedView>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>

      <Modal visible={isFormOpen} animationType="slide" transparent onRequestClose={closeForm}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeForm} />
          <ThemedView style={styles.modalSheet}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="default">
                {editingPlayerId === null ? 'Add player' : 'Edit player'}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeForm}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  tintColor={theme.text}
                  size={18}
                />
              </Pressable>
            </ThemedView>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              <PlayerTextInput
                label="First name"
                required
                value={form.firstName}
                onChangeText={(firstName) => setForm((current) => ({ ...current, firstName }))}
              />
              <PlayerTextInput
                label="Last name"
                required
                value={form.lastName}
                onChangeText={(lastName) => setForm((current) => ({ ...current, lastName }))}
              />
              <PlayerTextInput
                label="Nickname"
                value={form.nickName}
                onChangeText={(nickName) => setForm((current) => ({ ...current, nickName }))}
              />
              {Platform.OS === 'web' ? (
                <PlayerTextInput
                  label="Birth date"
                  placeholder="DD-MM-YYYY"
                  value={form.birthDate}
                  onChangeText={(birthDate) => setForm((current) => ({ ...current, birthDate }))}
                />
              ) : (
                <BirthDatePickerField
                  isOpen={isBirthDatePickerOpen}
                  value={form.birthDate}
                  onOpen={() => setIsBirthDatePickerOpen(true)}
                  onChange={(birthDate) => setForm((current) => ({ ...current, birthDate }))}
                  onClose={() => setIsBirthDatePickerOpen(false)}
                />
              )}
              <PlayerTextInput
                label="Kit number"
                keyboardType="number-pad"
                value={form.kitNumber}
                onChangeText={(kitNumber) => setForm((current) => ({ ...current, kitNumber }))}
              />

              <ThemedView style={styles.fieldGroup}>
                <ThemedText type="smallBold">Position *</ThemedText>
                <ThemedView style={styles.positionGrid}>
                  {PLAYER_POSITIONS.map((position) => {
                    const isSelected = form.position === position;

                    return (
                      <Pressable
                        key={position}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setForm((current) => ({ ...current, position }))}
                        style={({ pressed }) => [styles.positionOption, pressed && styles.pressed]}>
                        <ThemedView
                          type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
                          style={styles.positionOptionInner}>
                          <ThemedText type="smallBold">
                            {getPlayerPositionLabel(position, DEFAULT_LOCALE)}
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    );
                  })}
                </ThemedView>
              </ThemedView>
            </ScrollView>

            <ThemedView style={styles.formActions}>
              <Pressable
                accessibilityRole="button"
                onPress={closeForm}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={handleSavePlayer}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  isSaving && styles.disabledButton,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {isSaving
                    ? 'Saving...'
                    : editingPlayerId === null
                      ? 'Save player'
                      : 'Update player'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

type PlayerTextInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: 'default' | 'number-pad';
};

function PlayerTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  keyboardType = 'default',
}: PlayerTextInputProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fieldGroup}>
      <ThemedText type="smallBold">
        {label}
        {required ? ' *' : ''}
      </ThemedText>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
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

type BirthDatePickerFieldProps = {
  isOpen: boolean;
  value: string;
  onOpen: () => void;
  onChange: (value: string) => void;
  onClose: () => void;
};

function BirthDatePickerField({
  isOpen,
  value,
  onOpen,
  onChange,
  onClose,
}: BirthDatePickerFieldProps) {
  const theme = useTheme();
  const selectedDate = parseDisplayDateToDate(value) ?? new Date(2012, 0, 1);

  function handleValueChange(_: unknown, date: Date) {
    if (Platform.OS === 'android') {
      onClose();
    }

    onChange(formatDateForDisplay(date));
  }

  function handleDismiss() {
    if (Platform.OS === 'android') {
      onClose();
    }
  }

  return (
    <ThemedView style={styles.fieldGroup}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open birth date picker"
        onPress={onOpen}
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
        <ThemedText type="smallBold">{value || 'Choose birth date'}</ThemedText>
      </Pressable>

      {isOpen ? (
        <>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
            maximumDate={new Date()}
            mode="date"
            onDismiss={handleDismiss}
            onValueChange={handleValueChange}
            value={selectedDate}
          />
          {Platform.OS === 'ios' ? <PickerDoneButton onPress={onClose} /> : null}
        </>
      ) : null}
    </ThemedView>
  );
}

function PickerDoneButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Confirm birth date"
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        styles.pickerDoneButton,
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={styles.primaryButtonText}>
        Done
      </ThemedText>
    </Pressable>
  );
}

function parseDisplayDateToIsoDate(value: string) {
  const date = parseDisplayDateToDate(value);

  if (!date) {
    return null;
  }

  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
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
    date.getDate() !== day ||
    date > new Date()
  ) {
    return null;
  }

  return date;
}

function formatDateForDisplay(date: Date) {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getFullYear()).padStart(4, '0'),
  ].join('-');
}

function formatIsoDateForDisplay(value: string | null) {
  if (!value) {
    return '';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return '';
  }

  return [match[3], match[2], match[1]].join('-');
}

function normalizeNameInput(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isValidNameInput(value: string) {
  return /^\p{L}+(?: \p{L}+)*$/u.test(value);
}

function findDuplicatePlayer(
  firstName: string,
  lastName: string,
  players: Player[],
  ignoredPlayerId: number | null
) {
  const normalizedFirstName = normalizePlayerNameForDuplicateCheck(firstName);
  const normalizedLastName = normalizePlayerNameForDuplicateCheck(lastName);

  return players.find(
    (player) =>
      player.id !== ignoredPlayerId &&
      normalizePlayerNameForDuplicateCheck(player.firstName) === normalizedFirstName &&
      normalizePlayerNameForDuplicateCheck(player.lastName) === normalizedLastName
  );
}

function normalizePlayerNameForDuplicateCheck(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function confirmDuplicatePlayer(playerName: string, onConfirm: () => void) {
  const message = `"${playerName}" already exists. Are you sure you want to add another one?`;

  if (Platform.OS === 'web') {
    if (globalThis.confirm(message)) {
      onConfirm();
    }
    return;
  }

  Alert.alert('Possible duplicate player', message, [
    {
      text: 'Cancel',
      style: 'cancel',
    },
    {
      text: 'Add anyway',
      style: 'default',
      onPress: onConfirm,
    },
  ]);
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    flexGrow: 1,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
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
  addButton: {
    alignItems: 'center',
    backgroundColor: '#1C7C54',
    borderRadius: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  addButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  emptyPanel: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    gap: Spacing.two,
    minHeight: 180,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  playerList: {
    gap: Spacing.two,
  },
  playerRow: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 76,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  playerNameGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  playerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    justifyContent: 'flex-end',
  },
  rowActionButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 40,
    minHeight: 40,
    justifyContent: 'center',
    width: 40,
  },
  editButton: {
    backgroundColor: WarningColor,
  },
  deleteButton: {
    backgroundColor: ErrorColor,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalSheet: {
    alignSelf: 'center',
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.three,
    maxHeight: '92%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
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
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.one,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  positionOption: {
    minWidth: 136,
  },
  positionOptionInner: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1C7C54',
    borderRadius: Spacing.two,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
