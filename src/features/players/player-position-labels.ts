import type { AppLocale } from '@/i18n/locales';
import type { PlayerPosition } from '@/features/players/player-types';

export const PLAYER_POSITION_LABELS: Record<AppLocale, Record<PlayerPosition, string>> = {
  en: {
    goalkeeper: 'Goalkeeper',
    defender: 'Defender',
    midfielder: 'Midfielder',
    forward: 'Forward',
  },
  nl: {
    goalkeeper: 'Keeper',
    defender: 'Verdediger',
    midfielder: 'Middenvelder',
    forward: 'Aanvaller',
  },
};

export function getPlayerPositionLabel(position: PlayerPosition, locale: AppLocale) {
  return PLAYER_POSITION_LABELS[locale][position];
}
