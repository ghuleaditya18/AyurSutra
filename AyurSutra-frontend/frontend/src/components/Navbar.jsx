import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import logo from "../assets/images/logo.png";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-clay-50/90 backdrop-blur px-8 py-4 flex justify-between items-center border-b border-clay-100">
      <Link
        to="/"
        className="flex items-center gap-2 text-xl font-bold text-clay-700"
      >
        <img src={logo} alt="AyurSutra" className="h-8 w-8 object-contain" />
        AyurSutra
      </Link>{" "}
      <div className="flex items-center gap-6 text-sm font-medium text-clay-700">
        <Link to="/login/admin" className="hover:text-sage-600">
          Admin
        </Link>
        <Link to="/login/therapist" className="hover:text-sage-600">
          Therapists
        </Link>
        <Link to="/login/patient" className="hover:text-sage-600">
          Patient
        </Link>
        <Link to="/feedback" className="hover:text-sage-600">
          Feedback
        </Link>
        {user ? (
          <>
            <Link
              to={
                user.role === "therapist"
                  ? "/therapist/dashboard"
                  : "/dashboard"
              }
              className="hover:text-sage-600"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="bg-clay-500 text-white px-4 py-1.5 rounded-md hover:bg-clay-600"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/register" className="hover:text-sage-600">
              Sign Up
            </Link>
            <Link
              to="/register"
              className="bg-sage-600 text-white px-4 py-1.5 rounded-md hover:bg-sage-700"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
