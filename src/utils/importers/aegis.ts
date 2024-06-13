import { readTextFile } from "@tauri-apps/api/fs";
import { OtpObject } from "../../pages/Home";
import { randomColor } from "../random";
import { getRandomId } from "../random";
import { Kdbx, KdbxGroup } from "kdbxweb";
import { recordEntity } from "../entryops";
import { savedb } from "../kdbx";

type Info = {
  secret: string;
  algo: string;
  digits: number;
  period: number;
};

type Entry = {
  type: string;
  uuid: string;
  name: string;
  issuer: string;
  notes: string;
  favorite: boolean;
  icon: string;
  icon_mime: string;
  info: Info;
};

type Db = {
  version: number;
  entries: Entry[];
};

type File = {
  version: number;
  header: any;
  db: Db;
};

async function AegisImporter(path: string, db: Kdbx, group: KdbxGroup) {
  const data = await readTextFile(path);
  const parsed: File = JSON.parse(data);
  const newEntries = parsed.db.entries.map<OtpObject>((entry) => {
    return {
      issuer: entry.issuer,
      secret: entry.info.secret,
      type: entry.type,
      algorithm: entry.info.algo,
      digits: entry.info.digits,
      period: entry.info.period,
      counter: 0,
      id: getRandomId(),
      label: entry.name,
      color: randomColor(),
    };
  });

  for (const entity of newEntries) {
    const entry = db.createEntry(group);
    recordEntity(entity, entry);
    const content = await db.save();
    await savedb(content);
  }
  return;
}

export default AegisImporter;
