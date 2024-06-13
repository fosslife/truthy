import { Button, Divider, Modal, Radio, Stack } from "@mantine/core";
import { open } from "@tauri-apps/api/dialog";
import { memo, useState } from "react";
import { AegisImporter } from "../../utils/importers";
import { notifications } from "@mantine/notifications";
import { useAppContext } from "../../contexts/App";

type ImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  closeDrawer: () => void;
};

type ImportOptions =
  | "Aegis"
  | "Authy"
  | "Google Authenticator"
  | "Microsoft Authenticator";

const importOptions: ImportOptions[] = [
  "Aegis",
  "Authy",
  "Google Authenticator",
  "Microsoft Authenticator",
];

function ImportModalBase({ isOpen, onClose, closeDrawer }: ImportModalProps) {
  const [from, setFrom] = useState<ImportOptions>("Aegis");
  const [path, setPath] = useState<string>("");

  const { db, group, forceRerender } = useAppContext();

  const importData = async () => {
    try {
      switch (from) {
        case "Aegis":
          await AegisImporter(path, db!, group!);
          break;
        default:
          console.error("Invalid import source");
          break;
      }
    } catch (e) {
      console.error(e);
      notifications.show({
        message: "Error importing data",
        title: "Error",
        color: "red",
      });
    } finally {
      onClose();
      closeDrawer();
      forceRerender();
    }
  };

  const selectFile = async () => {
    const path = await open({
      multiple: false,
      directory: false,
    });
    if (path) {
      setPath(path as string);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Import data from"
      keepMounted={false}
    >
      <Radio.Group value={from} onChange={(e) => setFrom(e as ImportOptions)}>
        <Stack>
          {importOptions.map((option) => (
            <Radio key={option} value={option} label={option}></Radio>
          ))}
          <Divider />
          <Button onClick={selectFile}>Select import file</Button>
          <Divider />
          <Button disabled={!path} onClick={importData}>
            Import
          </Button>
        </Stack>
      </Radio.Group>
    </Modal>
  );
}

export const ImportModal = memo(ImportModalBase, (prev, next) => {
  return prev.isOpen === next.isOpen;
});
