import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialize error tracking
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
