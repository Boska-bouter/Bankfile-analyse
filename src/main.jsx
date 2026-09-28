import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { installStoragePolyfill } from "./storage/projectStorage.js";
import "./index.css";

installStoragePolyfill();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
