import { useState } from "react";
import { createStaff } from "../api/users";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";
import StatusBadge from "../components/StatusBadge";

import { formatApiError } from "../utils/formatError";

const AdminCreateStaff = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "therapist",
    specialization: "",
    qualification: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
    setErrors({ ...errors, [event.target.name]: "", form: "" });
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Full name is required.";
    if (!formData.phone.trim()) nextErrors.phone = "Phone is required.";
    if (!formData.email.trim()) nextErrors.email = "Email is required.";
    if (!formData.password) nextErrors.password = "Password is required.";
    if (!formData.role) nextErrors.role = "Role is required.";
    if (formData.role === "therapist" && !formData.specialization.trim())
      nextErrors.specialization = "Specialization is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setToast("");
    if (!validate()) return;
    setLoading(true);

    try {
      await createStaff(formData);
      setToast("Staff account created successfully.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "therapist",
        specialization: "",
        qualification: "",
      });
    } catch (_error) {
      const fieldErrors = {};
      if (_error.response?.data && typeof _error.response.data === "object") {
        for (const [key, val] of Object.entries(_error.response.data)) {
          if (Array.isArray(val)) fieldErrors[key] = val.join(" ");
        }
      }
      setErrors({
        ...fieldErrors,
        form: formatApiError(_error, "Could not create staff account."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <header className="topbar">
          <h1>Create Staff</h1>
          <StatusBadge status="admin" />
        </header>
        <div className="page-body">
          <section className="card">
            <h2 className="card-title">Add staff account</h2>
            {toast && <div className="toast toast-success">{toast}</div>}
            {errors.form && (
              <div className="toast toast-error">{errors.form}</div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Full name
                  </label>
                  <input
                    className="form-input"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                  {errors.name && (
                    <span className="form-error">{errors.name}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="form-input"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {errors.email && (
                    <span className="form-error">{errors.email}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    className="form-input"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  {errors.phone && (
                    <span className="form-error">{errors.phone}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <input
                    className="form-input"
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  {errors.password && (
                    <span className="form-error">{errors.password}</span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="role">
                    Role
                  </label>
                  <select
                    className="form-input"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="therapist">Therapist</option>
                    <option value="admin">Admin</option>
                  </select>
                  {errors.role && (
                    <span className="form-error">{errors.role}</span>
                  )}
                </div>
                {formData.role === "therapist" && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="specialization">
                        Specialization
                      </label>
                      <input
                        className="form-input"
                        id="specialization"
                        name="specialization"
                        placeholder="e.g. Basti, Nasya, Vamana"
                        value={formData.specialization}
                        onChange={handleChange}
                      />
                      {errors.specialization && (
                        <span className="form-error">
                          {errors.specialization}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="qualification">
                        Qualification
                      </label>
                      <input
                        className="form-input"
                        id="qualification"
                        name="qualification"
                        placeholder="e.g. BAMS, MD Ayurveda"
                        value={formData.qualification}
                        onChange={handleChange}
                      />
                      {errors.qualification && (
                        <span className="form-error">
                          {errors.qualification}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                className="btn btn-primary"
                disabled={loading}
                type="submit"
              >
                {loading ? <span className="button-spinner" /> : "Create Staff"}
              </button>
            </form>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
};

export default AdminCreateStaff;
