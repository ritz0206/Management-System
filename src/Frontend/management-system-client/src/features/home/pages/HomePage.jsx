import { FiShoppingCart, FiList, FiDollarSign, FiCalendar, FiClock } from "react-icons/fi";
import Card from "../../../shared/uiElements/Card";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home-page">

      <Card>
        <div className="suggestion-card">
          <div className="suggestion-card__badge">AI Suggestion</div>
          <h3 className="suggestion-card__title">Looks like you're running low on milk</h3>
          <p className="suggestion-card__text">
            Based on your usage, you'll need milk by tomorrow. Want to add it to your grocery list?
          </p>
          <div className="suggestion-card__actions">
            <button className="suggestion-card__approve">Approve</button>
            <button className="suggestion-card__dismiss">Dismiss</button>
          </div>
        </div>
      </Card>

      <section className="quick-actions">
        <h3 className="quick-actions__title">Quick Actions</h3>
        <div className="quick-actions__grid">
          <button className="quick-actions__item">
            <span className="quick-actions__icon"><FiShoppingCart /></span>
            <span className="quick-actions__label">Add Grocery</span>
          </button>
          <button className="quick-actions__item">
            <span className="quick-actions__icon"><FiList /></span>
            <span className="quick-actions__label">View List</span>
          </button>
          <button className="quick-actions__item">
            <span className="quick-actions__icon"><FiDollarSign /></span>
            <span className="quick-actions__label">Budget</span>
          </button>
          <button className="quick-actions__item">
            <span className="quick-actions__icon"><FiCalendar /></span>
            <span className="quick-actions__label">Schedule</span>
          </button>
        </div>
      </section>

      <section className="upcoming">
        <h3 className="upcoming__title">Upcoming</h3>
        <Card>
          <div className="upcoming__item">
            <span className="upcoming__icon"><FiClock /></span>
            <div className="upcoming__detail">
              <p className="upcoming__name">Grocery delivery</p>
              <p className="upcoming__time">Tomorrow, 10:00 AM</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="upcoming__item">
            <span className="upcoming__icon"><FiCalendar /></span>
            <div className="upcoming__detail">
              <p className="upcoming__name">Monthly budget review</p>
              <p className="upcoming__time">Friday, 6:00 PM</p>
            </div>
          </div>
        </Card>
      </section>

    </div>
  );
}
