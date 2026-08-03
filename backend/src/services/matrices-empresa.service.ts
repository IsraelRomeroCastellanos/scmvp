import type { Pool, PoolClient, QueryResult } from 'pg';

type DbClient = Pool | PoolClient;

export async function hasPublishedActiveCompanyMatrix(
  db: DbClient,
  empresaId: number,
): Promise<boolean> {
  const result: QueryResult<{ has_published_active_matrix: boolean }> = await db.query(
    `SELECT EXISTS (
       SELECT 1
       FROM public.matriz_empresa_version
       WHERE empresa_id = $1
         AND estado_editorial = 'PUBLICADA'
         AND activa = TRUE
     ) AS has_published_active_matrix`,
    [empresaId],
  );

  return result.rows[0].has_published_active_matrix;
}
