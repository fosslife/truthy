import "@mantine/core/styles.css";
import "./styles.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { Notifications } from "@mantine/notifications";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppContextProvider } from "./contexts/App";
import Home from "./pages/Home";
import { SettingsContextProvider } from "./contexts/Settings";
import EntryDetails from "./pages/New/indx";
import { createDir, exists } from "@tauri-apps/api/fs";
import { appDataDir } from "@tauri-apps/api/path";
import { ThemeProvider } from "./contexts/Theme";

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

(async () => {
  const appDatadir = await appDataDir();
  console.log("appDatadir", appDatadir);

  const addExists = await exists(appDatadir);
  console.log("app dir exists?", addExists);
  if (!addExists) {
    await createDir(appDatadir);
    console.log("App dir created");
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
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
    </ThemeProvider>
  </React.StrictMode>
);
