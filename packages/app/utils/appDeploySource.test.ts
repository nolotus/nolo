import { describe, expect, it } from "bun:test";

import {
  filesLookLikeReactApp,
  inferAppDeployFramework,
  sourceLooksLikeReactModule,
} from "./appDeploySource";

describe("appDeploySource", () => {
  it("detects react modules from imports or JSX returns", () => {
    expect(
      sourceLooksLikeReactModule(
        "import { createRoot } from 'react-dom/client'; export default function App(){ return <div>Hello</div>; }"
      )
    ).toBe(true);
    expect(
      sourceLooksLikeReactModule(
        "export default function App(){ return <main>Hello</main>; }"
      )
    ).toBe(true);
  });

  it("does not confuse html string responses with react modules", () => {
    expect(
      sourceLooksLikeReactModule(
        "export default { async fetch() { return new Response('<div>Hello</div>', { headers: { 'content-type': 'text/html' } }); } };"
      )
    ).toBe(false);
  });

  it("infers react-spa for multi-file react projects even without framework", () => {
    expect(
      filesLookLikeReactApp([
        {
          name: "main.tsx",
          code: "import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')!).render(<App />);",
        },
        {
          name: "App.tsx",
          code: "export default function App() { return <div>Hi</div>; }",
        },
      ])
    ).toBe(true);

    expect(
      inferAppDeployFramework({
        files: [
          { name: "main.tsx", code: "export default function App() { return <div>Hi</div>; }" },
        ],
      })
    ).toBe("react-spa");
  });

  it("infers worker for html worker responses", () => {
    expect(
      inferAppDeployFramework({
        code: "export default { fetch(){ return new Response('<div>Hello</div>'); } }",
      })
    ).toBe("worker");
  });
});
