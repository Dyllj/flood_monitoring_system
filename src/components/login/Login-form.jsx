import "./Login-form.css";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../auth/firebase_auth";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const LoginForm = ({ onClose, setIsAdmin }) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.username.value;
    const password = e.target.password.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in:", userCredential.user);

      if (email === "molave.mdrrmo@gmail.com") {
        setIsAdmin(true); // trigger success card
      } else {
        alert("You are logged in, but not an admin.");
      }

      // Close form **after setting admin state**
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

        <label className="password-label">
          Password:
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
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
