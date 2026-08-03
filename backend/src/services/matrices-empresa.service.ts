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

export async function getPublishedActiveMatrixStatusByCompanyIds(
  db: DbClient,
  empresaIds: number[],
): Promise<Map<number, boolean>> {
  const statusByCompany = new Map<number, boolean>(
    empresaIds.map((empresaId) => [empresaId, false]),
  );

  if (empresaIds.length === 0) return statusByCompany;

  const result: QueryResult<{ empresa_id: number }> = await db.query(
    `SELECT empresa_id
     FROM public.matriz_empresa_version
     WHERE empresa_id = ANY($1::int[])
       AND estado_editorial = 'PUBLICADA'
       AND activa = TRUE`,
    [empresaIds],
  );

  for (const row of result.rows) {
    statusByCompany.set(row.empresa_id, true);
  }

  return statusByCompany;
}
