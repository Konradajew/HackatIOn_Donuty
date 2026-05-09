import DmgIcon from '@/assets/icons/dmg.svg';
import HealIcon from '@/assets/icons/heal.svg';
import PoisonIcon from '@/assets/icons/poison.svg';
import HideIcon from '@/assets/icons/hide-ans.svg';
import FiftyIcon from '@/assets/icons/50-50.svg';
import TimeIcon from '@/assets/icons/time.svg';
import { BaseCard } from './base-card';
import type { CardType } from '@/lib/match-api';

export const CARD_META: Record<CardType, { color: string; label: string }> = {
  DMG:         { color: '#FF2A7A', label: 'DAMAGE' },
  HEAL:        { color: '#42EADD', label: 'HEAL'   },
  POISON:      { color: '#C1FF00', label: 'POISON' },
  DMG_BLOCK:   { color: '#FFD400', label: 'HIDE'   },
  HEAL_REMOVE: { color: '#7e44c4', label: '50/50'  },
  TIME_BUFF:   { color: '#ff9d00', label: 'TIME'   },
};

const ICON_MAP: Record<CardType, React.ComponentType<any>> = {
  DMG:         DmgIcon,
  HEAL:        HealIcon,
  POISON:      PoisonIcon,
  DMG_BLOCK:   HideIcon,
  HEAL_REMOVE: FiftyIcon,
  TIME_BUFF:   TimeIcon,
};

interface TypedCardProps {
  type: CardType;
  cat?: string;
  width?: number;
  selected?: boolean;
}

export function TypedCard({ type, cat, width = 84, selected = false }: TypedCardProps) {
  const meta = CARD_META[type];
  const Icon = ICON_MAP[type];
  return (
    <BaseCard
      type={meta.label}
      centerIcon={Icon}
      category={cat}
      mainColor={meta.color}
      width={width}
      selected={selected}
    />
  );
}
