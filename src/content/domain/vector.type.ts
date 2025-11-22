import { ValueTransformer } from 'typeorm';

/**
 * Custom TypeORM type for pgvector columns
 * Converts between JavaScript arrays and PostgreSQL vector type
 */
export const VectorTransformer: ValueTransformer = {
  /**
   * Converts from database value (string) to JavaScript array
   */
  from(value: string | null): number[] | null {
    if (!value) return null;

    // pgvector returns vectors as "[1,2,3,...]"
    if (typeof value === 'string') {
      // Remove brackets and parse as array
      const cleanValue = value.replace(/^\[|\]$/g, '');
      return cleanValue.split(',').map(Number);
    }

    return value as any;
  },

  /**
   * Converts from JavaScript array to database value (string)
   */
  to(value: number[] | null): string | null {
    if (!value) return null;

    // Convert array to pgvector format "[1,2,3,...]"
    return `[${value.join(',')}]`;
  },
};
