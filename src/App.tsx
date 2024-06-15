import { useEffect, useState } from "react";
import kdbxweb from "./utils/kdbx";
import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  exists,
} from "@tauri-apps/api/fs";
import { Button, Card, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { _arrayBufferToBase64, _base64ToArrayBuffer } from "./utils/byte-utils";
import { notifications } from "@mantine/notifications";
import { useAppContext } from "./contexts/App";
import { useNavigate } from "react-router-dom";

function App() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [firstTime, setFirstTime] = useState(true);

  const navigate = useNavigate();

  const { loadDb } = useAppContext();

  const validate = async () => {
    if (firstTime) {
      if (!password || !password2) {
        error("Password cannot be empty");
        return;
      }
      if (password !== password2) {
        error("Passwords do not match");
        return;
      }

      if (password.length < 8) {
        error("Password must be at least 8 characters long");
        return;
      }

      // create new vault
      const creds = new kdbxweb.Credentials(
        kdbxweb.ProtectedValue.fromString(password)
      );

      const db = kdbxweb.Kdbx.create(creds, "truthy");

      const contents = await db.save();

      const b64 = _arrayBufferToBase64(contents);

      await writeTextFile("vault.kdbx", b64, {
        dir: BaseDirectory.AppData,
      });
      loadDb(db);

      navigate("/home");
    } else {
      if (!password) {
        error("Password cannot be empty");
        return;
      }
      const creds = new kdbxweb.Credentials(
        kdbxweb.ProtectedValue.fromString(password)
      );

      const b64 = await readTextFile("vault.kdbx", {
        dir: BaseDirectory.AppData,
      });

      const contents = _base64ToArrayBuffer(b64);
      try {
        const db = await kdbxweb.Kdbx.load(contents, creds);
        loadDb(db);
      } catch (e) {
        console.error(e);
        if ((e as any).code === "InvalidKey") {
          error("Invalid password");
        } else {
          error("An error occurred while trying to open the vault");
        }
        return;
      }

      navigate("/home");
    }
  };

  useEffect(() => {
    (async () => {
      const fileExists = await exists("vault.kdbx", {
        dir: BaseDirectory.AppData,
      });
      setFirstTime(!fileExists);
    })();
  }, []);

  return (
    <Stack align="center" h="100%" justify="center">
      <Card shadow="sm" p="lg" w="400px">
        <Stack gap={15}>
          <Title order={4}>Welcome</Title>
          <Text c="dimmed" size="xs" mb="md">
            {!firstTime
              ? "Enter your password to continue"
              : "Enter a strong password to create an account."}
          </Text>
        </Stack>
        <Stack>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              validate();
            }}
          >
            <Stack>
              <PasswordInput
                placeholder="master password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              {firstTime && (
                <PasswordInput
                  placeholder="re-enter password"
                  value={password2}
                  onChange={(e) => setPassword2(e.currentTarget.value)}
                />
              )}
              <Button type="submit">{!firstTime ? "Login" : "Create"}</Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Stack>
  );
}

function error(message: string, title: string = "Error") {
  notifications.show({
    title,
    message,
    color: "red",
  });
}

export default App;
