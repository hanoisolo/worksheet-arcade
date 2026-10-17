import type { Result, WorksheetFile } from '../types/game';

export type Context = { text?: string; file?: WorksheetFile };

export interface ProviderService {
  extract(file: WorksheetFile, key: string, signal?: AbortSignal): Promise<Result<Context>>;
  structure(
    ctx: Context,
    key: string,
    signal?: AbortSignal,
    feedback?: string,
  ): Promise<Result<string>>;
}
