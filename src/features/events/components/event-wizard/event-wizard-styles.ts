import { StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';

export const eventWizardStyles = StyleSheet.create({
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
  modalTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  stepDot: {
    backgroundColor: '#D0D5DD',
    borderRadius: 999,
    flex: 1,
    height: 4,
  },
  stepDotActive: {
    backgroundColor: '#1C7C54',
  },
  wizardPanel: {
    borderRadius: Spacing.three,
    gap: Spacing.two,
    minHeight: 160,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  wizardScroll: {
    paddingBottom: Spacing.one,
  },
  stepContent: {
    gap: Spacing.three,
  },
  typeGrid: {
    gap: Spacing.two,
  },
  typeOption: {
    borderRadius: Spacing.two,
  },
  typeOptionInner: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
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
  multilineTextInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentedOption: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  segmentedOptionSelected: {
    backgroundColor: '#1C7C54',
  },
  segmentedOptionTextSelected: {
    color: '#ffffff',
  },
  emptyWizardPanel: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  availabilityList: {
    gap: Spacing.two,
  },
  availabilityRow: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.two,
  },
  availabilityPlayerNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  availabilityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  availabilityOption: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  availabilityOptionSelected: {
    backgroundColor: '#1C7C54',
  },
  availabilityOptionSelectedText: {
    color: '#ffffff',
  },
  reviewPanel: {
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  reviewValue: {
    flex: 1,
    textAlign: 'right',
  },
  reviewPlayerList: {
    gap: Spacing.two,
  },
  reviewPlayerRow: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.one,
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
  pressed: {
    opacity: 0.7,
  },
});
