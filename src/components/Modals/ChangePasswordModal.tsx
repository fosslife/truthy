import { Button, Modal, PasswordInput, Stack } from "@mantine/core";
import { useState } from "react";
import { useAppContext } from "../../contexts/App";
import kdbxweb, { savedb } from "../../utils/kdbx";
import { notifications } from "@mantine/notifications";
import { BaseDirectory, readTextFile } from "@tauri-apps/api/fs";
import { _base64ToArrayBuffer } from "../../utils/byte-utils";

type ChangePasswordModalProps = {
  opened: boolean;
  onClose: () => void;
  sidebarClose: () => void;
};

export function ChangePasswordModal({
  onClose,
  opened,
  sidebarClose,
}: ChangePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const { db } = useAppContext();

  const changePassword = async () => {
    if (!password || !password2 || !currentPassword) {
      alert("Password cannot be empty");
      return;
    }

    try {
      const creds = new kdbxweb.Credentials(
        kdbxweb.ProtectedValue.fromString(currentPassword)
      );
      const b64 = await readTextFile("vault.kdbx", {
        dir: BaseDirectory.App,
      });
      const contents = _base64ToArrayBuffer(b64);
      await kdbxweb.Kdbx.load(contents, creds);
    } catch (e) {
      console.error(e);
      if (e instanceof kdbxweb.KdbxError) {
        if (e.code === kdbxweb.Consts.ErrorCodes.InvalidKey) {
          alert("Invalid current password");
          return;
        }
      }
      return;
    }

    if (password !== password2) {
      alert("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }
    db?.credentials.setPassword(kdbxweb.ProtectedValue.fromString(password));
    const changed = await db?.save();
    savedb(changed);
    sidebarClose();
    notifications.show({
      title: "Password changed",
      message: "Password has been changed successfully",
    });
    onClose();
  };

  return (
    <Modal title="Enter new password" onClose={onClose} opened={opened}>
      <form>
        <Stack>
          <PasswordInput
            label="Current Password"
            placeholder="current password"
            value={currentPassword}
            required
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="Password"
            placeholder="master password"
            value={password}
            required
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <PasswordInput
            label="Re-enter Password"
            placeholder="re-enter password"
            value={password2}
            required
            onChange={(e) => setPassword2(e.currentTarget.value)}
          />

          <Button onClick={changePassword}>Change</Button>
        </Stack>
      </form>
    </Modal>
  );
}
