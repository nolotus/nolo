import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "app/routing";

/** A route request survives navigation while the default sidebar is unmounted. */
export function useCreateProjectNavigation(isDesktop: boolean, showProjects: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const [request, setRequest] = useState(0);
  const consumed = useRef<string | null>(null);
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    if (!isDesktop || location.pathname !== "/" || search.get("createProject") !== "1") {
      consumed.current = null;
      return;
    }
    // Effects may be replayed before the replacement navigation commits.
    if (consumed.current === location.key) return;
    consumed.current = location.key;
    showProjects();
    setRequest((value) => value + 1);
    search.delete("createProject");
    const remaining = search.toString();
    navigate(`${location.pathname}${remaining ? `?${remaining}` : ""}${location.hash}`, {
      replace: true,
      state: location.state,
    });
  }, [isDesktop, location, navigate, showProjects]);
  return request;
}
