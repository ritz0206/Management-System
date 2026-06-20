import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function SignupForm()
{
    const { handleSignup } = useAuth();
    const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
    });
    const [error, setError] = useState("");

    const handleChange = (e) =>
    {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        try {
            await handleSignup(formData.email, formData.password);
            navigate("/login");
        } catch (err) {
            setError("Invalid email or password");
        }
    };

    return (
    <form onSubmit={handleSubmit} className="signup-form">
        <div >
            <label>Name</label>
            <input type="text" name="name" placeholder="Enter name" 
                value={formData.name} onChange={handleChange} required/>
        </div>
        <div >
            <label>Email</label>
            <input type="email" name="email" placeholder="Enter email" 
                value={formData.email} onChange={handleChange} required/>
        </div>
        <div>
            <label>Password</label>
            <input type="password" name="password" placeholder="Enter password"
                value={formData.password} onChange={handleChange} required/>
        </div>
        {error && (<p>{error}</p>)}
        <button type="submit">Sign Up</button>
    </form>
    )
}