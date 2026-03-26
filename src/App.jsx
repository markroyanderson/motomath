import { useState, useEffect } from "react";
import Game        from "./game.jsx";
import TruzzleGame from "./Truzzle.jsx";

function getPageFromHash() {
  return window.location.hash === "#truzzle" ? "truzzle" : "motomath";
}

export default function App() {
  const [page, setPage] = useState(getPageFromHash);

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(dest) {
    window.location.hash = dest === "truzzle" ? "#truzzle" : "";
    setPage(dest);
  }

  if (page === "truzzle") {
    return <TruzzleGame onBack={() => navigate("motomath")} />;
  }

  return (
    <div style={{ height: "100vh", width: "100vw", margin: 0, padding: 0 }}>
      <Game onNavigate={navigate} />
    </div>
  );
}
