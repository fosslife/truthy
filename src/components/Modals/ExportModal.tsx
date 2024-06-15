import { Button, Modal, Stack } from "@mantine/core";
import { memo } from "react";
import { useAppContext } from "../../contexts/App";
import { confirm, save } from "@tauri-apps/api/dialog";
import { writeTextFile, copyFile, BaseDirectory } from "@tauri-apps/api/fs";
import { notifications } from "@mantine/notifications";

type ExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function ExportModalBase({ isOpen, onClose }: ExportModalProps) {
  const { entries, db } = useAppContext();

  const exportJson = async () => {
    const confirmation = await confirm(
      "This will save all your secrets in a plain-text JSON file. Are you sure you want to continue?",
      {
        type: "warning",
        okLabel: "Yes, I am sure",
        cancelLabel: "No, take me back",
      }
    );
    if (!confirmation) return;
    const path = await save({
      title: "Export JSON",
      defaultPath: "otps.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (path) {
      // const finalPath = await join(path, "otps.json");
      await writeTextFile(path, JSON.stringify(entries, null, 2));
      notifications.show({
        message: "Exported JSON",
        color: "green",
      });
      onClose();
    }
  };

  const exportAes = async () => {
    const confirmation = await confirm(
      "This will save all your secrets in an encrypted JSON file. Are you sure you want to continue?",
      {
        type: "warning",
        okLabel: "Yes, I am sure",
        cancelLabel: "No, take me back",
      }
    );
    if (!confirmation) return;
    const path = await save({
      title: "Export JSON",
      defaultPath: "otps.aes.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (path) {
      const plainText = JSON.stringify(entries, null, 2);
      const password = prompt("Enter password to encrypt the JSON file");

      if (!password) {
        notifications.show({
          message: "Password is required",
          color: "red",
        });
        return;
      }

      const encrypted = await encrypt(plainText, password);
      await writeTextFile(path, encrypted);
      notifications.show({
        message: "Exported encrypted JSON",
        color: "green",
      });

      onClose();
    }
  };

  const exportKdbxXml = async () => {
    const confirmation = await confirm(
      "This will save all your secrets in a KDBX XML file. Are you sure you want to continue?",
      {
        type: "warning",
        okLabel: "Yes, I am sure",
        cancelLabel: "No, take me back",
      }
    );

    if (!confirmation) return;

    const path = await save({
      title: "Export KDBX XML",
      defaultPath: "otps.kdbx.xml",
      filters: [{ name: "KDBX XML", extensions: ["xml"] }],
    });

    if (path) {
      const content = await db?.saveXml();
      if (content) {
        await writeTextFile(path, content);
        notifications.show({
          message: "Exported KDBX XML",
          color: "green",
        });
        onClose();
      }
    }
  };

  const exportKdbx = async () => {
    const confirmation = await confirm(
      "This will save all your secrets in a KDBX file. Are you sure you want to continue?",
      {
        type: "warning",
        okLabel: "Yes, I am sure",
        cancelLabel: "No, take me back",
      }
    );

    if (!confirmation) return;

    const path = await save({
      title: "Export KDBX",
      defaultPath: "otps.kdbx",
      filters: [{ name: "KDBX", extensions: ["kdbx"] }],
    });

    if (path) {
      await copyFile("vault.kdbx", path, {
        dir: BaseDirectory.AppData,
      });
      notifications.show({
        message: "Exported KDBX",
        color: "green",
      });
      onClose();
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Pick option to export"
      keepMounted={false}
    >
      <Stack>
        <Button onClick={exportJson}>Export plain text JSON</Button>

        <Button onClick={exportAes}>Export Aes encrypted JSON</Button>

        <Button onClick={exportKdbxXml}>Export KDBX XML</Button>

        <Button onClick={exportKdbx}>Export encrypted KDBX</Button>
      </Stack>
    </Modal>
  );
}

export const ExportModal = memo(ExportModalBase, (prev, next) => {
  return prev.isOpen === next.isOpen;
});

async function encrypt(plaintext: string, password: string) {
  const pwUtf8 = new TextEncoder().encode(password); // encode password as UTF-8
  const pwHash = await crypto.subtle.digest("SHA-256", pwUtf8); // hash the password

  const iv = crypto.getRandomValues(new Uint8Array(12)); // get 96-bit random iv
  const ivStr = Array.from(iv)
    .map((b) => String.fromCharCode(b))
    .join(""); // iv as utf-8 string

  const alg = { name: "AES-GCM", iv: iv }; // specify algorithm to use

  const key = await crypto.subtle.importKey("raw", pwHash, alg, false, [
    "encrypt",
  ]); // generate key from pw

  const ptUint8 = new TextEncoder().encode(plaintext); // encode plaintext as UTF-8
  const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8); // encrypt plaintext using key

  const ctArray = Array.from(new Uint8Array(ctBuffer)); // ciphertext as byte array
  const ctStr = ctArray.map((byte) => String.fromCharCode(byte)).join(""); // ciphertext as string

  return btoa(ivStr + ctStr);
}

// Unused for now, but make a new modal that can decrypt.
// @ts-ignore
async function aesGcmDecrypt(ciphertext: string, password: string) {
  const pwUtf8 = new TextEncoder().encode(password); // encode password as UTF-8
  const pwHash = await crypto.subtle.digest("SHA-256", pwUtf8); // hash the password

  const ivStr = atob(ciphertext).slice(0, 12); // decode base64 iv
  const iv = new Uint8Array(Array.from(ivStr).map((ch) => ch.charCodeAt(0))); // iv as Uint8Array

  const alg = { name: "AES-GCM", iv: iv }; // specify algorithm to use

  const key = await crypto.subtle.importKey("raw", pwHash, alg, false, [
    "decrypt",
  ]); // generate key from pw

  const ctStr = atob(ciphertext).slice(12); // decode base64 ciphertext
  const ctUint8 = new Uint8Array(
    Array.from(ctStr).map((ch) => ch.charCodeAt(0))
  ); // ciphertext as Uint8Array
  // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

  try {
    const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8); // decrypt ciphertext using key
    const plaintext = new TextDecoder().decode(plainBuffer); // plaintext from ArrayBuffer
    return plaintext; // return the plaintext
  } catch (e) {
    throw new Error("Decrypt failed");
  }
}
