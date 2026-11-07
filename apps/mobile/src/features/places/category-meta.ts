import type Feather from '@expo/vector-icons/Feather';
import { CATEGORY_LABELS, type Category } from '@lens/shared';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Feather>['name'];

export const CATEGORY_ICONS: Record<Category, IconName> = {
  history: 'book-open',
  food: 'coffee',
  art: 'pen-tool',
  nature: 'sun',
  hidden: 'eye',
};

// Orden en el que se muestran los filtros en la interfaz.
export const CATEGORY_ORDER: Category[] = ['history', 'food', 'art', 'nature', 'hidden'];

export const categoryLabel = (category: Category) => CATEGORY_LABELS[category];
