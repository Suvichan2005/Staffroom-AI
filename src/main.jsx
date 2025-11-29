import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { TeacherProvider } from "./context/TeacherContext";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

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
