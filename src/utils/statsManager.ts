import * as fs from "fs";
import * as parseCsv from "csv-parse/lib/sync";

export const prefix = "Time,PlayersOnline,ServersOnline\n";

const prefixCrlf = prefix.replace(/(?:\r\n|\r|\n)/g, "\r\n");

export interface StatsElement {
  Time: string;
  PlayersOnline: string;
  ServersOnline: string;
}

export class StatsManager {
  constructor(private csvPath: string) {
    if (!fs.existsSync(csvPath)) throw new Error(`'${csvPath}' does not exist`);
    const initialContent = fs.readFileSync(csvPath, "utf-8");
    if (
      !initialContent.startsWith(prefix) &&
      !initialContent.startsWith(prefixCrlf)
    )
      throw new Error(`'${csvPath}' does not have required prefix`);
    this.stats = parseCsv(initialContent, {
      columns: true,
      skip_empty_lines: true
    });
  }

  add(element: StatsElement): void {
    const csvElement = `${element.Time},${element.PlayersOnline},${element.ServersOnline}\n`;
    fs.appendFileSync(this.csvPath, csvElement);
    this.stats.push(element);
    this.lastAdd = new Date();
  }

  get(): Array<StatsElement> {
    return this.stats;
  }

  getLastAddMoment(): Date | undefined {
    return this.lastAdd;
  }

  private stats: Array<StatsElement>;
  private lastAdd?: Date;
}
