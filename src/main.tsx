import "@mantine/core/styles.css";
import "./styles.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  MantineColorsTuple,
  MantineProvider,
  createTheme,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppContextProvider } from "./contexts/App";
import Home from "./pages/Home";
import { SettingsContextProvider } from "./contexts/Settings";
import EntryDetails from "./pages/New/indx";
import { createDir, exists } from "@tauri-apps/api/fs";
import { appDataDir } from "@tauri-apps/api/path";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  { path: "/new", element: <EntryDetails /> },
  { path: "/edit/:id", element: <EntryDetails /> },
]);

const myColor: MantineColorsTuple = [
  "#ffeaf3",
  "#fdd4e1",
  "#f4a7bf",
  "#ec779c",
  "#e64f7e",
  "#e3356b",
  "#e22762",
  "#c91a52",
  "#b41149",
  "#9f003e",
];

const theme = createTheme({
  components: {},
  primaryColor: "brand",
  colors: {
    brand: myColor,
  },
});

(async () => {
  const appdir = await appDataDir();

  const appDirExists = await exists(appdir);
  if (!appDirExists) {
    await createDir(appdir);
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme={"dark"} theme={theme}>
      <Notifications
        styles={{
          root: {
            top: 20,
            right: 20,
            zIndex: 1000,
            position: "fixed",
          },
        }}
      />
      <AppContextProvider>
        <SettingsContextProvider>
          <RouterProvider router={browserRouter} />
        </SettingsContextProvider>
      </AppContextProvider>
    </MantineProvider>
  </React.StrictMode>
);
