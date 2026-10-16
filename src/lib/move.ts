import { fetchJson, FetchJsonOptions } from './fetch-json';

export const INITIA_REST_URL = 'https://rest.initia.xyz';

/** Calls a Move view function and returns its JSON-decoded result. */
export async function viewFunction<T>(
  restUrl: string,
  moduleAddress: string,
  moduleName: string,
  functionName: string,
  args: string[],
  options: FetchJsonOptions = {}
): Promise<T> {
  const result = await fetchJson<{ data: string }>(
    `${restUrl}/initia/move/v1/accounts/${moduleAddress}/modules/${moduleName}/view_functions/${functionName}`,
    { ...options, method: 'POST', body: JSON.stringify({ type_args: [], args }) }
  );
  return JSON.parse(result.data) as T;
}
