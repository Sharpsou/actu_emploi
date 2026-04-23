import type { DailyFeedItem, FeedItemKind, JobSource } from "@/src/domain/types";
import { getDailyFeedFromStore } from "@/src/services/runtime/local-store";

type GetDailyFeedInput = {
  date: string;
  kind?: string;
  source?: string;
};

export function getDailyFeed({ date, kind, source }: GetDailyFeedInput): DailyFeedItem[] {
  return getDailyFeedFromStore(date)
    .filter((item) => item.feedDate === date)
    .filter((item) => !kind || item.kind === (kind as FeedItemKind))
    .filter((item) => !source || item.source === (source as JobSource))
    .sort((left, right) => left.rank - right.rank);
}
