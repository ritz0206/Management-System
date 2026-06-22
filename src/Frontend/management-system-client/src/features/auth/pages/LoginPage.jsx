import LoginForm from "../components/LoginForm";
import { Link } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage()
{
    return (
        <div className="login-page">
            <div className="login-page__brand">
                <h1>Welcome Back</h1>
                <p className="login-page__subtitle">Sign in to your account</p>
            </div>
            <LoginForm />
            <p className="login-page__footer">
                Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
        </div>
    )
}