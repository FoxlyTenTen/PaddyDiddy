import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AnalysisProvider } from "./state/analysis";
import "./index.css";
import "./i18n/config";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AnalysisProvider>
        <App />
      </AnalysisProvider>
    </BrowserRouter>
  </React.StrictMode>
);
