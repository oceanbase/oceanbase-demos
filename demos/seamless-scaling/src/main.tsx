  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
import { IntlProvider } from "./IntlProvider.tsx";
  import "./index.css";

createRoot(document.getElementById("root")!).render(
  <IntlProvider>
    <App />
  </IntlProvider>
);
  