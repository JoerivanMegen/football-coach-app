export type EventWizardStep = 0 | 1 | 2;

export const EventWizardStepLabels = ['Details', 'Players', 'Review'] as const;

export const EventTypes = ['training', 'match', 'other'] as const;

export type EventType = (typeof EventTypes)[number];

export const MatchLocations = ['home', 'away'] as const;

export type MatchLocation = (typeof MatchLocations)[number];

export const SignupStatuses = ['available', 'unavailable', 'unknown'] as const;

export type SignupStatus = (typeof SignupStatuses)[number];

export type EventWizardFormState = {
  type: EventType | null;
  title: string;
  date: string;
  startTime: string;
  location: string;
  opponent: string;
  notes: string;
  playerStatuses: Record<number, SignupStatus>;
};
