import Avatar from "../ui/Avatar";
import "./AppHeader.css";
function AppHeader({ greeting, name }) {
  return (
    <header>
      <div className="app-header">
        <div className="container">
          <div className="header-text">
            <p>{greeting}</p>
            <h2>{name} 👋</h2>
          </div>
          <Avatar name={name} />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
