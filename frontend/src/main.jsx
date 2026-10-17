import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/oxanium";
import "@fontsource-variable/public-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/stage.css";
import "./styles/planner.css";
import "./styles/sections.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
