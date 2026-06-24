/**
 * seed リポジトリ（型付き seed を読む既定実装）。
 * 公開挙動はこれまでと完全に同一。published フィルタは module scope で一度だけ評価する
 * （seed は不変なのでプロセス内キャッシュは安全）。
 */
import { categories } from "@/app/data/categories";
import { guides, type Guide } from "@/app/data/guides";
import { lifeEvents } from "@/app/data/lifeEvents";
import { municipalities } from "@/app/data/municipalities";
import { prefectures } from "@/app/data/prefectures";
import { programs } from "@/app/data/programs";
import { topics } from "@/app/data/topics";
import type { SupportRepository } from "./repository";
import {
  isPublishable,
  type Category,
  type LifeEvent,
  type Municipality,
  type Prefecture,
  type SupportProgram,
  type SupportTopic,
} from "./types";

const publishedPrograms: SupportProgram[] = programs.filter(isPublishable);

export const seedRepository: SupportRepository = {
  async getPrefectures(): Promise<Prefecture[]> {
    return prefectures;
  },
  async getMunicipalities(): Promise<Municipality[]> {
    return municipalities;
  },
  async getCategories(): Promise<Category[]> {
    return categories;
  },
  async getLifeEvents(): Promise<LifeEvent[]> {
    return lifeEvents;
  },
  async getTopics(): Promise<SupportTopic[]> {
    return topics;
  },
  async getGuides(): Promise<Guide[]> {
    return guides;
  },
  async getPublishedPrograms(): Promise<SupportProgram[]> {
    return publishedPrograms;
  },
};
