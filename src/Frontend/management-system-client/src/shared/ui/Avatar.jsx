import "./Avatar.css";
function Avatar({ name = "" }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("");

  return <div className="avatar">{initials}</div>;
}

export default Avatar;
