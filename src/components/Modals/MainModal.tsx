import { Button, Drawer, Modal, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { invoke } from "@tauri-apps/api";
import { open } from "@tauri-apps/api/dialog";
import { parseOTPAuthURL } from "../../utils/parseOtpAuthURL";
import { TOTP } from "totp-generator";
import { memo } from "react";
import { useNavigate } from "react-router-dom";

import { notifications } from "@mantine/notifications";
import { getRandomId, randomColor } from "../../utils/random";
import { useAppContext } from "../../contexts/App";
import { savedb } from "../../utils/kdbx";
import { recordEntity } from "../../utils/entryops";

type QrModalProps = {
  onClose: () => void;
  opened: boolean;
};

export function MainModalBase({ onClose, opened }: QrModalProps) {
  // const { setEntries } = useContext(AppContext);
  // const [manualModalOpened, { close: closeManual, open: openManual }] =
  //   useDisclosure();
  const nav = useNavigate();
  const { db, group, forceRerender } = useAppContext();

  const readQr = async () => {
    const path = (await open({
      directory: false,
      multiple: false,
      filters: [{ extensions: ["png"], name: "Images" }],
    })) as string;
    if (!path) {
      onClose();
      return;
    }
    const data = await invoke<string>("read_qr", { path });
    onClose();
    try {
      const parsed = parseOTPAuthURL(data);
      if (!parsed.secret || !parsed.label) {
        console.error("Invalid QR code");
        throw new Error("Invalid QR code");
        return;
      }
      parsed["otp"] = TOTP.generate(parsed.secret).otp;
      parsed["id"] = getRandomId();
      parsed["color"] = randomColor();
      parsed["digits"] = parsed["digits"] || 6;
      parsed["counter"] = parsed["counter"] || 0;
      parsed["period"] = parsed["period"] || 30;

      const entry = db?.createEntry(group!);
      recordEntity(parsed, entry!);
      const content = await db?.save();
      await savedb(content!);

      forceRerender();
    } catch (e) {
      console.error(e);

      notifications.show({
        title: "Invalid QR code",
        message: "The QR code you provided is invalid",
        color: "red",
      });
    }
  };

  return (
    <Opener onClose={onClose} opened={opened}>
      <Stack p="xl">
        <Button
          onClick={() => {
            onClose();
            nav("/new", { replace: true });
            // openManual();
          }}
          variant="light"
        >
          Add Manually
        </Button>
        <Button onClick={readQr} variant="light">
          Read QR Code
        </Button>
      </Stack>
    </Opener>
  );
}

function Opener({
  children,
  onClose,
  opened,
}: {
  children: React.ReactNode;
  onClose: () => void;
  opened: boolean;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!isDesktop) {
    return (
      <Drawer
        onClose={onClose}
        opened={opened}
        title="Select method"
        position="bottom"
        size={240}
        transitionProps={{
          transition: "slide-up",
        }}
      >
        {children}
      </Drawer>
    );
  }

  return (
    <Modal
      onClose={onClose}
      opened={opened}
      title="Select method"
      transitionProps={{
        transition: "slide-down",
      }}
    >
      {children}
    </Modal>
  );
}

export const MainModal = memo(MainModalBase, (prev, next) => {
  return prev.opened === next.opened;
});
