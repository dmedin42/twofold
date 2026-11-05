import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove React.StrictMode to prevent the double-mount that kills the camera stream
createRoot(document.getElementById("root")!).render(
    <App />
);