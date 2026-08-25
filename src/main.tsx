import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSliderFill } from "./lib/sliderFill";
import { runMigrations } from "./lib/migrations";
import { initNexusSync } from "./lib/nexusAccount";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

runMigrations();
initSliderFill();
initNexusSync();
