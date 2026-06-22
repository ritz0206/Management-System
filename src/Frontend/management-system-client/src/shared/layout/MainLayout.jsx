import AppHeader from "./AppHeader";
import BottomNav from "./BottomNav";
import "./MainLayout.css";

function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <AppHeader greeting="Good morning," name="Priya Sharma" />
      <main className="main-layout__content">
        {children}
      </main>
      <BottomNav active="Home" />
    </div>
  );
}

export default MainLayout;
