import SignupForm from "../components/SignupForm.jsx";
import { Link } from "react-router-dom";
import "./SignupPage.css";

export default function SignupPage()
{
    return (
        <div className="signup-page">
            <div className="signup-page__brand">
                <h1>Create Account</h1>
                <p className="signup-page__subtitle">Start organizing your life</p>
            </div>
            <SignupForm />
            <p className="signup-page__footer">
                Already have an account? <Link to="/login">Log in</Link>
            </p>
        </div>
    )
}