import { StatsElement } from "./statsManager";
import { ServerOnline } from "../v1/legacyController";

const formatDate = (date: Date) => {
  return date
    .toISOString()
    .replace("-", "/")
    .replace("-", "/")
    .replace("T", " ")
    .split(".")[0];
};

export const makeStatsElement = (
  date: Date,
  serverList: Array<ServerOnline>
): StatsElement => {
  let totalOnline = 0;
  serverList.forEach((svr) => (totalOnline += svr.online));
  return {
    Time: formatDate(date),
    ServersOnline: serverList.length.toString(),
    PlayersOnline: totalOnline.toString()
  };
};
