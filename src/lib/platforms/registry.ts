import type { Platform } from "@/types";
import type { PlatformAdapter } from "./types";
import { BCParksAdapter } from "./bc-parks";
import { BuntzenLakeAdapter } from "./buntzen-lake";
import { PocoRecAdapter } from "./poco-rec";
import { CoquitlamRecAdapter } from "./coquitlam-rec";

const adapters: Record<Platform, PlatformAdapter> = {
  bc_parks: new BCParksAdapter(),
  buntzen_lake: new BuntzenLakeAdapter(),
  poco_rec: new PocoRecAdapter(),
  coquitlam_rec: new CoquitlamRecAdapter(),
};

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters[platform];
}

export function getAllAdapters(): PlatformAdapter[] {
  return Object.values(adapters);
}
