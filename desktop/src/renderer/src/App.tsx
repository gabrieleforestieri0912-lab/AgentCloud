import { useState } from "react";
import { useAuth } from "./auth";
import { ChatView } from "./chat";

function Login() {
  const { loginEmail, loginGoogle, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="login">
      <h1>AgentCloud</h1>
      <p>Accedi per chattare con i tuoi agenti.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loginEmail(email, password);
        }}
      >
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Accedi</button>
      </form>
      <button className="ghost" onClick={() => void loginGoogle()}>
        Continua con Google
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function App() {
  const { session, loading, logout } = useAuth();
  if (loading) return <p className="hint">Caricamento…</p>;
  if (!session) return <Login />;
  return (
    <div className="app">
      <ChatView token={session.access_token} />
      <button className="logout" onClick={() => void logout()} title="Esci">
        Esci
      </button>
    </div>
  );
}
