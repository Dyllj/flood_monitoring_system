import "./Login-form.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../auth/firebase_auth";

const LoginForm = ({ onClose, setIsAdmin }) => {
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.username.value;
    const password = e.target.password.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", userCredential.user);

      // Grant admin only if email matches
      if (email == "molave.mdrrmo@gmail.com") {
        setIsAdmin(true);
      } else {
        alert("You are logged in, but not an admin.");
      }

      onClose();
    } catch (error) {
      console.error("Login failed:", error.message);
      alert("Invalid email or password.");
    }
  };

  return (
    <div className="login-form">
      <h2 id="login-title">Admin Login</h2>
      <form onSubmit={handleLogin}>
        <label>
          Email:
          <input type="email" name="username" required />
        </label>
        <label>
          Password:
          <input type="password" name="password" required />
        </label>
        <div className="login-actions">
          <button type="submit" id="login-button">Login</button>
          <button type="button" id="cancel-button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
