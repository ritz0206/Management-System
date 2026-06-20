import { FiHome, FiShoppingCart, FiBell, FiUser } from "react-icons/fi";
import "./BottomNav.css";

function BottomNav({ active }) {
  const items = [
    { name: "Home", icon: <FiHome /> },
    { name: "Grocery", icon: <FiShoppingCart /> },
    { name: "Alerts", icon: <FiBell /> },
    { name: "Profile", icon: <FiUser /> },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <div
          key={item.name}
          className={item.name === active ? "active-nav-item" : "nav-item"}
        >
          {item.icon}
          <span>{item.name}</span>
        </div>
      ))}
    </nav>
  );
}

export default BottomNav;
