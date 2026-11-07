import { z } from 'zod';

// Categorías de descubrimiento que la app expone al usuario.
export const CATEGORIES = ['history', 'food', 'art', 'nature', 'hidden'] as const;

export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

// Etiquetas visibles en español; el código usa siempre los identificadores en inglés.
export const CATEGORY_LABELS: Record<Category, string> = {
  history: 'Historia',
  food: 'Gastronomía',
  art: 'Arte',
  nature: 'Naturaleza',
  hidden: 'Poco conocidos',
};
