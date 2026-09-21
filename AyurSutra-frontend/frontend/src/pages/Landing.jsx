import { Link } from 'react-router-dom'

const features = [
  { icon: '📅', title: 'Online Booking', text: 'Patients can book therapies and view schedule updates from one secure portal.' },
  { icon: '🧑‍⚕️', title: 'Expert Therapists', text: 'Therapists can manage assigned appointments and update treatment status.' },
  { icon: '📈', title: 'Track Progress', text: 'Dashboards keep appointments, feedback, and clinical activity easy to review.' },
]

const therapies = [
  'Vamana',
  'Virechana',
  'Basti',
  'Nasya',
  'Raktamokshana',
  'Shirodhara',
]

const Landing = () => {
  return (
    <main>
      <header className="landing-header">
        <Link className="landing-brand" to="/">AyurSutra</Link>
        <div className="landing-actions">
          <Link className="btn btn-outline" to="/login">Login</Link>
          <Link className="btn btn-primary" to="/register">Get Started</Link>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <h1>AyurSutra</h1>
          <p>Professional hospital and Panchakarma therapy management for patients, therapists, and administrators.</p>
          <div className="landing-actions">
            <Link className="btn btn-primary" to="/register">Get Started</Link>
            <Link className="btn btn-outline" to="/login">Login</Link>
          </div>
        </div>
        <div className="hero-visual" aria-label="Ayurveda therapy room" />
      </section>

      <section className="section">
        <h2>Designed for better care</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span>{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Therapy categories</h2>
        <div className="therapy-grid">
          {therapies.map((therapy) => (
            <article className="therapy-card" key={therapy}>
              <span>✦</span>
              <h3>{therapy}</h3>
              <p>Structured therapy scheduling, status tracking, and patient follow-up support.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>Bring your therapy operations into one calm, reliable workspace.</h2>
        <p>Start with patient booking, then scale into therapist schedules and admin oversight.</p>
        <Link className="btn btn-gold" to="/register">Create Patient Account</Link>
      </section>
    </main>
  )
}

export default Landing
