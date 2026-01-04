import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { TeacherProvider } from "./context/TeacherContext";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { 
  initErrorMonitoring, 
  handleGlobalError, 
  handleUnhandledRejection 
} from "./services/errorMonitoring";

// Initialize error monitoring (Sentry if configured)
initErrorMonitoring();

// Global error handlers
window.onerror = handleGlobalError;
window.onunhandledrejection = handleUnhandledRejection;

// Demo recording: force global date to 24 November 2025
// Toggle this to `false` after recording.
const DEMO_FORCE_DATE = false;
if (DEMO_FORCE_DATE) {
  // 24 Nov 2025, 09:00 local time (construct using local Date constructor so it matches user's timezone)
  const DEMO_YEAR = 2025;
  const DEMO_MONTH_IDX = 10; // November (0-based)
  const DEMO_DAY = 24;
  const DEMO_HOUR_LOCAL = 9; // 9:00 local
  const _OriginalDate = Date;
  // Create a local-time Date for the demo timestamp so schedule checks (which use local times) match.
  const DEMO_LOCAL = new _OriginalDate(DEMO_YEAR, DEMO_MONTH_IDX, DEMO_DAY, DEMO_HOUR_LOCAL, 0, 0, 0);
  const DEMO_TS = DEMO_LOCAL.getTime();
  class MockDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(DEMO_TS);
      } else {
        super(...args);
      }
    }
    static now() { return DEMO_TS; }
    static parse(...a) { return _OriginalDate.parse(...a); }
    static UTC(...a) { return _OriginalDate.UTC(...a); }
  }
  globalThis.Date = MockDate;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <TeacherProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TeacherProvider>
    </AuthProvider>
  </React.StrictMode>
);
