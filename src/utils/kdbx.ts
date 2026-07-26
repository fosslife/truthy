import * as kdbxweb from "kdbxweb";
import { _arrayBufferToBase64, _base64ToArrayBuffer } from "./byte-utils";
import { BaseDirectory, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

export declare const Argon2TypeArgon2d = 0;
export declare const Argon2TypeArgon2id = 2;

export declare type Argon2Type =
  | typeof Argon2TypeArgon2d
  | typeof Argon2TypeArgon2id;
export declare type Argon2Version = 0x10 | 0x13;

kdbxweb.CryptoEngine.setArgon2Impl(
  async (
    password,
    salt,
    memory,
    iterations,
    length,
    parallelism
    // type,
    // version
  ) => {
    // const s = salt.toString("hex");
    const hash = await invoke<Uint8Array>("gethash", {
      password: [...new Uint8Array(password)],
      salt: [...new Uint8Array(salt)],
      memory,
      iterations,
      length,
      parallelism,
      //   algotype: type,
      //   version,
    });

    // kdbxweb's Argon2Fn expects an ArrayBuffer. The declared return type is
    // Uint8Array, but Tauri serializes a Rust Vec<u8> as a number array at
    // runtime, so spread to cover both shapes.
    return new Uint8Array([...hash]).buffer;
  }
);

export async function savedb(contents: ArrayBuffer | undefined) {
  if (!contents) {
    throw new Error("No contents to save");
  }
  const b64 = _arrayBufferToBase64(contents);
  await writeTextFile("vault.kdbx", b64, {
    baseDir: BaseDirectory.AppData,
  });
}

export async function loaddb() {
  const b64 = await readTextFile("vault.kdbx", {
    baseDir: BaseDirectory.AppData,
  });

  return _base64ToArrayBuffer(b64);
}

export default kdbxweb;
