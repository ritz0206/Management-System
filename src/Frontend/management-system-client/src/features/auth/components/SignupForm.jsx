import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./SignupForm.css";

export default function SignupForm() {
    const { handleSignup } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await handleSignup(formData.name, formData.email, formData.password);
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.message || "Signup failed. Please try again.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="signup-form">
            <div className="signup-form__field">
                <label>Name</label>
                <input type="text" name="name" placeholder="Enter your name"
                    value={formData.name} onChange={handleChange} required />
            </div>
            <div className="signup-form__field">
                <label>Email</label>
                <input type="email" name="email" placeholder="Enter your email"
                    value={formData.email} onChange={handleChange} required />
            </div>
            <div className="signup-form__field">
                <label>Password</label>
                <input type="password" name="password" placeholder="Create a password" value={formData.password} onChange={handleChange} required />
            </div>
            {error && (<p className="signup-form__error">{error}</p>)}
            <button type="submit" className="signup-form__submit">Sign Up</button>
        </form>
    );
}
