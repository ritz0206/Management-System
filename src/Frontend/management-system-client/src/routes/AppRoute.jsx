import {Routes, Route} from "react-router-dom";
import { authRoutes } from "./AuthRoutes";
import { homeRoutes } from "./HomeRoutes";

export default function AppRoute()
{
    return (
        <Routes>
            {authRoutes}
            {homeRoutes}
        </Routes>
    )
}