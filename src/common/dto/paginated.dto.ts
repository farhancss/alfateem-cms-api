import { ApiProperty } from '@nestjs/swagger';

/** Meta block for list responses. */
export class PaginationMeta {
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) limit!: number;
  @ApiProperty({ example: 3 }) pageCount!: number;
}

/**
 * The list envelope used everywhere: `{ data: [...], meta: {...} }`.
 * Single-resource endpoints return the resource directly (no envelope).
 */
export class Paginated<T> {
  data!: T[];
  meta!: PaginationMeta;
}

/** Build a consistent envelope from a count + rows. */
export function paginate<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
